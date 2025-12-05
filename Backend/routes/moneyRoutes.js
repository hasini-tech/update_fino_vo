import express from 'express';
import MoneyTransaction from '../models/moneyTransaction.js';
import Notification from '../models/Notification.js';
import { tenantMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

// Get all money transactions with filters
router.get('/', async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10, sortBy = 'dueDate', sortOrder = 'asc' } = req.query;
    const tenantId = req.tenantId;

    let filter = { tenantId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const transactions = await MoneyTransaction.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MoneyTransaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('❌ Error fetching money transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch money transactions',
      error: error.message
    });
  }
});

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const transaction = await MoneyTransaction.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      transaction
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

// Create new money transaction (Borrow/Lend)
router.post('/', async (req, res) => {
  try {
    const {
      type,
      personName,
      amount,
      purpose,
      transactionDate,
      dueDate,
      upiLink,
      notes,
      reminderEnabled = true
    } = req.body;

    // Validation
    if (!type || !personName || !amount || !purpose || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Type, person name, amount, purpose, and due date are required'
      });
    }

    if (type !== 'borrow' && type !== 'lend') {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "borrow" or "lend"'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Validate due date is in the future
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDateObj < today) {
      return res.status(400).json({
        success: false,
        message: 'Due date must be in the future'
      });
    }

    const transaction = new MoneyTransaction({
      tenantId: req.tenantId,
      type,
      personName: personName.trim(),
      amount: parseFloat(amount),
      purpose: purpose.trim(),
      transactionDate: transactionDate || new Date(),
      dueDate: dueDateObj,
      upiLink,
      notes,
      reminderEnabled
    });

    await transaction.save();

    // Create initial notification for new transaction
    if (reminderEnabled) {
      const notification = new Notification({
        tenantId: req.tenantId,
        transactionId: transaction._id,
        type: 'reminder',
        title: `New ${type === 'borrow' ? 'Borrow' : 'Lend'} Transaction Created`,
        message: `${type === 'borrow' ? 'You borrowed' : 'You lent'} ₹${amount} ${type === 'borrow' ? 'from' : 'to'} ${personName.trim()} for "${purpose.trim()}". Due date: ${dueDateObj.toLocaleDateString()}`,
        scheduledFor: new Date(),
        sent: true,
        sentAt: new Date()
      });
      await notification.save();
    }

    res.status(201).json({
      success: true,
      message: `${type === 'borrow' ? 'Borrow' : 'Lend'} transaction created successfully`,
      transaction
    });
  } catch (error) {
    console.error('❌ Error creating money transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create money transaction',
      error: error.message
    });
  }
});

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const {
      personName,
      amount,
      purpose,
      transactionDate,
      dueDate,
      upiLink,
      notes,
      reminderEnabled
    } = req.body;

    const transaction = await MoneyTransaction.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        personName,
        amount,
        purpose,
        transactionDate,
        dueDate,
        upiLink,
        notes,
        reminderEnabled,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      transaction
    });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: error.message
    });
  }
});

// Mark transaction as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const transaction = await MoneyTransaction.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Create completion notification
    const notification = new Notification({
      tenantId: req.tenantId,
      transactionId: transaction._id,
      type: 'payment',
      title: 'Transaction Completed',
      message: `${transaction.type === 'borrow' ? 'Borrowed' : 'Lent'} amount of ₹${transaction.amount} ${transaction.type === 'borrow' ? 'from' : 'to'} ${transaction.personName} has been completed.`,
      scheduledFor: new Date(),
      sent: true,
      sentAt: new Date()
    });
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Transaction marked as completed',
      transaction
    });
  } catch (error) {
    console.error('❌ Error completing transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete transaction',
      error: error.message
    });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await MoneyTransaction.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Delete associated notifications
    await Notification.deleteMany({ 
      tenantId: req.tenantId,
      transactionId: req.params.id 
    });

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
      error: error.message
    });
  }
});

// Get comprehensive statistics
router.get('/statistics/summary', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Total amounts for pending transactions only
    const totalBorrow = await MoneyTransaction.aggregate([
      { $match: { tenantId, type: 'borrow', status: { $in: ['pending', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalLend = await MoneyTransaction.aggregate([
      { $match: { tenantId, type: 'lend', status: { $in: ['pending', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Counts by status
    const overdueCount = await MoneyTransaction.countDocuments({
      tenantId,
      status: 'overdue'
    });

    const dueSoonCount = await MoneyTransaction.countDocuments({
      tenantId,
      status: 'pending',
      dueDate: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    });

    const totalPending = await MoneyTransaction.countDocuments({
      tenantId,
      status: 'pending'
    });

    const completedCount = await MoneyTransaction.countDocuments({
      tenantId,
      status: 'completed'
    });

    // Recent transactions (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await MoneyTransaction.countDocuments({
      tenantId,
      createdAt: { $gte: weekAgo }
    });

    // Notification statistics
    const unreadNotificationsCount = await Notification.countDocuments({
      tenantId,
      sent: false
    });

    res.status(200).json({
      success: true,
      statistics: {
        totalBorrow: totalBorrow[0]?.total || 0,
        totalLend: totalLend[0]?.total || 0,
        overdueCount,
        dueSoonCount,
        totalPending,
        completedCount,
        recentCount,
        unreadNotificationsCount,
        netBalance: (totalLend[0]?.total || 0) - (totalBorrow[0]?.total || 0)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching money statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Get notifications with filters
router.get('/notifications/list', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      sent,
      sortBy = 'scheduledFor',
      sortOrder = 'desc' 
    } = req.query;
    
    let filter = { tenantId: req.tenantId };
    
    // Apply filters if provided
    if (type) filter.type = type;
    if (sent !== undefined) filter.sent = sent === 'true';

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const notifications = await Notification.find(filter)
      .populate('transactionId')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      success: true,
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Mark notification as read/sent
router.patch('/notifications/:id/mark-read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId: req.tenantId 
      },
      {
        sent: true,
        sentAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Delete notification
router.delete('/notifications/:id', async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// Get upcoming due transactions
router.get('/upcoming/due', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const tenantId = req.tenantId;

    const startDate = new Date();
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const upcomingTransactions = await MoneyTransaction.find({
      tenantId,
      status: 'pending',
      dueDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      transactions: upcomingTransactions,
      count: upcomingTransactions.length
    });
  } catch (error) {
    console.error('❌ Error fetching upcoming transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming transactions',
      error: error.message
    });
  }
});

// Get overdue transactions
router.get('/overdue/list', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const tenantId = req.tenantId;

    const overdueTransactions = await MoneyTransaction.find({
      tenantId,
      status: 'overdue'
    })
    .sort({ dueDate: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await MoneyTransaction.countDocuments({
      tenantId,
      status: 'overdue'
    });

    res.status(200).json({
      success: true,
      transactions: overdueTransactions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('❌ Error fetching overdue transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue transactions',
      error: error.message
    });
  }
});

export default router;
