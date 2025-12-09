import express from 'express';
import Transaction from '../models/Transaction.js';
import Income from '../models/income.js';
import Expense from '../models/expense.js';

const router = express.Router();

// Middleware to get tenant ID from request - NO FALLBACK
const getTenantId = (req, res, next) => {
  // Get tenantId from query, body, headers, or user object
  req.tenantId = req.query.tenantId || 
                 req.body.tenantId || 
                 req.headers['x-tenant-id'] || 
                 req.user?.tenantId;
  
  req.userId = req.user?.id || req.query.userId || req.body.userId;
  
  // NO FALLBACK - Return error if tenant ID is missing
  if (!req.tenantId) {
    return res.status(400).json({
      success: false,
      message: 'Tenant ID is required. Please provide tenantId in query parameters, request body, or headers.'
    });
  }
  
  console.log(`[Insights] Using Tenant: ${req.tenantId}, User: ${req.userId || 'N/A'}`);
  next();
};

router.use(getTenantId);

/**
 * @route   GET /api/insights/test
 * @desc    Test endpoint to verify API is accessible
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Insights API is working',
    tenantId: req.tenantId,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/insights/debug-data
 * @desc    Debug endpoint to check database state
 */
router.get('/debug-data', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;

    console.log(`[Debug] Checking data for Tenant: ${tenantId}, User: ${userId || 'N/A'}`);

    // Check all three collections
    const [transactions, incomes, expenses] = await Promise.all([
      Transaction.find({ tenantId }).lean(),
      Income.find({ tenantId }).lean(),
      Expense.find(userId ? { userId } : { tenantId }).lean()
    ]);

    // Get tenant-specific counts
    const tenantTransactions = await Transaction.countDocuments({ tenantId, isDeleted: { $ne: true } });
    const tenantIncomes = await Income.countDocuments({ tenantId, isDeleted: { $ne: true } });
    const tenantExpenses = userId 
      ? await Expense.countDocuments({ userId })
      : await Expense.countDocuments({ tenantId });

    // Get all unique tenant IDs to help debug
    const [allTenantIds, allUserIds] = await Promise.all([
      Income.distinct('tenantId'),
      Expense.distinct('userId')
    ]);

    res.json({
      success: true,
      requestedTenant: tenantId,
      requestedUser: userId || 'N/A',
      counts: {
        allTransactions: transactions.length,
        allIncomes: incomes.length,
        allExpenses: expenses.length,
        tenantTransactions,
        tenantIncomes,
        tenantExpenses
      },
      availableTenantIds: allTenantIds,
      availableUserIds: allUserIds,
      sampleData: {
        firstTransaction: transactions[0] || null,
        firstIncome: incomes[0] || null,
        firstExpense: expenses[0] || null
      }
    });

  } catch (error) {
    console.error('[Debug] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debug data',
      error: error.message
    });
  }
});

/**
 * Calculate GST breakdown for Indian transactions
 */
const calculateGSTBreakdown = (transactions) => {
  const gstData = {
    totalGST: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    transactionsWithGST: 0,
    categoryWiseGST: {}
  };

  transactions.forEach(txn => {
    if (txn.gstAmount && txn.gstAmount > 0) {
      gstData.totalGST += txn.gstAmount;
      gstData.transactionsWithGST++;

      // For Indian GST, typically split as CGST + SGST (intra-state) or IGST (inter-state)
      // Assuming equal split for CGST and SGST if not inter-state
      const halfGST = txn.gstAmount / 2;
      gstData.cgst += halfGST;
      gstData.sgst += halfGST;

      // Category-wise GST
      const category = txn.category || 'Uncategorized';
      if (!gstData.categoryWiseGST[category]) {
        gstData.categoryWiseGST[category] = {
          totalGST: 0,
          count: 0,
          avgGSTPercentage: 0
        };
      }
      gstData.categoryWiseGST[category].totalGST += txn.gstAmount;
      gstData.categoryWiseGST[category].count++;
      if (txn.taxPercentage) {
        gstData.categoryWiseGST[category].avgGSTPercentage += txn.taxPercentage;
      }
    }
  });

  // Calculate average GST percentages
  Object.keys(gstData.categoryWiseGST).forEach(category => {
    const cat = gstData.categoryWiseGST[category];
    if (cat.count > 0) {
      cat.avgGSTPercentage = (cat.avgGSTPercentage / cat.count).toFixed(2);
    }
  });

  return gstData;
};

/**
 * @route   GET /api/insights/generate
 * @desc    Generate comprehensive financial insights with GST analysis
 */
router.get('/generate', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const days = parseInt(req.query.days) || 30;
    
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    console.log(`[Insights] Generating for Tenant: ${tenantId}, Period: ${days} days`);

    // Fetch data from all sources
    const [transactions, incomes, expenses] = await Promise.all([
      Transaction.find({ 
        tenantId,
        isDeleted: { $ne: true },
        date: { $gte: dateThreshold }
      }).sort({ date: -1 }).lean(),
      
      Income.find({ 
        tenantId,
        isDeleted: { $ne: true },
        date: { $gte: dateThreshold }
      }).sort({ date: -1 }).lean(),
      
      Expense.find(
        userId 
          ? { userId, date: { $gte: dateThreshold } }
          : { tenantId, date: { $gte: dateThreshold } }
      ).sort({ date: -1 }).lean()
    ]);

    console.log(`[Insights] Found - Transactions: ${transactions.length}, Incomes: ${incomes.length}, Expenses: ${expenses.length}`);

    // Separate transactions by type
    const transactionIncomes = transactions.filter(t => t.type === 'income');
    const transactionExpenses = transactions.filter(t => t.type === 'expense');

    // Combine all incomes and expenses
    const allIncomes = [...transactionIncomes, ...incomes];
    const allExpenses = [...transactionExpenses, ...expenses];

    // Calculate totals
    const totalIncome = allIncomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalExpense = allExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const netBalance = totalIncome - totalExpense;

    // Calculate GST data
    const incomeGST = calculateGSTBreakdown(allIncomes);
    const expenseGST = calculateGSTBreakdown(allExpenses);

    // Category breakdown for expenses
    const categoryTotals = allExpenses.reduce((acc, expense) => {
      const category = expense.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          count: 0,
          gst: 0,
          transactions: []
        };
      }
      acc[category].total += Number(expense.amount) || 0;
      acc[category].count++;
      acc[category].gst += Number(expense.gstAmount) || 0;
      acc[category].transactions.push(expense);
      return acc;
    }, {});

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        gst: data.gst,
        percentage: totalExpense > 0 ? ((data.total / totalExpense) * 100).toFixed(1) : '0',
        avgTransaction: data.count > 0 ? (data.total / data.count).toFixed(2) : 0
      }))
      .sort((a, b) => b.total - a.total);

    // Income source breakdown
    const incomeSourceTotals = allIncomes.reduce((acc, income) => {
      const source = income.source || income.category || 'Other';
      if (!acc[source]) {
        acc[source] = { total: 0, count: 0, gst: 0 };
      }
      acc[source].total += Number(income.amount) || 0;
      acc[source].count++;
      acc[source].gst += Number(income.gstAmount) || 0;
      return acc;
    }, {});

    const incomeBreakdown = Object.entries(incomeSourceTotals)
      .map(([source, data]) => ({
        source,
        total: data.total,
        count: data.count,
        gst: data.gst,
        percentage: totalIncome > 0 ? ((data.total / totalIncome) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total);

    // Payment mode analysis
    const paymentModeData = [...allIncomes, ...allExpenses].reduce((acc, txn) => {
      const mode = txn.paymentMode || txn.paymentMethod || 'Cash';
      if (!acc[mode]) {
        acc[mode] = { income: 0, expense: 0, count: 0 };
      }
      if (txn.type === 'income' || allIncomes.includes(txn)) {
        acc[mode].income += Number(txn.amount) || 0;
      } else {
        acc[mode].expense += Number(txn.amount) || 0;
      }
      acc[mode].count++;
      return acc;
    }, {});

    const paymentModes = Object.entries(paymentModeData)
      .map(([mode, data]) => ({
        mode,
        income: data.income,
        expense: data.expense,
        total: data.income + data.expense,
        count: data.count
      }))
      .sort((a, b) => b.total - a.total);

    // Generate AI insight
    let aiInsight = '';
    
    if (allIncomes.length === 0 && allExpenses.length === 0) {
      aiInsight = "🚀 Start tracking your income and expenses to get personalized financial insights with GST analysis!";
    } else if (netBalance > 0) {
      const savingsRate = ((netBalance / totalIncome) * 100).toFixed(1);
      aiInsight = `💰 Excellent! You have a positive net balance of ₹${netBalance.toLocaleString('en-IN')} (${savingsRate}% savings rate). `;
      
      if (expenseGST.totalGST > 0) {
        aiInsight += `Your GST paid on expenses is ₹${expenseGST.totalGST.toLocaleString('en-IN')}.`;
      }
      
      if (categoryBreakdown.length > 0) {
        const topCategory = categoryBreakdown[0];
        aiInsight += ` Your highest expense is in ${topCategory.category} (${topCategory.percentage}%).`;
      }
    } else if (netBalance < 0) {
      const deficit = Math.abs(netBalance);
      aiInsight = `⚠️ Your expenses exceed income by ₹${deficit.toLocaleString('en-IN')}. `;
      
      if (categoryBreakdown.length > 0) {
        const topCategories = categoryBreakdown.slice(0, 2);
        aiInsight += `Consider reviewing spending in ${topCategories.map(c => c.category).join(' and ')}.`;
      }
    } else {
      aiInsight = "📊 Your income and expenses are balanced. Great job maintaining financial equilibrium!";
    }

    // Tax deductible analysis
    const taxDeductibleExpenses = allExpenses
      .filter(e => e.isTaxDeductible)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    res.json({
      success: true,
      insight: aiInsight,
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        savingsRate: totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0,
        period: `Last ${days} days`,
        transactionCount: allIncomes.length + allExpenses.length
      },
      gstAnalysis: {
        income: incomeGST,
        expense: expenseGST,
        netGST: expenseGST.totalGST - incomeGST.totalGST,
        gstAsPercentOfExpense: totalExpense > 0 
          ? ((expenseGST.totalGST / totalExpense) * 100).toFixed(2) 
          : 0
      },
      breakdown: {
        expenses: categoryBreakdown.slice(0, 10),
        income: incomeBreakdown.slice(0, 10),
        paymentModes: paymentModes.slice(0, 5)
      },
      taxInfo: {
        taxDeductibleExpenses,
        potentialSavings: (taxDeductibleExpenses * 0.3).toFixed(2) // Assuming 30% tax bracket
      },
      metadata: {
        incomesCount: allIncomes.length,
        expensesCount: allExpenses.length,
        dateRange: {
          from: dateThreshold.toISOString(),
          to: new Date().toISOString()
        },
        tenantId
      }
    });

  } catch (error) {
    console.error('[Insights] Error generating insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/insights/recent-transactions
 * @desc    Get recent transactions
 */
router.get('/recent-transactions', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 10;

    console.log(`[Transactions] Fetching recent for Tenant: ${tenantId}, Limit: ${limit}`);

    // Fetch from all sources
    const [transactions, incomes, expenses] = await Promise.all([
      Transaction.find({ 
        tenantId,
        isDeleted: { $ne: true }
      }).sort({ date: -1 }).limit(limit).lean(),
      
      Income.find({ 
        tenantId,
        isDeleted: { $ne: true }
      }).sort({ date: -1 }).limit(limit).lean(),
      
      Expense.find(
        userId ? { userId } : { tenantId }
      ).sort({ date: -1 }).limit(limit).lean()
    ]);

    // Combine and format all transactions
    const allTransactions = [
      ...transactions.map(t => ({
        id: t._id,
        type: t.type,
        amount: Number(t.amount) || 0,
        description: t.description || t.category || (t.type === 'income' ? 'Income' : 'Expense'),
        category: t.category || (t.type === 'income' ? 'Income' : 'Expense'),
        date: t.date || t.createdAt,
        gstAmount: t.gstAmount || 0,
        paymentMode: t.paymentMode || t.paymentMethod || 'Cash',
        source: 'transaction'
      })),
      ...incomes.map(income => ({
        id: income._id,
        type: 'income',
        amount: Number(income.amount) || 0,
        description: income.description || income.category || 'Income',
        category: income.category || 'Income',
        date: income.date || income.createdAt,
        gstAmount: income.gstAmount || 0,
        paymentMode: income.paymentMode || 'Cash',
        source: 'income'
      })),
      ...expenses.map(expense => ({
        id: expense._id,
        type: 'expense',
        amount: Number(expense.amount) || 0,
        description: expense.title || expense.description || expense.category || 'Expense',
        category: expense.category || 'Expense',
        date: expense.date || expense.createdAt,
        gstAmount: expense.gstAmount || 0,
        paymentMode: expense.paymentMode || expense.paymentMethod || 'Cash',
        source: 'expense'
      }))
    ];

    // Sort by date and limit
    const sortedTransactions = allTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit * 2);

    res.json({
      success: true,
      transactions: sortedTransactions,
      count: sortedTransactions.length
    });

  } catch (error) {
    console.error('[Transactions] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/insights/gst-report
 * @desc    Generate detailed GST report
 */
router.get('/gst-report', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : null;

    console.log(`[GST Report] Tenant: ${tenantId}, Year: ${year}, Month: ${month || 'All'}`);

    // Build date filter
    const dateFilter = {};
    if (month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter.date = { $gte: startDate, $lte: endDate };
    } else {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      dateFilter.date = { $gte: startDate, $lte: endDate };
    }

    // Fetch all data with GST
    const [transactions, incomes, expenses] = await Promise.all([
      Transaction.find({ 
        tenantId,
        isDeleted: { $ne: true },
        gstAmount: { $gt: 0 },
        ...dateFilter
      }).lean(),
      
      Income.find({ 
        tenantId,
        isDeleted: { $ne: true },
        gstAmount: { $gt: 0 },
        ...dateFilter
      }).lean(),
      
      Expense.find({
        ...(userId ? { userId } : { tenantId }),
        gstAmount: { $gt: 0 },
        ...dateFilter
      }).lean()
    ]);

    const allWithGST = [...transactions, ...incomes, ...expenses];

    // Monthly breakdown
    const monthlyGST = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i).toLocaleString('en-IN', { month: 'short' }),
      totalGST: 0,
      income: 0,
      expense: 0,
      transactionCount: 0
    }));

    allWithGST.forEach(txn => {
      const txnMonth = new Date(txn.date).getMonth();
      const gstAmount = Number(txn.gstAmount) || 0;
      
      monthlyGST[txnMonth].totalGST += gstAmount;
      monthlyGST[txnMonth].transactionCount++;
      
      if (txn.type === 'income' || incomes.includes(txn)) {
        monthlyGST[txnMonth].income += gstAmount;
      } else {
        monthlyGST[txnMonth].expense += gstAmount;
      }
    });

    // GST rate-wise breakdown
    const gstRates = {};
    allWithGST.forEach(txn => {
      const rate = txn.taxPercentage || 0;
      if (!gstRates[rate]) {
        gstRates[rate] = { count: 0, totalGST: 0, totalAmount: 0 };
      }
      gstRates[rate].count++;
      gstRates[rate].totalGST += Number(txn.gstAmount) || 0;
      gstRates[rate].totalAmount += Number(txn.amount) || 0;
    });

    const gstRateBreakdown = Object.entries(gstRates)
      .map(([rate, data]) => ({
        rate: `${rate}%`,
        ...data
      }))
      .sort((a, b) => b.totalGST - a.totalGST);

    res.json({
      success: true,
      period: month 
        ? `${new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`
        : `Year ${year}`,
      summary: {
        totalGST: allWithGST.reduce((sum, t) => sum + (Number(t.gstAmount) || 0), 0),
        transactionsWithGST: allWithGST.length,
        avgGSTPerTransaction: allWithGST.length > 0 
          ? (allWithGST.reduce((sum, t) => sum + (Number(t.gstAmount) || 0), 0) / allWithGST.length).toFixed(2)
          : 0
      },
      monthlyBreakdown: monthlyGST,
      gstRates: gstRateBreakdown,
      tenantId
    });

  } catch (error) {
    console.error('[GST Report] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate GST report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;