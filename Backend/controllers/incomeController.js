import Income from '../models/income.js';

// ========================================================
// ✅ VALIDATION UTILITIES
// ========================================================

const validateIncomeData = (data, isPartial = false) => {
  const errors = [];

  // Amount validation (only if provided or for full payload)
  if (!isPartial || (isPartial && data.amount !== undefined)) {
    if (data.amount === undefined || isNaN(data.amount)) {
      errors.push('Valid amount is required');
    } else if (Number(data.amount) <= 0) {
      errors.push('Amount must be greater than 0');
    } else if (Number(data.amount) > 1000000000) {
      errors.push('Amount is too large');
    }
  }

  // Date validation (only if provided or for full payload)
  if (!isPartial || (isPartial && data.date !== undefined)) {
    if (!data.date) {
      errors.push('Date is required');
    } else {
      const inputDate = new Date(data.date);
      if (isNaN(inputDate.getTime())) {
        errors.push('Valid date is required');
      }
    }
  }

  // Category validation (only if provided or for full payload)
  if (!isPartial || (isPartial && data.category !== undefined)) {
    if (!data.category || String(data.category).trim().length === 0) {
      errors.push('Category is required');
    }
  }

  // Payment mode validation (optional - default applied later)
  if (data.paymentMode !== undefined && String(data.paymentMode).trim().length === 0) {
    errors.push('If provided, payment mode cannot be an empty string');
  }

  // Description validation
  if (data.description && String(data.description).length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }

  return errors;
};

// ========================================================
// ✅ INCOME CONTROLLERS
// ========================================================

/**
 * @desc    Get all income records (active only)
 * @route   GET /api/income
 * @access  Private
 */
export const getIncomeHistory = async (req, res) => {
  try {
    console.log(`[${req.correlationId}] 📊 Fetching income history for tenant:`, req.tenantId);
    
    const {
      page = 1,
      limit = 100,
      sortBy = 'date',
      sortOrder = 'desc',
      startDate,
      endDate,
      category,
      minAmount,
      maxAmount,
      search
    } = req.query;

    // Build filter object - only active records
    const filter = {
      tenantId: req.tenantId,
      isDeleted: false
    };

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Search across multiple fields
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: 'i' } },
        { subCategory: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { paymentMode: { $regex: search, $options: 'i' } }
      ];
    }

    console.log(`[${req.correlationId}] 🔍 Income filter:`, JSON.stringify(filter));

    // Execute query with pagination
    const incomeRecords = await Income.find(filter)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalCount = await Income.countDocuments(filter);

    console.log(`[${req.correlationId}] ✅ Found ${incomeRecords.length} income records (Total: ${totalCount})`);

    res.status(200).json(incomeRecords); // Return array directly to match frontend expectation
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error fetching income history:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};

/**
 * @desc    Get deleted income records (history)
 * @route   GET /api/income/history
 * @access  Private
 */
export const getDeletedIncomeHistory = async (req, res) => {
  try {
    console.log(`[${req.correlationId}] 🗑️ Fetching deleted income history for tenant:`, req.tenantId);
    
    const deletedRecords = await Income.find({
      tenantId: req.tenantId,
      isDeleted: true
    })
    .sort({ deletedAt: -1, date: -1 })
    .limit(100)
    .lean();

    console.log(`[${req.correlationId}] ✅ Found ${deletedRecords.length} deleted income records`);

    res.status(200).json(deletedRecords);
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error fetching deleted income history:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deleted income history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};

/**
 * @desc    Get single income record
 * @route   GET /api/income/:id
 * @access  Private
 */
export const getIncomeRecord = async (req, res) => {
  try {
    const incomeRecord = await Income.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
      isDeleted: false
    }).lean();

    if (!incomeRecord) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found',
        correlationId: req.correlationId
      });
    }

    res.status(200).json({
      success: true,
      data: incomeRecord,
      correlationId: req.correlationId
    });
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error fetching income record:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};

/**
 * @desc    Create new income record
 * @route   POST /api/income
 * @access  Private
 */
export const createIncomeRecord = async (req, res) => {
  try {
    console.log(`[${req.correlationId}] 💰 Creating income record for tenant:`, req.tenantId);
    console.log(`[${req.correlationId}] 📦 Request body:`, JSON.stringify(req.body));

    // Validate input data (full payload expected for creates)
    const validationErrors = validateIncomeData(req.body, false);
    if (validationErrors.length > 0) {
      console.log(`[${req.correlationId}] ❌ Validation errors:`, validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        correlationId: req.correlationId
      });
    }

    const {
      date,
      type = 'income',
      category,
      subCategory = '',
      description = '',
      amount,
      paymentMode,
      projectId,
      source = '',
      tags = [],
      recurring = false,
      status = 'received',
      remarks = ''
    } = req.body;

    // Create income object
    const incomeData = {
      tenantId: req.tenantId,
      date: new Date(date),
      type,
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : '',
      description: description ? description.trim() : '',
      amount: Number(amount),
      paymentMode: paymentMode && String(paymentMode).trim().length > 0 ? paymentMode.trim() : 'Other',
      recurring,
      status
    };

    // Add optional fields
    if (req.user && (req.user._id || req.user.id)) {
      incomeData.userId = req.user._id || req.user.id;
    }
    if (projectId) incomeData.projectId = projectId;
    if (source) incomeData.source = source.trim();
    if (tags && tags.length > 0) incomeData.tags = tags;
    if (remarks) incomeData.remarks = remarks.trim();

    const newIncome = new Income(incomeData);
    const savedIncome = await newIncome.save();

    console.log(`[${req.correlationId}] ✅ Income record created:`, savedIncome._id);

    res.status(201).json(savedIncome);
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error creating income record:`, error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessages,
        correlationId: req.correlationId
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create income record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};

/**
 * @desc    Update income record
 * @route   PUT /api/income/:id
 * @access  Private
 */
export const updateIncomeRecord = async (req, res) => {
  try {
    console.log(`[${req.correlationId}] 🔄 Updating income record:`, req.params.id);
    console.log(`[${req.correlationId}] 📦 Update data:`, JSON.stringify(req.body));

    // Validate input data (partial update allowed)
    const validationErrors = validateIncomeData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        correlationId: req.correlationId
      });
    }

    const {
      date,
      type,
      category,
      subCategory,
      description,
      amount,
      paymentMode,
      projectId,
      source,
      tags,
      recurring,
      status,
      remarks
    } = req.body;

    const updateFields = {
      updatedAt: new Date()
    };

    // Update all provided fields
    if (date) updateFields.date = new Date(date);
    if (type) updateFields.type = type;
    if (category) updateFields.category = category.trim();
    if (subCategory !== undefined) updateFields.subCategory = subCategory.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (amount) updateFields.amount = Number(amount);
    if (paymentMode) updateFields.paymentMode = paymentMode.trim();
    if (projectId !== undefined) updateFields.projectId = projectId;
    if (source !== undefined) updateFields.source = source.trim();
    if (tags !== undefined) updateFields.tags = tags;
    if (recurring !== undefined) updateFields.recurring = recurring;
    if (status) updateFields.status = status;
    if (remarks !== undefined) updateFields.remarks = remarks.trim();

    const updatedIncome = await Income.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenantId,
        isDeleted: false
      },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedIncome) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found',
        correlationId: req.correlationId
      });
    }

    console.log(`[${req.correlationId}] ✅ Income record updated:`, updatedIncome._id);

    res.status(200).json(updatedIncome);
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error updating income record:`, error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: Object.values(error.errors).map(err => err.message),
        correlationId: req.correlationId
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update income record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};

/**
 * @desc    Delete income record (soft delete)
 * @route   DELETE /api/income/:id
 * @access  Private
 */
export const deleteIncomeRecord = async (req, res) => {
  try {
    console.log(`[${req.correlationId}] 🗑️ Soft deleting income record:`, req.params.id);

    const deletedIncome = await Income.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenantId,
        isDeleted: false
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { new: true }
    ).lean();

    if (!deletedIncome) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found',
        correlationId: req.correlationId
      });
    }

    console.log(`[${req.correlationId}] ✅ Income record deleted:`, deletedIncome._id);

    res.status(200).json({
      success: true,
      message: 'Income record deleted successfully',
      data: {
        id: deletedIncome._id,
        deletedAt: deletedIncome.deletedAt
      },
      correlationId: req.correlationId
    });
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error deleting income record:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete income record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};

/**
 * @desc    Restore deleted income record
 * @route   PUT /api/income/restore/:id
 * @access  Private
 */
export const restoreIncomeRecord = async (req, res) => {
  try {
    console.log(`[${req.correlationId}] ♻️ Restoring income record:`, req.params.id);

    const restoredIncome = await Income.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenantId,
        isDeleted: true
      },
      {
        $set: {
          isDeleted: false,
          updatedAt: new Date()
        },
        $unset: {
          deletedAt: 1
        }
      },
      { new: true }
    ).lean();

    if (!restoredIncome) {
      return res.status(404).json({
        success: false,
        message: 'Deleted income record not found',
        correlationId: req.correlationId
      });
    }

    console.log(`[${req.correlationId}] ✅ Income record restored:`, restoredIncome._id);

    res.status(200).json({
      success: true,
      message: 'Income record restored successfully',
      data: restoredIncome,
      correlationId: req.correlationId
    });
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error restoring income record:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore income record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};

/**
 * @desc    Permanently delete income record
 * @route   DELETE /api/income/permanent-delete/:id
 * @access  Private
 */
export const permanentDeleteIncomeRecord = async (req, res) => {
  try {
    console.log(`[${req.correlationId}] 💥 Permanently deleting income record:`, req.params.id);

    const deletedIncome = await Income.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
      isDeleted: true // Only allow permanent delete of soft-deleted records
    });

    if (!deletedIncome) {
      return res.status(404).json({
        success: false,
        message: 'Deleted income record not found',
        correlationId: req.correlationId
      });
    }

    console.log(`[${req.correlationId}] ✅ Income record permanently deleted:`, deletedIncome._id);

    res.status(200).json({
      success: true,
      message: 'Income record permanently deleted',
      correlationId: req.correlationId
    });
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error permanently deleting income record:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete income record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};

/**
 * @desc    Get income statistics
 * @route   GET /api/income/stats/summary
 * @access  Private
 */
export const getIncomeStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {
      tenantId: req.tenantId,
      isDeleted: false
    };

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const stats = await Income.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$amount' },
          averageIncome: { $avg: '$amount' },
          count: { $sum: 1 },
          minIncome: { $min: '$amount' },
          maxIncome: { $max: '$amount' }
        }
      }
    ]);

    const categoryStats = await Income.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalIncome: 0,
          averageIncome: 0,
          count: 0,
          minIncome: 0,
          maxIncome: 0
        },
        byCategory: categoryStats
      },
      correlationId: req.correlationId
    });
  } catch (error) {
    console.error(`[${req.correlationId}] ❌ Error fetching income stats:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      correlationId: req.correlationId
    });
  }
};