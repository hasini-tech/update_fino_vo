import express from 'express';
import Income from '../models/income.js';

const router = express.Router();

// ========================================================
// ✅ CUSTOM TENANT MIDDLEWARE FOR INCOME ROUTES
// ========================================================
const handleTenantId = (req, res, next) => {
  // Express lowercases all header names, so always use lowercase
  const rawTenantId = req.headers['tenant-id'] || 
                      req.headers['x-tenant-id'] ||
                      req.headers['Tenant-Id'] ||
                      req.headers['X-Tenant-ID'] ||
                      req.query.tenantId ||
                      req.body?.tenantId ||
                      req.tenantId;
  
  console.log('📋 [Income Routes] Tenant ID extraction:', {
    'from_tenant-id': req.headers['tenant-id'],
    'from_x-tenant-id': req.headers['x-tenant-id'],
    'from_query': req.query.tenantId,
    'from_body': req.body?.tenantId,
    'from_req.tenantId': req.tenantId,
    'rawTenantId': rawTenantId
  });
  
  // If no tenant ID found, generate fallback for development
  if (!rawTenantId) {
    if (process.env.NODE_ENV === 'development') {
      req.tenantId = 'fallback-' + Date.now().toString(36);
      console.warn('⚠️ [Income Routes] No tenant ID found, using fallback:', req.tenantId);
      return next();
    }
    
    console.error('❌ [Income Routes] No Tenant ID provided');
    return res.status(400).json({
      success: false,
      message: 'Tenant ID is required. Please include "Tenant-ID" or "X-Tenant-ID" header.'
    });
  }
  
  // Clean the tenant ID - remove any whitespace or special characters
  const trimmedTenantId = String(rawTenantId)
    .trim()
    .replace(/[^\w-]/g, '');  // Remove anything that's not alphanumeric or hyphen
  
  // Validation: must be exactly 6 digits OR start with 'fallback-'
  const isValidSixDigit = /^\d{6}$/.test(trimmedTenantId);
  const isValidFallback = trimmedTenantId.startsWith('fallback-');
  const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(trimmedTenantId);
  
  console.log(`🔍 [Income Routes] Tenant ID validation: "${trimmedTenantId}" | isValidSixDigit: ${isValidSixDigit} | isValidFallback: ${isValidFallback} | isValidObjectId: ${isValidObjectId}`);
  
  // If invalid but has digits, try to extract 6 digits
  if (!isValidSixDigit && !isValidFallback && !isValidObjectId) {
    const digitsOnly = trimmedTenantId.replace(/\D/g, '');
    if (digitsOnly.length === 6) {
      console.log(`✅ [Income Routes] Extracted 6-digit tenant ID: ${digitsOnly}`);
      req.tenantId = digitsOnly;
      return next();
    }
    
    // Still invalid - use fallback instead of rejecting in development
    if (process.env.NODE_ENV === 'development') {
      req.tenantId = 'fallback-' + Date.now().toString(36);
      console.warn(`⚠️ [Income Routes] Invalid tenant ID "${trimmedTenantId}", using fallback: ${req.tenantId}`);
      return next();
    }
    
    console.error(`❌ [Income Routes] Invalid tenant ID format: "${trimmedTenantId}"`);
    return res.status(400).json({
      success: false,
      message: 'Invalid Tenant ID format. Must be 6-digit number or start with "fallback-"',
      received: trimmedTenantId,
      length: trimmedTenantId.length
    });
  }
  
  // Valid tenant ID
  req.tenantId = trimmedTenantId;
  console.log(`🏢 [Income Routes] Processing request for tenant: ${req.tenantId}`);
  next();
};

// Apply tenant ID middleware to all income routes
router.use(handleTenantId);

// ========================================================
// ✅ GET ALL ACTIVE INCOME RECORDS
// ========================================================
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page = 1, limit = 100, category, startDate, endDate, sortBy = 'date', sortOrder = 'desc' } = req.query;

    console.log(`📥 [GET /income] Fetching incomes for tenant: ${tenantId}`);

    // Build query
    const query = {
      tenantId: tenantId,
      isDeleted: { $ne: true }
    };

    // Optional filters
    if (category) {
      query.category = category;
    }

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

    const incomes = await Income.find(query)
      .sort(sortConfig)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Income.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    console.log(`✅ [GET /income] Found ${incomes.length} income records for tenant ${tenantId}`);

    res.status(200).json(incomes); // Return array directly for frontend compatibility
  } catch (error) {
    console.error('❌ [GET /income] Error fetching incomes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income records',
      error: error.message
    });
  }
});

// ========================================================
// ✅ GET DELETED INCOME HISTORY
// ========================================================
router.get('/history', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    console.log(`📥 [GET /income/history] Fetching deleted incomes for tenant: ${tenantId}`);

    const deletedIncomes = await Income.find({
      tenantId: tenantId,
      isDeleted: true
    })
      .sort({ deletedAt: -1, updatedAt: -1 })
      .limit(50)
      .lean();

    console.log(`✅ [GET /income/history] Found ${deletedIncomes.length} deleted income records`);

    res.status(200).json({
      success: true,
      data: deletedIncomes,
      count: deletedIncomes.length
    });
  } catch (error) {
    console.error('❌ [GET /income/history] Error fetching income history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income history',
      error: error.message
    });
  }
});

// ========================================================
// ✅ GET INCOME STATISTICS
// ========================================================
router.get('/stats/summary', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate } = req.query;

    console.log(`📊 [GET /income/stats/summary] Fetching stats for tenant: ${tenantId}`);

    const query = {
      tenantId: tenantId,
      isDeleted: { $ne: true }
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const incomes = await Income.find(query).lean();

    const totalIncome = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    // Category breakdown
    const categoryBreakdown = incomes.reduce((acc, inc) => {
      const cat = inc.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = { total: 0, count: 0 };
      }
      acc[cat].total += inc.amount || 0;
      acc[cat].count += 1;
      return acc;
    }, {});

    // Payment mode breakdown
    const paymentModeBreakdown = incomes.reduce((acc, inc) => {
      const mode = inc.paymentMode || 'Other';
      if (!acc[mode]) {
        acc[mode] = { total: 0, count: 0 };
      }
      acc[mode].total += inc.amount || 0;
      acc[mode].count += 1;
      return acc;
    }, {});

    // Monthly breakdown
    const monthlyBreakdown = incomes.reduce((acc, inc) => {
      const date = new Date(inc.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthYear]) {
        acc[monthYear] = { income: 0, count: 0 };
      }
      acc[monthYear].income += inc.amount || 0;
      acc[monthYear].count += 1;
      return acc;
    }, {});

    console.log(`✅ [GET /income/stats/summary] Stats calculated for tenant ${tenantId}`);

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        incomeCount: incomes.length,
        categoryBreakdown,
        paymentModeBreakdown,
        monthlyBreakdown
      }
    });
  } catch (error) {
    console.error('❌ [GET /income/stats/summary] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income statistics',
      error: error.message
    });
  }
});

// ========================================================
// ✅ GET SINGLE INCOME RECORD
// ========================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    console.log(`🔍 [GET /income/:id] Fetching income ${id} for tenant: ${tenantId}`);

    const income = await Income.findOne({
      _id: id,
      tenantId: tenantId,
      isDeleted: { $ne: true }
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found'
      });
    }

    console.log(`✅ [GET /income/:id] Found income record: ${id}`);

    res.status(200).json({
      success: true,
      data: income
    });
  } catch (error) {
    console.error('❌ [GET /income/:id] Error fetching income:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income record',
      error: error.message
    });
  }
});

// ========================================================
// ✅ CREATE NEW INCOME RECORD
// ========================================================
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    console.log(`📝 [POST /income] Creating income for tenant: ${tenantId}`);
    console.log(`📦 [POST /income] Request body:`, req.body);

    const { date, amount, category, subCategory, description, paymentMode, source, remarks, tags } = req.body;

    // Validate required fields
    if (!date || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date, amount, category'
      });
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    const incomeData = {
      tenantId: tenantId,
      date: new Date(date),
      type: 'income',
      amount: parseFloat(amount),
      category: category.trim(),
      subCategory: subCategory?.trim() || '',
      description: description?.trim() || '',
      paymentMode: paymentMode?.trim() || 'Other',
      source: source?.trim() || '',
      remarks: remarks?.trim() || '',
      tags: tags || [],
      status: 'received',
      isDeleted: false
    };

    const income = await Income.create(incomeData);

    console.log(`✅ [POST /income] Income created: ${income._id}`);

    res.status(201).json({
      success: true,
      data: income,
      message: 'Income record created successfully'
    });
  } catch (error) {
    console.error('❌ [POST /income] Error creating income:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create income record',
      error: error.message
    });
  }
});

// ========================================================
// ✅ UPDATE INCOME RECORD
// ========================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    console.log(`✏️ [PUT /income/:id] Updating income ${id} for tenant: ${tenantId}`);

    // Validate amount if provided
    if (req.body.amount && (isNaN(req.body.amount) || parseFloat(req.body.amount) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    const updateData = { ...req.body };

    // Handle date conversion if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    // Handle amount conversion if provided
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }

    // Trim string fields
    if (updateData.category) updateData.category = updateData.category.trim();
    if (updateData.subCategory) updateData.subCategory = updateData.subCategory.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.paymentMode) updateData.paymentMode = updateData.paymentMode.trim();

    const income = await Income.findOneAndUpdate(
      { _id: id, tenantId: tenantId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found or access denied'
      });
    }

    console.log(`✅ [PUT /income/:id] Income updated: ${id}`);

    res.status(200).json({
      success: true,
      data: income,
      message: 'Income record updated successfully'
    });
  } catch (error) {
    console.error('❌ [PUT /income/:id] Error updating income:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update income record',
      error: error.message
    });
  }
});

// ========================================================
// ✅ RESTORE DELETED INCOME RECORD
// ========================================================
router.put('/restore/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    console.log(`🔄 [PUT /income/restore/:id] Restoring income ${id} for tenant: ${tenantId}`);

    const income = await Income.findOneAndUpdate(
      { _id: id, tenantId: tenantId, isDeleted: true },
      { 
        isDeleted: false, 
        deletedAt: null 
      },
      { new: true }
    );

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Deleted income record not found'
      });
    }

    console.log(`✅ [PUT /income/restore/:id] Income restored: ${id}`);

    res.status(200).json({
      success: true,
      data: income,
      message: 'Income record restored successfully'
    });
  } catch (error) {
    console.error('❌ [PUT /income/restore/:id] Error restoring income:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to restore income record',
      error: error.message
    });
  }
});

// ========================================================
// ✅ SOFT DELETE INCOME RECORD
// ========================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    console.log(`🗑️ [DELETE /income/:id] Soft deleting income ${id} for tenant: ${tenantId}`);

    const income = await Income.findOneAndUpdate(
      { _id: id, tenantId: tenantId },
      { 
        isDeleted: true, 
        deletedAt: new Date() 
      },
      { new: true }
    );

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found or access denied'
      });
    }

    console.log(`✅ [DELETE /income/:id] Income soft deleted: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Income record deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('❌ [DELETE /income/:id] Error deleting income:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete income record',
      error: error.message
    });
  }
});

// ========================================================
// ✅ PERMANENT DELETE INCOME RECORD
// ========================================================
router.delete('/permanent-delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    console.log(`💥 [DELETE /income/permanent-delete/:id] Permanently deleting income ${id} for tenant: ${tenantId}`);

    const income = await Income.findOneAndDelete({
      _id: id,
      tenantId: tenantId
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found or access denied'
      });
    }

    console.log(`✅ [DELETE /income/permanent-delete/:id] Income permanently deleted: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Income record permanently deleted',
      id: id
    });
  } catch (error) {
    console.error('❌ [DELETE /income/permanent-delete/:id] Error permanently deleting income:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to permanently delete income record',
      error: error.message
    });
  }
});

export default router;