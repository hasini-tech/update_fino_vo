import Transaction from '../models/Transaction.js';
import Project from '../models/Project.js';

// Default tenant ID for unauthenticated users - changed to match frontend format
const DEFAULT_TENANT_ID = '100000';

// Create transaction (works for both expense and income)
export const createTransaction = async (req, res) => {
  try {
    const { 
      projectId, 
      category, 
      amount, 
      date, 
      description, 
      paymentMethod, 
      paymentMode, 
      vendor, 
      receiptNumber,
      type,
      subCategory
    } = req.body;

    console.log('📝 Creating transaction with data:', req.body);

    // Validate required fields - removed projectId from required
    if (!category || !amount || !date || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, amount, date, type'
      });
    }

    // Get tenantId from request or use default
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    // If projectId is provided, validate it exists
    if (projectId) {
      const project = await Project.findOne({
        _id: projectId,
        tenantId: tenantId,
        isDeleted: false
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
    }

    // Handle payment method/mode compatibility
    const finalPaymentMethod = paymentMethod || paymentMode || 'Cash';
    const finalPaymentMode = paymentMode || paymentMethod || 'Cash';

    const transactionData = {
      projectId: projectId || null,
      type,
      category,
      subCategory: subCategory || '',
      amount: parseFloat(amount),
      date: new Date(date),
      description: description || '',
      paymentMethod: finalPaymentMethod,
      paymentMode: finalPaymentMode,
      vendor: vendor || '',
      receiptNumber: receiptNumber || '',
      tenantId: tenantId
    };

    const transaction = new Transaction(transactionData);
    await transaction.save();

    // If it's an expense with a project, update project's expenseIds
    if (projectId && type === 'expense') {
      await Project.findByIdAndUpdate(projectId, {
        $push: { expenseIds: transaction._id }
      });
    }

    console.log('✅ Transaction created successfully:', transaction._id);

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message
    });
  }
};

// Create expense record (backward compatibility)
export const createExpense = async (req, res) => {
  try {
    const { 
      projectId, 
      category, 
      amount, 
      date, 
      description, 
      paymentMethod, 
      paymentMode, 
      vendor, 
      receiptNumber,
      subCategory
    } = req.body;

    console.log('📝 Creating expense with data:', req.body);

    // Validate required fields - removed projectId from required
    if (!category || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, amount, date'
      });
    }

    // Get tenantId from request or use default
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    // If projectId is provided, validate it exists
    if (projectId) {
      const project = await Project.findOne({
        _id: projectId,
        tenantId: tenantId,
        isDeleted: false
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
    }

    // Handle payment method/mode compatibility
    const finalPaymentMethod = paymentMethod || paymentMode || 'Cash';
    const finalPaymentMode = paymentMode || paymentMethod || 'Cash';

    const expenseData = {
      projectId: projectId || null,
      type: 'expense',
      category,
      subCategory: subCategory || '',
      amount: parseFloat(amount),
      date: new Date(date),
      description: description || '',
      paymentMethod: finalPaymentMethod,
      paymentMode: finalPaymentMode,
      vendor: vendor || '',
      receiptNumber: receiptNumber || '',
      tenantId: tenantId
    };

    const expense = new Transaction(expenseData);
    await expense.save();

    // If projectId is provided, update project's expenseIds
    if (projectId) {
      await Project.findByIdAndUpdate(projectId, {
        $push: { expenseIds: expense._id }
      });
    }

    console.log('✅ Expense created successfully:', expense._id);

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense record created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create expense record',
      error: error.message
    });
  }
};

// Get all transactions
export const getTransactions = async (req, res) => {
  try {
    const { projectId, type, category, startDate, endDate } = req.query;
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    console.log('📥 Fetching transactions for tenant:', tenantId);

    let query = { 
      tenantId: tenantId,
      isDeleted: false 
    };
    
    // Apply filters
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (category) {
      query.category = category;
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('projectId', 'name color')
      .sort({ date: -1, createdAt: -1 });

    console.log(`✅ Found ${transactions.length} transactions`);

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// Get expenses for project or all expenses
export const getExpenses = async (req, res) => {
  try {
    const { projectId } = req.query;
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    console.log('📥 Fetching expenses for tenant:', tenantId);

    let query = { 
      tenantId: tenantId, 
      type: 'expense',
      isDeleted: false 
    };
    
    if (projectId) {
      query.projectId = projectId;
    }

    const expenses = await Transaction.find(query)
      .populate('projectId', 'name color')
      .sort({ date: -1, createdAt: -1 });

    console.log(`✅ Found ${expenses.length} expenses`);

    res.status(200).json({
      success: true,
      data: expenses,
      count: expenses.length
    });
  } catch (error) {
    console.error('❌ Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense records',
      error: error.message
    });
  }
};

// Update transaction record
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    console.log('✏️ Updating transaction:', id);

    // Handle payment method/mode in update
    const updateData = { ...req.body };
    if (updateData.paymentMode && !updateData.paymentMethod) {
      updateData.paymentMethod = updateData.paymentMode;
    }
    if (updateData.paymentMethod && !updateData.paymentMode) {
      updateData.paymentMode = updateData.paymentMethod;
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, tenantId: tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction record not found'
      });
    }

    console.log('✅ Transaction updated successfully:', transaction._id);

    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction record updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction record',
      error: error.message
    });
  }
};

// Update expense record (backward compatibility)
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    console.log('✏️ Updating expense:', id);

    // Handle payment method/mode in update
    const updateData = { ...req.body };
    if (updateData.paymentMode && !updateData.paymentMethod) {
      updateData.paymentMethod = updateData.paymentMode;
    }
    if (updateData.paymentMethod && !updateData.paymentMode) {
      updateData.paymentMode = updateData.paymentMethod;
    }

    const expense = await Transaction.findOneAndUpdate(
      { _id: id, tenantId: tenantId, type: 'expense' },
      updateData,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found'
      });
    }

    console.log('✅ Expense updated successfully:', expense._id);

    res.status(200).json({
      success: true,
      data: expense,
      message: 'Expense record updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense record',
      error: error.message
    });
  }
};

// Delete transaction record (soft delete)
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    console.log('🗑️ Deleting transaction:', id);

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, tenantId: tenantId },
      { isDeleted: true },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction record not found'
      });
    }

    console.log('✅ Transaction deleted successfully:', id);

    res.status(200).json({
      success: true,
      message: 'Transaction record deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction record',
      error: error.message
    });
  }
};

// Delete expense record (soft delete - backward compatibility)
export const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    console.log('🗑️ Deleting expense:', id);

    const expense = await Transaction.findOneAndUpdate(
      { _id: id, tenantId: tenantId, type: 'expense' },
      { isDeleted: true },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense record not found'
      });
    }

    console.log('✅ Expense deleted successfully:', id);

    res.status(200).json({
      success: true,
      message: 'Expense record deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense record',
      error: error.message
    });
  }
};

// Get transaction statistics
export const getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate, projectId } = req.query;
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;

    console.log('📊 Fetching statistics for tenant:', tenantId);

    let query = { 
      tenantId: tenantId,
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

    const categoryBreakdown = transactions.reduce((acc, t) => {
      const key = t.category;
      if (!acc[key]) {
        acc[key] = { total: 0, expense: 0, income: 0 };
      }
      acc[key].total += t.amount;
      if (t.type === 'expense') {
        acc[key].expense += t.amount;
      } else {
        acc[key].income += t.amount;
      }
      return acc;
    }, {});

    const stats = {
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      categoryBreakdown,
      expenseCount: transactions.filter(t => t.type === 'expense').length,
      incomeCount: transactions.filter(t => t.type === 'income').length
    };

    console.log('✅ Statistics calculated successfully');

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
};

