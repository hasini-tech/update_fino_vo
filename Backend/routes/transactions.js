import express from 'express';
import Transaction from '../models/Transaction.js';
import Project from '../models/Project.js';
import { protect, tenantMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==================== TENANT ID MIDDLEWARE ====================
const handleTenantId = (req, res, next) => {
  // Express lowercases all header names, so always use lowercase
  const rawTenantId = req.headers['tenant-id'] || 
                      req.headers['x-tenant-id'] ||
                      req.tenantId;  // From previous middleware
  
  console.log('📋 Tenant ID extraction:', {
    'from_tenant-id': req.headers['tenant-id'],
    'from_x-tenant-id': req.headers['x-tenant-id'],
    'from_req.tenantId': req.tenantId,
    'rawTenantId': rawTenantId
  });
  
  // If no tenant ID found, use default for development
  if (!rawTenantId) {
    console.warn('⚠️ No tenant ID found, using default: 100000');
    req.tenantId = '100000';
    return next();
  }
  
  // Clean the tenant ID - remove any whitespace or special characters
  const trimmedTenantId = String(rawTenantId)
    .trim()
    .replace(/[^\w-]/g, '');  // Remove anything that's not alphanumeric or hyphen
  
  // Validation: must be exactly 6 digits OR start with 'fallback-'
  const isValidSixDigit = /^\d{6}$/.test(trimmedTenantId);
  const isValidFallback = trimmedTenantId.startsWith('fallback-');
  
  console.log(`🔍 Tenant ID validation: "${trimmedTenantId}" | isValidSixDigit: ${isValidSixDigit} | isValidFallback: ${isValidFallback}`);
  
  // If invalid but has digits, try to extract 6 digits
  if (!isValidSixDigit && !isValidFallback) {
    const digitsOnly = trimmedTenantId.replace(/\D/g, '');
    if (digitsOnly.length === 6) {
      console.log(`✅ Extracted 6-digit tenant ID: ${digitsOnly}`);
      req.tenantId = digitsOnly;
      return next();
    }
    
    // Still invalid - use default instead of rejecting
    console.warn(`⚠️ Invalid tenant ID "${trimmedTenantId}", using default: 100000`);
    req.tenantId = '100000';
    return next();
  }
  
  // Valid tenant ID
  req.tenantId = trimmedTenantId;
  console.log(`🏢 Processing request for tenant: ${req.tenantId}`);
  next();
};
// Apply tenant ID middleware to all routes
router.use(handleTenantId);

// ==================== TRANSACTION ROUTES ====================

// @desc    Create new transaction (supports both expense and income)
// @route   POST /api/transactions
// @access  Private/Public
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating transaction for tenant:', req.tenantId);
    console.log('📦 Request body:', req.body);
    
    const { date, amount, category, paymentMode, paymentMethod, type, projectId, description, subCategory, vendor, receiptNumber, note } = req.body;
    
    // Validate required fields
    if (!date || !amount || !category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date, amount, category, type'
      });
    }
    
    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }
    
    // Validate type
    const validTypes = ['expense', 'income'];
    if (!validTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "expense" or "income"'
      });
    }
    
    // Handle payment method compatibility
    const finalPaymentMode = paymentMode || paymentMethod || 'Cash';
    
    const transactionData = { 
      ...req.body,
      type: type.toLowerCase(),
      paymentMode: finalPaymentMode,
      paymentMethod: finalPaymentMode,
      amount: parseFloat(amount),
      date: new Date(date),
      tenantId: req.tenantId,
      subCategory: subCategory || '',
      note: note || '',
      status: 'completed' // default status
    };
    
    const transaction = await Transaction.create(transactionData);
    
    // If it's a project expense, update the project's expenseIds
    if (projectId && type.toLowerCase() === 'expense') {
      await Project.findByIdAndUpdate(projectId, {
        $push: { expenseIds: transaction._id }
      });
    }
    
    // Populate the response
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('projectId', 'name color status');
    
    console.log('✅ Transaction created:', transaction._id);
    res.status(201).json({
      success: true,
      data: populatedTransaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create transaction', 
      error: error.message 
    });
  }
});

// @desc    Create expense (backward compatibility)
// @route   POST /api/transactions/expenses
// @access  Private/Public
router.post('/expenses', async (req, res) => {
  try {
    console.log('📝 Creating expense for tenant:', req.tenantId);
    console.log('📦 Request body:', req.body);
    
    const { projectId, category, amount, date, description, paymentMethod, paymentMode, vendor, receiptNumber, subCategory, note } = req.body;

    // Validate required fields
    if (!category || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, amount, date'
      });
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Handle payment method compatibility
    const finalPaymentMode = paymentMode || paymentMethod || 'Cash';

    const expenseData = { 
      projectId: projectId || null,
      type: 'expense',
      category,
      subCategory: subCategory || '',
      amount: parseFloat(amount),
      date: new Date(date),
      description: description || '',
      paymentMode: finalPaymentMode,
      paymentMethod: finalPaymentMode,
      vendor: vendor || '',
      receiptNumber: receiptNumber || '',
      note: note || '',
      status: 'completed',
      tenantId: req.tenantId
    };
    
    const expense = await Transaction.create(expenseData);
    
    // If projectId is provided, update project's expenseIds
    if (projectId) {
      await Project.findByIdAndUpdate(projectId, {
        $push: { expenseIds: expense._id }
      });
    }

    // Populate the response
    const populatedExpense = await Transaction.findById(expense._id)
      .populate('projectId', 'name color status');

    console.log('✅ Expense created:', expense._id);
    res.status(201).json({
      success: true,
      data: populatedExpense,
      message: 'Expense record created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating expense:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create expense', 
      error: error.message 
    });
  }
});

// @desc    Create income
// @route   POST /api/transactions/incomes
// @access  Private/Public
router.post('/incomes', async (req, res) => {
  try {
    console.log('📝 Creating income for tenant:', req.tenantId);
    console.log('📦 Request body:', req.body);
    
    const { category, amount, date, description, paymentMethod, paymentMode, source, note } = req.body;

    // Validate required fields
    if (!category || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, amount, date'
      });
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Handle payment method compatibility
    const finalPaymentMode = paymentMode || paymentMethod || 'Cash';

    const incomeData = { 
      type: 'income',
      category,
      amount: parseFloat(amount),
      date: new Date(date),
      description: description || '',
      paymentMode: finalPaymentMode,
      paymentMethod: finalPaymentMode,
      source: source || '',
      note: note || '',
      status: 'completed',
      tenantId: req.tenantId
    };
    
    const income = await Transaction.create(incomeData);

    console.log('✅ Income created:', income._id);
    res.status(201).json({
      success: true,
      data: income,
      message: 'Income record created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating income:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create income', 
      error: error.message 
    });
  }
});

// @desc    Get all transactions with filtering and pagination
// @route   GET /api/transactions
// @access  Private/Public
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      category, 
      projectId, 
      startDate, 
      endDate, 
      paymentMode,
      status,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;
    
    console.log('📥 Fetching transactions for tenant:', req.tenantId);
    
    let query = { 
      tenantId: req.tenantId,
      isDeleted: false 
    };
    
    // Apply filters
    if (type) {
      query.type = type;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (paymentMode) {
      query.paymentMode = paymentMode;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const transactions = await Transaction.find(query)
      .populate('projectId', 'name color status')
      .sort(sortConfig)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count for pagination
    const total = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    
    console.log(`✅ Found ${transactions.length} transactions (Page ${pageNum}/${totalPages})`);
    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        current: pageNum,
        total: totalPages,
        count: transactions.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transactions', 
      error: error.message 
    });
  }
});

// @desc    Get all expenses
// @route   GET /api/transactions/expenses
// @access  Private/Public
router.get('/expenses', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    console.log('📊 [GET /expenses] Incoming request headers:', {
      'tenant-id': req.headers['tenant-id'],
      'x-tenant-id': req.headers['x-tenant-id'],
      'X-Tenant-ID': req.headers['X-Tenant-ID'],
      'req.tenantId': req.tenantId
    });
    
    if (!tenantId) {
      console.error('❌ [GET /expenses] No Tenant ID in headers!');
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    console.log('🏢 [GET /expenses] Using Tenant ID:', tenantId, '| Type:', typeof tenantId, '| Length:', tenantId.length);
    
    // Build query
    const query = {
      tenantId: tenantId,
      type: 'expense',
      isDeleted: false
    };
    
    console.log('🔍 [GET /expenses] MongoDB query:', JSON.stringify(query));
    
    // Fetch ALL expense transactions from MongoDB
    const expenses = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();
    
    console.log('✅ [GET /expenses] Found', expenses.length, 'expense transactions in MongoDB');
    
    if (expenses.length > 0) {
      console.log('📋 [GET /expenses] Sample expense record:', JSON.stringify(expenses[0], null, 2));
      console.log('📋 [GET /expenses] All tenant IDs in results:', expenses.map(e => e.tenantId).join(', '));
    } else {
      // Debug: count all transactions with this tenantId (including deleted/other types)
      const allWithTenant = await Transaction.find({ tenantId: tenantId }).lean();
      const allExpenses = await Transaction.find({ type: 'expense' }).lean();
      console.warn('⚠️ [GET /expenses] No results! Debug info:');
      console.warn('  - Transactions with this tenantId (any type):', allWithTenant.length);
      console.warn('  - All expense transactions in DB (any tenant):', allExpenses.length);
      if (allWithTenant.length > 0) {
        console.warn('  - Sample with this tenant:', JSON.stringify(allWithTenant[0], null, 2));
      }
    }
    
    res.status(200).json(expenses); // Return array directly for frontend compatibility
  } catch (error) {
    console.error('❌ [GET /expenses] Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses from MongoDB',
      error: error.message
    });
  }
});

// @desc    Get all incomes
// @route   GET /api/transactions/incomes
// @access  Private/Public
router.get('/incomes', async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 50 } = req.query;
    console.log('📥 Fetching incomes for tenant:', req.tenantId);
    
    let query = { 
      tenantId: req.tenantId,
      type: 'income',
      isDeleted: false
    };
    
    if (category) {
      query.category = category;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const incomes = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    // Get total count
    const total = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    
    console.log(`✅ Found ${incomes.length} incomes`);
    res.status(200).json({
      success: true,
      data: incomes,
      pagination: {
        current: pageNum,
        total: totalPages,
        count: incomes.length,
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('❌ Error fetching incomes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch incomes', 
      error: error.message 
    });
  }
});

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private/Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Fetching transaction:', id);
    
    const transaction = await Transaction.findOne({ 
      _id: id, 
      tenantId: req.tenantId,
      isDeleted: false
    }).populate('projectId', 'name color status');
    
    if (!transaction) {
      console.log('❌ Transaction not found:', id);
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found or access denied' 
      });
    }
    
    console.log('✅ Transaction found:', transaction._id);
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transaction', 
      error: error.message 
    });
  }
});

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private/Public
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating transaction:', id);
    
    // Validate amount if provided
    if (req.body.amount && (isNaN(req.body.amount) || parseFloat(req.body.amount) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }
    
    // Handle payment method compatibility
    const updateData = { ...req.body };
    if (updateData.paymentMode && !updateData.paymentMethod) {
      updateData.paymentMethod = updateData.paymentMode;
    }
    if (updateData.paymentMethod && !updateData.paymentMode) {
      updateData.paymentMode = updateData.paymentMethod;
    }
    
    // Handle date conversion if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }
    
    // Handle amount conversion if provided
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      updateData,
      { 
        new: true,
        runValidators: true
      }
    ).populate('projectId', 'name color status');
    
    if (!transaction) {
      console.log('❌ Transaction not found:', id);
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found or access denied' 
      });
    }
    
    console.log('✅ Transaction updated:', transaction._id);
    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to update transaction', 
      error: error.message 
    });
  }
});

// @desc    Update expense (backward compatibility)
// @route   PUT /api/transactions/expenses/:id
// @access  Private/Public
router.put('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating expense:', id);
    
    // Validate amount if provided
    if (req.body.amount && (isNaN(req.body.amount) || parseFloat(req.body.amount) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }
    
    // Handle payment method compatibility
    const updateData = { ...req.body };
    if (updateData.paymentMode && !updateData.paymentMethod) {
      updateData.paymentMethod = updateData.paymentMode;
    }
    if (updateData.paymentMethod && !updateData.paymentMode) {
      updateData.paymentMode = updateData.paymentMethod;
    }
    
    const expense = await Transaction.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId, type: 'expense' },
      updateData,
      { 
        new: true,
        runValidators: true
      }
    ).populate('projectId', 'name color status');
    
    if (!expense) {
      console.log('❌ Expense not found:', id);
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found or access denied' 
      });
    }
    
    console.log('✅ Expense updated:', expense._id);
    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating expense:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to update expense', 
      error: error.message 
    });
  }
});

// @desc    Delete transaction (soft delete)
// @route   DELETE /api/transactions/:id
// @access  Private/Public
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting transaction:', id);
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    
    if (!transaction) {
      console.log('❌ Transaction not found:', id);
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found or access denied' 
      });
    }
    
    // If it was a project expense, remove from project's expenseIds
    if (transaction.projectId && transaction.type === 'expense') {
      await Project.findByIdAndUpdate(transaction.projectId, {
        $pull: { expenseIds: transaction._id }
      });
    }
    
    console.log('✅ Transaction deleted:', id);
    res.status(200).json({ 
      success: true,
      message: 'Transaction deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to delete transaction', 
      error: error.message 
    });
  }
});

// @desc    Delete expense (backward compatibility)
// @route   DELETE /api/transactions/expenses/:id
// @access  Private/Public
router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting expense:', id);
    
    const expense = await Transaction.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId, type: 'expense' },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    
    if (!expense) {
      console.log('❌ Expense not found:', id);
      return res.status(404).json({ 
        success: false,
        message: 'Expense not found or access denied' 
      });
    }
    
    // Remove from project's expenseIds if applicable
    if (expense.projectId) {
      await Project.findByIdAndUpdate(expense.projectId, {
        $pull: { expenseIds: expense._id }
      });
    }
    
    console.log('✅ Expense deleted:', id);
    res.status(200).json({ 
      success: true,
      message: 'Expense deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('❌ Error deleting expense:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to delete expense', 
      error: error.message 
    });
  }
});

// @desc    Hard delete transaction (permanent)
// @route   DELETE /api/transactions/:id/hard
// @access  Private/Public
router.delete('/:id/hard', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💥 Hard deleting transaction:', id);
    
    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      tenantId: req.tenantId
    });
    
    if (!transaction) {
      console.log('❌ Transaction not found:', id);
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found or access denied' 
      });
    }
    
    // Remove from project's expenseIds if applicable
    if (transaction.projectId && transaction.type === 'expense') {
      await Project.findByIdAndUpdate(transaction.projectId, {
        $pull: { expenseIds: transaction._id }
      });
    }
    
    console.log('✅ Transaction permanently deleted:', id);
    res.status(200).json({ 
      success: true,
      message: 'Transaction permanently deleted',
      id: id
    });
  } catch (error) {
    console.error('❌ Error hard deleting transaction:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to delete transaction', 
      error: error.message 
    });
  }
});

// ==================== STATISTICS & ANALYTICS ROUTES ====================

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats/summary
// @access  Private/Public
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate, projectId } = req.query;
    console.log('📊 Fetching statistics for tenant:', req.tenantId);
    
    let query = { 
      tenantId: req.tenantId,
      isDeleted: false 
    };

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (projectId) {
      query.projectId = projectId;
    }
    
    const transactions = await Transaction.find(query);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Category breakdown
    const categoryBreakdown = transactions.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { total: 0, count: 0, type: t.type };
      }
      acc[t.category].total += t.amount;
      acc[t.category].count += 1;
      return acc;
    }, {});
    
    // Payment method breakdown
    const paymentMethodBreakdown = transactions.reduce((acc, t) => {
      if (!acc[t.paymentMode]) {
        acc[t.paymentMode] = { total: 0, count: 0 };
      }
      acc[t.paymentMode].total += t.amount;
      acc[t.paymentMode].count += 1;
      return acc;
    }, {});
    
    // Monthly breakdown
    const monthlyBreakdown = transactions.reduce((acc, t) => {
      const monthYear = t.date.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[monthYear]) {
        acc[monthYear] = { 
          expenses: 0, 
          income: 0, 
          balance: 0,
          date: t.date
        };
      }
      
      if (t.type === 'expense') {
        acc[monthYear].expenses += t.amount;
      } else {
        acc[monthYear].income += t.amount;
      }
      acc[monthYear].balance = acc[monthYear].income - acc[monthYear].expenses;
      
      return acc;
    }, {});
    
    const stats = {
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      expenseCount: transactions.filter(t => t.type === 'expense').length,
      incomeCount: transactions.filter(t => t.type === 'income').length,
      categoryBreakdown,
      paymentMethodBreakdown,
      monthlyBreakdown: Object.entries(monthlyBreakdown)
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {})
    };
    
    console.log('✅ Statistics calculated');
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch statistics', 
      error: error.message 
    });
  }
});

// @desc    Get recent transactions
// @route   GET /api/transactions/recent/:limit?
// @access  Private/Public
router.get('/recent/:limit?', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
    console.log('🕒 Fetching recent transactions for tenant:', req.tenantId);
    
    const recentTransactions = await Transaction.find({
      tenantId: req.tenantId,
      isDeleted: false
    })
    .populate('projectId', 'name color')
    .sort({ date: -1, createdAt: -1 })
    .limit(limit);
    
    console.log(`✅ Found ${recentTransactions.length} recent transactions`);
    res.status(200).json({
      success: true,
      data: recentTransactions,
      count: recentTransactions.length
    });
  } catch (error) {
    console.error('❌ Error fetching recent transactions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch recent transactions', 
      error: error.message 
    });
  }
});

// @desc    Get transactions by date range
// @route   GET /api/transactions/range/:startDate/:endDate
// @access  Private/Public
router.get('/range/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    console.log('📅 Fetching transactions by date range for tenant:', req.tenantId);
    
    const transactions = await Transaction.find({
      tenantId: req.tenantId,
      isDeleted: false,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
    .populate('projectId', 'name color status')
    .sort({ date: -1 });
    
    console.log(`✅ Found ${transactions.length} transactions in date range`);
    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('❌ Error fetching transactions by date range:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transactions', 
      error: error.message 
    });
  }
});

// @desc    Bulk create transactions
// @route   POST /api/transactions/bulk
// @access  Private/Public
router.post('/bulk', async (req, res) => {
  try {
    const { transactions } = req.body;
    console.log('📦 Creating bulk transactions for tenant:', req.tenantId);
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transactions array is required and cannot be empty'
      });
    }
    
    // Add tenantId to each transaction
    const transactionsWithTenant = transactions.map(transaction => ({
      ...transaction,
      tenantId: req.tenantId,
      amount: parseFloat(transaction.amount),
      date: new Date(transaction.date),
      paymentMode: transaction.paymentMode || transaction.paymentMethod || 'Cash',
      paymentMethod: transaction.paymentMethod || transaction.paymentMode || 'Cash'
    }));
    
    const createdTransactions = await Transaction.insertMany(transactionsWithTenant);
    
    console.log(`✅ Created ${createdTransactions.length} bulk transactions`);
    res.status(201).json({
      success: true,
      data: createdTransactions,
      message: `Successfully created ${createdTransactions.length} transactions`
    });
  } catch (error) {
    console.error('❌ Error creating bulk transactions:', error);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create bulk transactions', 
      error: error.message 
    });
  }
});

// @desc    Get available categories
// @route   GET /api/transactions/categories
// @access  Private/Public
router.get('/meta/categories', async (req, res) => {
  try {
    const { type } = req.query;
    console.log('🏷️ Fetching categories for tenant:', req.tenantId);
    
    let query = { 
      tenantId: req.tenantId,
      isDeleted: false 
    };
    
    if (type) {
      query.type = type;
    }
    
    const categories = await Transaction.distinct('category', query);
    
    console.log(`✅ Found ${categories.length} categories`);
    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch categories', 
      error: error.message 
    });
  }
});

// @desc    Get available payment methods
// @route   GET /api/transactions/payment-methods
// @access  Private/Public
router.get('/meta/payment-methods', async (req, res) => {
  try {
    console.log('💳 Fetching payment methods for tenant:', req.tenantId);
    
    const paymentMethods = await Transaction.distinct('paymentMode', {
      tenantId: req.tenantId,
      isDeleted: false
    });
    
    console.log(`✅ Found ${paymentMethods.length} payment methods`);
    res.status(200).json({
      success: true,
      data: paymentMethods,
      count: paymentMethods.length
    });
  } catch (error) {
    console.error('❌ Error fetching payment methods:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch payment methods', 
      error: error.message 
    });
  }
});

export default router;



