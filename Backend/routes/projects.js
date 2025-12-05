import express from 'express';
import Project from '../models/Project.js';
import { protect, tenantMiddleware, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply optional auth (allow guest/unauthenticated reads) and tenant middleware to all routes
router.use(optionalAuth);
router.use(tenantMiddleware);

// 🔧 FIX: Add support for both singular and plural endpoints
router.use('/project', (req, res, next) => {
  // Redirect singular '/project' to plural '/projects'
  req.originalUrl = req.originalUrl.replace('/project', '/projects');
  req.url = req.url.replace('/project', '/projects');
  next();
});

// ✅ CREATE PROJECT - FIXED: Proper response structure
router.post('/', protect, async (req, res) => {
  try {
    console.log('📥 Creating project with data:', req.body);
    console.log('👤 User ID:', req.user?.id);
    console.log('🏢 Tenant ID:', req.tenantId);
    
    const { name, description, budget, currency = 'INR', status = 'active' } = req.body;
    
    // Enhanced validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required"
      });
    }

    if (!budget || isNaN(budget) || Number(budget) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid budget amount is required"
      });
    }

    const projectData = {
      name: name.trim(),
      description: description?.trim() || '',
      budget: Number(budget),
      currency: currency.toUpperCase(),
      status,
      createdBy: req.user.id,
      tenantId: req.tenantId,
      income: [],
      expenses: [],
      tax: [],
      progressData: {
        timeline: [],
        milestones: [],
        financialProgress: {
          totalBudget: Number(budget),
          spent: 0,
          remaining: Number(budget),
          percentage: 0
        },
        completionRate: 0,
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('📋 Project data to save:', projectData);

    const project = new Project(projectData);
    await project.save();
    
    console.log('✅ Project created successfully:', project._id);
    
    // FIXED: Return the complete project object in the response
    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project // Ensure this includes the full project data
    });
  } catch (error) {
    console.error('❌ Error creating project:', error);
    
    // Handle duplicate project names
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Project name already exists for this tenant"
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Error creating project",
      error: error.message
    });
  }
});

// ✅ GET ALL PROJECTS - FIXED: Proper response structure and filtering
router.get('/', async (req, res) => {
  try {
    console.log('📥 Fetching projects for tenant:', req.tenantId);
    console.log('👤 User:', req.user?.id ? 'Authenticated' : 'Unauthenticated');
    
    const { status, page = 1, limit = 100, search } = req.query;
    
    // Build filter object
    const filter = {
      tenantId: req.tenantId,
      isDeleted: false
    };

    // Only filter by creator when the request is authenticated
    if (req.user && req.user.id) {
      filter.createdBy = req.user.id;
      console.log('🔍 Filtering by user:', req.user.id);
    } else {
      console.log('🔍 No user filter (unauthenticated request)');
    }
    
    // Add status filter if provided
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Add search filter if provided
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    console.log('🔍 Final filter:', filter);
    
    const skip = (page - 1) * limit;
    
    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalProjects = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalProjects / limit);
    
    console.log(`✅ Found ${projects.length} projects out of ${totalProjects} total`);
    
    // FIXED: Return projects array directly in data field for frontend compatibility
    res.status(200).json({
      success: true,
      data: projects, // Direct array of projects
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProjects,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching projects",
      error: error.message
    });
  }
});

// ✅ GET SINGLE PROJECT
router.get('/:id', protect, async (req, res) => {
  try {
    console.log('📥 Fetching project:', req.params.id);
    
    const project = await Project.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
      createdBy: req.user.id,
      isDeleted: false
    });

    if (!project) {
      console.log('❌ Project not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    console.log('✅ Project found:', project.name);
    
    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('❌ Error fetching project:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Error fetching project",
      error: error.message
    });
  }
});

// ✅ UPDATE PROJECT
router.put('/:id', protect, async (req, res) => {
  try {
    console.log('📥 Updating project:', req.params.id);
    
    const { name, description, budget, status, currency } = req.body;
    
    // Validate budget if provided
    if (budget && (isNaN(budget) || Number(budget) <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Valid budget amount is required"
      });
    }
    
    const updateData = {
      updatedAt: new Date()
    };
    
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (budget) updateData.budget = Number(budget);
    if (status) updateData.status = status;
    if (currency) updateData.currency = currency.toUpperCase();

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenantId,
        createdBy: req.user.id,
        isDeleted: false
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    console.log('✅ Project updated successfully');
    
    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project
    });
  } catch (error) {
    console.error('❌ Error updating project:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors
      });
    }
    
    // Handle duplicate project names
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Project name already exists for this tenant"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Error updating project",
      error: error.message
    });
  }
});

// ✅ DELETE PROJECT (Soft Delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    console.log('📥 Deleting project:', req.params.id);
    
    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenantId,
        createdBy: req.user.id,
        isDeleted: false // Only update if not already deleted
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or already deleted"
      });
    }

    console.log('✅ Project deleted successfully');
    
    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      data: {
        id: project._id,
        name: project.name,
        deletedAt: project.deletedAt
      }
    });
  } catch (error) {
    console.error('❌ Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: "Error deleting project",
      error: error.message
    });
  }
});

// ✅ ADD TRANSACTION TO PROJECT
router.post('/:projectId/transactions', protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type, description, amount, category, date } = req.body;

    console.log(`📥 Adding ${type} transaction to project:`, projectId);

    if (!['income', 'expenses', 'tax'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type. Must be 'income', 'expenses', or 'tax'"
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Transaction description is required"
      });
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid positive amount is required"
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      tenantId: req.tenantId,
      createdBy: req.user.id,
      isDeleted: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const transaction = {
      description: description.trim(),
      amount: Number(amount),
      category: category?.trim() || 'General',
      date: date ? new Date(date) : new Date(),
      createdAt: new Date(),
      createdBy: req.user.id
    };

    project[type].push(transaction);
    project.updatedAt = new Date();
    
    // Recalculate financial progress
    await updateProjectFinancials(project);
    
    await project.save();

    console.log(`✅ ${type} transaction added successfully`);
    
    res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      data: {
        transaction,
        financialProgress: project.progressData.financialProgress
      }
    });
  } catch (error) {
    console.error('❌ Error adding transaction:', error);
    res.status(500).json({
      success: false,
      message: "Error adding transaction",
      error: error.message
    });
  }
});

// ✅ GET TRANSACTIONS FOR PROJECT
router.get('/:projectId/transactions', protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type, category, startDate, endDate, page = 1, limit = 50 } = req.query;

    console.log(`📥 Fetching transactions for project:`, projectId);

    const project = await Project.findOne({
      _id: projectId,
      tenantId: req.tenantId,
      createdBy: req.user.id,
      isDeleted: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    let transactions = [];
    
    // Filter by type if specified
    if (type && ['income', 'expenses', 'tax'].includes(type)) {
      transactions = project[type].map(t => ({ ...t.toObject(), type }));
    } else {
      // Combine all transaction types
      transactions = [
        ...project.income.map(t => ({ ...t.toObject(), type: 'income' })),
        ...project.expenses.map(t => ({ ...t.toObject(), type: 'expenses' })),
        ...project.tax.map(t => ({ ...t.toObject(), type: 'tax' }))
      ];
    }

    // Apply filters
    if (category) {
      transactions = transactions.filter(t => 
        t.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      transactions = transactions.filter(t => new Date(t.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      transactions = transactions.filter(t => new Date(t.date) <= end);
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));

    console.log(`✅ Found ${transactions.length} transactions`);
    
    res.status(200).json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        summary: {
          totalTransactions: transactions.length,
          totalIncome: project.income.reduce((sum, item) => sum + (item.amount || 0), 0),
          totalExpenses: project.expenses.reduce((sum, item) => sum + (item.amount || 0), 0),
          totalTax: project.tax.reduce((sum, item) => sum + (item.amount || 0), 0)
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(transactions.length / limit),
          totalTransactions: transactions.length,
          hasNext: skip + paginatedTransactions.length < transactions.length,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message
    });
  }
});

// ✅ GET AI SUGGESTIONS
router.get('/:projectId/ai-suggestions', protect, async (req, res) => {
  try {
    console.log('📥 Generating AI suggestions for project:', req.params.projectId);
    
    const project = await Project.findOne({
      _id: req.params.projectId,
      tenantId: req.tenantId,
      createdBy: req.user.id,
      isDeleted: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const totalIncome = project.income.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = project.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalTax = project.tax.reduce((sum, item) => sum + (item.amount || 0), 0);
    const netBalance = totalIncome - totalExpenses - totalTax;
    const progress = project.budget ? Math.min((totalIncome / project.budget) * 100, 100) : 0;

    // Enhanced AI Analysis Logic
    const suggestions = [];

    // Expense reduction suggestions
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    if (expenseRatio > 60 && totalIncome > 0) {
      suggestions.push({
        type: 'expense_reduction',
        title: 'Reduce High Expenses',
        description: `Your expenses represent ${expenseRatio.toFixed(1)}% of your income. Consider optimizing recurring costs.`,
        priority: expenseRatio > 80 ? 'high' : 'medium',
        action: 'review_expenses',
        impact: 'high'
      });
    }

    // Income optimization
    if (progress < 50 && project.budget > 0) {
      suggestions.push({
        type: 'income_boost',
        title: 'Boost Income Sources',
        description: `You're at ${progress.toFixed(1)}% of your budget goal. Explore additional income streams.`,
        priority: progress < 25 ? 'high' : 'medium',
        action: 'add_income_sources',
        impact: 'medium'
      });
    }

    // Tax optimization
    if (totalIncome > 0) {
      const estimatedTax = totalIncome * 0.15;
      const currentTaxRatio = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;
      
      suggestions.push({
        type: 'tax_optimization',
        title: 'Tax Planning',
        description: `Estimated tax liability: ${project.currency} ${estimatedTax.toFixed(2)}. Current tax ratio: ${currentTaxRatio.toFixed(1)}%.`,
        priority: currentTaxRatio > 20 ? 'high' : 'medium',
        action: 'review_tax_strategy',
        impact: 'medium'
      });
    }

    // Budget alignment
    const budgetUtilization = project.budget ? (totalExpenses / project.budget) * 100 : 0;
    if (netBalance < project.budget * 0.1 && project.budget > 0) {
      suggestions.push({
        type: 'budget_alignment',
        title: 'Budget Review Needed',
        description: `Budget utilization: ${budgetUtilization.toFixed(1)}%. Your net balance is low relative to budget.`,
        priority: 'high',
        action: 'adjust_budget',
        impact: 'high'
      });
    }

    // Cash flow suggestions
    if (netBalance < 0) {
      suggestions.push({
        type: 'cash_flow',
        title: 'Negative Cash Flow',
        description: `Your project has negative cash flow of ${project.currency} ${Math.abs(netBalance).toFixed(2)}.`,
        priority: 'high',
        action: 'improve_cash_flow',
        impact: 'high'
      });
    }

    // Positive reinforcement
    if (netBalance > project.budget * 0.3 && progress > 75) {
      suggestions.push({
        type: 'positive',
        title: 'Excellent Progress',
        description: 'Your project is performing well! Keep up the good financial management.',
        priority: 'low',
        action: 'continue_current_strategy',
        impact: 'low'
      });
    }

    // Default suggestion if no others
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'general',
        title: 'Monitor Progress',
        description: 'Continue tracking your income and expenses to maintain financial health.',
        priority: 'low',
        action: 'continue_monitoring',
        impact: 'low'
      });
    }

    // Sort suggestions by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    console.log(`✅ Generated ${suggestions.length} AI suggestions`);
    
    res.status(200).json({
      success: true,
      data: {
        projectSummary: {
          totalIncome,
          totalExpenses,
          totalTax,
          netBalance,
          progress: Math.round(progress),
          budget: project.budget,
          currency: project.currency,
          expenseRatio: Math.round(expenseRatio),
          budgetUtilization: Math.round(budgetUtilization)
        },
        suggestions,
        riskAssessment: netBalance < 0 ? 'high' : netBalance < project.budget * 0.2 ? 'medium' : 'low',
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error generating AI suggestions:', error);
    res.status(500).json({
      success: false,
      message: "Error generating AI suggestions",
      error: error.message
    });
  }
});

// ✅ GET PROJECT ANALYTICS
router.get('/:projectId/analytics', protect, async (req, res) => {
  try {
    console.log('📥 Getting analytics for project:', req.params.projectId);
    
    const project = await Project.findOne({
      _id: req.params.projectId,
      tenantId: req.tenantId,
      createdBy: req.user.id,
      isDeleted: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const totalIncome = project.income.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = project.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalTax = project.tax.reduce((sum, item) => sum + (item.amount || 0), 0);
    const netAmount = totalIncome - totalExpenses - totalTax;
    const budgetUtilization = project.budget ? (totalExpenses / project.budget) * 100 : 0;

    // Enhanced categorization with trends
    const categorizeTransactions = (transactions) => {
      const categories = {};
      transactions.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        if (!categories[category]) {
          categories[category] = {
            total: 0,
            count: 0,
            average: 0,
            transactions: []
          };
        }
        categories[category].total += transaction.amount || 0;
        categories[category].count += 1;
        categories[category].transactions.push(transaction);
        categories[category].average = categories[category].total / categories[category].count;
      });
      return categories;
    };

    // Monthly trends
    const getMonthlyTrends = (transactions) => {
      const monthly = {};
      transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthly[monthYear]) {
          monthly[monthYear] = {
            total: 0,
            count: 0
          };
        }
        monthly[monthYear].total += transaction.amount || 0;
        monthly[monthYear].count += 1;
      });
      return monthly;
    };

    const analytics = {
      summary: {
        totalIncome,
        totalExpenses,
        totalTax,
        netAmount,
        budgetUtilization: Math.round(budgetUtilization),
        profitMargin: totalIncome > 0 ? Math.round((netAmount / totalIncome) * 100) : 0,
        transactionCount: project.income.length + project.expenses.length + project.tax.length,
        roi: project.budget ? ((netAmount / project.budget) * 100) : 0
      },
      categories: {
        income: categorizeTransactions(project.income),
        expenses: categorizeTransactions(project.expenses),
        tax: categorizeTransactions(project.tax)
      },
      trends: {
        income: getMonthlyTrends(project.income),
        expenses: getMonthlyTrends(project.expenses),
        tax: getMonthlyTrends(project.tax)
      },
      progress: project.progressData,
      currency: project.currency,
      generatedAt: new Date().toISOString()
    };

    console.log('✅ Analytics generated successfully');
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('❌ Error getting project analytics:', error);
    res.status(500).json({
      success: false,
      message: "Error getting project analytics",
      error: error.message
    });
  }
});

// ✅ GET PROJECT INSIGHTS
router.get('/:projectId/insights', protect, async (req, res) => {
  try {
    console.log('📥 Generating insights for project:', req.params.projectId);
    
    const project = await Project.findOne({
      _id: req.params.projectId,
      tenantId: req.tenantId,
      createdBy: req.user.id,
      isDeleted: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const totalIncome = project.income.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = project.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalTax = project.tax.reduce((sum, item) => sum + (item.amount || 0), 0);
    const netAmount = totalIncome - totalExpenses - totalTax;
    const budgetUtilization = project.budget ? (totalExpenses / project.budget) * 100 : 0;

    // Enhanced health score calculation (0-100)
    let healthScore = 50; // Base score

    // Positive factors
    if (netAmount > 0) healthScore += 20;
    if (budgetUtilization < 80) healthScore += 15;
    if (project.income.length >= 3) healthScore += 10; // Multiple income sources
    if (project.expenses.length > 0) healthScore += 5;
    if (netAmount > project.budget * 0.2) healthScore += 10; // Good profit margin
    if (project.status === 'completed') healthScore += 10;

    // Negative factors
    if (netAmount < 0) healthScore -= 25;
    if (budgetUtilization > 95) healthScore -= 20;
    if (project.income.length === 0) healthScore -= 15;
    if (totalExpenses > totalIncome * 0.8) healthScore -= 15;
    if (project.status === 'on_hold') healthScore -= 10;

    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    const insights = {
      healthScore,
      status: healthScore >= 75 ? 'excellent' : 
              healthScore >= 60 ? 'healthy' : 
              healthScore >= 40 ? 'needs_attention' : 'critical',
      financialMetrics: {
        totalIncome,
        totalExpenses,
        totalTax,
        netAmount,
        budgetUtilization: Math.round(budgetUtilization),
        profitMargin: totalIncome > 0 ? Math.round((netAmount / totalIncome) * 100) : 0,
        expenseRatio: totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0,
        taxEfficiency: totalIncome > 0 ? Math.round((totalTax / totalIncome) * 100) : 0
      },
      keyIndicators: {
        hasMultipleIncomeSources: project.income.length >= 3,
        isProfitable: netAmount > 0,
        withinBudget: budgetUtilization <= 100,
        hasRecentActivity: project.updatedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      generatedAt: new Date().toISOString()
    };

    console.log('✅ Insights generated successfully');
    
    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('❌ Error generating insights:', error);
    res.status(500).json({
      success: false,
      message: "Error generating insights",
      error: error.message
    });
  }
});

// ✅ HEALTH CHECK ENDPOINT
router.get('/health/check', async (req, res) => {
  try {
    const projectCount = await Project.countDocuments({
      tenantId: req.tenantId,
      createdBy: req.user?.id,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      message: "Projects service is healthy",
      data: {
        service: 'projects',
        status: 'operational',
        userProjects: projectCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Projects service health check failed",
      error: error.message
    });
  }
});

// Helper function to update project financials
async function updateProjectFinancials(project) {
  const totalIncome = project.income.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpenses = project.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalTax = project.tax.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  project.progressData.financialProgress = {
    totalBudget: project.budget,
    spent: totalExpenses,
    remaining: totalIncome - totalExpenses - totalTax,
    percentage: project.budget ? Math.min((totalExpenses / project.budget) * 100, 100) : 0
  };
  
  project.progressData.completionRate = project.budget ? Math.min((totalIncome / project.budget) * 100, 100) : 0;
  project.progressData.lastUpdated = new Date().toISOString();
}

export default router;