// backend/routes/investmentRoutes.js
import express from 'express';
import Investment from '../models/Investment.js';
import Project from '../models/Project.js';
import UserIncome from '../models/UserIncome.js';
import axios from 'axios';
import { 
  getTaxSavingRecommendations,
  calculateIncomeTax
} from '../services/taxService.js';
import { protect, tenantMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

// Investment categories and types
const INVESTMENT_CATEGORIES = {
  'equity': {
    name: 'Equity Investments',
    description: 'Stock market and equity-related investments',
    risk: 'high',
    potentialReturn: 'high',
    lockInPeriod: 0,
    taxBenefits: false
  },
  'debt': {
    name: 'Debt Instruments',
    description: 'Fixed income and debt-based investments',
    risk: 'low',
    potentialReturn: 'medium',
    lockInPeriod: 0,
    taxBenefits: false
  },
  'mutual_funds': {
    name: 'Mutual Funds',
    description: 'Professionally managed investment funds',
    risk: 'medium',
    potentialReturn: 'medium',
    lockInPeriod: 0,
    taxBenefits: false
  },
  'elss': {
    name: 'ELSS Funds',
    description: 'Equity Linked Savings Scheme with tax benefits',
    risk: 'high',
    potentialReturn: 'high',
    lockInPeriod: 3,
    taxBenefits: true,
    section: '80C',
    maxLimit: 150000
  },
  'ppf': {
    name: 'Public Provident Fund',
    description: 'Government-backed long-term savings scheme',
    risk: 'low',
    potentialReturn: 'medium',
    lockInPeriod: 15,
    taxBenefits: true,
    section: '80C',
    maxLimit: 150000
  },
  'nps': {
    name: 'National Pension System',
    description: 'Voluntary retirement savings scheme',
    risk: 'medium',
    potentialReturn: 'medium',
    lockInPeriod: 'until retirement',
    taxBenefits: true,
    section: '80CCD',
    maxLimit: 50000
  },
  'insurance': {
    name: 'Life Insurance',
    description: 'Insurance policies with investment component',
    risk: 'low',
    potentialReturn: 'low',
    lockInPeriod: 'policy term',
    taxBenefits: true,
    section: '80C',
    maxLimit: 150000
  },
  'fd': {
    name: 'Tax Saving FD',
    description: 'Fixed deposits with tax benefits',
    risk: 'low',
    potentialReturn: 'low',
    lockInPeriod: 5,
    taxBenefits: true,
    section: '80C',
    maxLimit: 150000
  },
  'real_estate': {
    name: 'Real Estate',
    description: 'Property and real estate investments',
    risk: 'medium',
    potentialReturn: 'high',
    lockInPeriod: 0,
    taxBenefits: true,
    section: 'multiple'
  },
  'gold': {
    name: 'Gold Investments',
    description: 'Physical gold and gold-based instruments',
    risk: 'medium',
    potentialReturn: 'medium',
    lockInPeriod: 0,
    taxBenefits: false
  }
};

// Get investment categories
router.get('/categories', protect, tenantMiddleware, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: INVESTMENT_CATEGORIES
    });
  } catch (error) {
    console.error('❌ Error fetching investment categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investment categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get tax saving recommendations based on income
router.post('/tax-saving-recommendations', protect, tenantMiddleware, async (req, res) => {
  try {
    const { incomeData } = req.body;

    if (!incomeData) {
      return res.status(400).json({
        success: false,
        message: 'Income data is required for tax saving recommendations'
      });
    }

    console.log('💡 Generating tax saving investment recommendations...');
    
    const recommendations = await getTaxSavingRecommendations(incomeData, req.tenantId);
    
    res.status(200).json({
      success: true,
      data: recommendations,
      message: 'Tax saving recommendations generated'
    });
  } catch (error) {
    console.error('❌ Error generating tax saving recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate tax saving recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new investment
router.post('/', protect, tenantMiddleware, async (req, res) => {
  try {
    const { 
      projectId, 
      investmentType, 
      amount, 
      date, 
      description, 
      expectedReturn,
      riskLevel,
      lockInPeriod,
      taxBenefits,
      investmentDetails 
    } = req.body;

    // Validate required fields
    if (!projectId || !investmentType || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: projectId, investmentType, amount, date'
      });
    }

    // Validate investment type
    if (!INVESTMENT_CATEGORIES[investmentType]) {
      return res.status(400).json({
        success: false,
        message: `Invalid investment type. Must be one of: ${Object.keys(INVESTMENT_CATEGORIES).join(', ')}`
      });
    }

    // Check if project exists and belongs to tenant
    const project = await Project.findOne({
      _id: projectId,
      tenantId: req.tenantId,
      isDeleted: false
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Prepare investment data
    const investmentData = {
      projectId,
      investmentType,
      amount: parseFloat(amount),
      date: new Date(date),
      description,
      expectedReturn: expectedReturn || INVESTMENT_CATEGORIES[investmentType].potentialReturn,
      riskLevel: riskLevel || INVESTMENT_CATEGORIES[investmentType].risk,
      lockInPeriod: lockInPeriod || INVESTMENT_CATEGORIES[investmentType].lockInPeriod,
      taxBenefits: taxBenefits !== undefined ? taxBenefits : INVESTMENT_CATEGORIES[investmentType].taxBenefits,
      tenantId: req.tenantId,
      createdBy: req.user.id
    };

    // Add investment-specific details
    if (investmentDetails) {
      investmentData.investmentDetails = investmentDetails;
    }

    const investment = new Investment(investmentData);
    await investment.save();

    // Update project's investmentIds array
    await Project.findByIdAndUpdate(projectId, {
      $push: { investmentIds: investment._id }
    });

    res.status(201).json({
      success: true,
      data: investment,
      message: 'Investment created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating investment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create investment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all investments for tenant
router.get('/', protect, tenantMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      investmentType, 
      projectId,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;
    
    const filter = { tenantId: req.tenantId };
    
    if (investmentType) filter.investmentType = investmentType;
    if (projectId) filter.projectId = projectId;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const investments = await Investment.find(filter)
      .populate('projectId', 'name color')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Investment.countDocuments(filter);

    // Calculate summary statistics
    const totalInvestment = await Investment.aggregate([
      { $match: filter },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);

    const investmentByType = await Investment.aggregate([
      { $match: filter },
      { 
        $group: { 
          _id: '$investmentType', 
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        } 
      }
    ]);

    res.status(200).json({
      success: true,
      data: investments,
      summary: {
        totalInvestment: totalInvestment[0]?.totalAmount || 0,
        totalInvestments: total,
        investmentByType
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching investments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get single investment
router.get('/:id', protect, tenantMiddleware, async (req, res) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    }).populate('projectId', 'name color');

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: investment
    });
  } catch (error) {
    console.error('❌ Error fetching investment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update investment
router.put('/:id', protect, tenantMiddleware, async (req, res) => {
  try {
    const investment = await Investment.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId: req.tenantId
      },
      req.body,
      { new: true, runValidators: true }
    ).populate('projectId', 'name color');

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: investment,
      message: 'Investment updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating investment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update investment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete investment
router.delete('/:id', protect, tenantMiddleware, async (req, res) => {
  try {
    const investment = await Investment.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    // Remove from project's investmentIds array
    await Project.findByIdAndUpdate(investment.projectId, {
      $pull: { investmentIds: investment._id }
    });

    res.status(200).json({
      success: true,
      message: 'Investment deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting investment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete investment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get investment portfolio summary
router.get('/portfolio/summary', protect, tenantMiddleware, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const portfolioSummary = await Investment.aggregate([
      {
        $match: {
          tenantId: req.tenantId,
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: '$investmentType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      {
        $project: {
          investmentType: '$_id',
          totalAmount: 1,
          count: 1,
          averageAmount: 1,
          _id: 0
        }
      }
    ]);

    const totalPortfolioValue = portfolioSummary.reduce((sum, item) => sum + item.totalAmount, 0);

    // Add category details and percentages
    const detailedSummary = portfolioSummary.map(item => ({
      ...item,
      category: INVESTMENT_CATEGORIES[item.investmentType],
      percentage: totalPortfolioValue > 0 ? (item.totalAmount / totalPortfolioValue) * 100 : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: detailedSummary,
        totalPortfolioValue,
        totalInvestments: detailedSummary.reduce((sum, item) => sum + item.count, 0),
        year: parseInt(year)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching portfolio summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Proxy market-data so frontend can call under /api/investment/market-data
router.get('/market-data', protect, tenantMiddleware, async (req, res) => {
  try {
    const host = `${req.protocol}://${req.get('host')}`;
    const url = `${host}/api/market-data`;
    const headers = {
      Authorization: req.headers.authorization,
      'Tenant-Id': req.tenantId
    };

    console.log('📊 Fetching market data from:', url);
    const response = await axios.get(url, { 
      headers,
      timeout: 30000 
    });
    
    // Normalize to same wrapper shape used elsewhere in the API
    const marketData = Array.isArray(response.data)
      ? response.data
      : (response.data.marketData || response.data.data || []);
    
    console.log('✅ Market data fetched successfully, count:', marketData?.length || 0);
    res.status(200).json({ success: true, data: marketData });
  } catch (error) {
    console.error('❌ Error proxying market-data from /api/investment/market-data:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch market data', 
      error: error.message || 'Internal error',
      details: error.response?.data?.message || error.response?.data?.error
    });
  }
});

// Provide AI predictions by delegating to the market-data suggestions endpoint
router.get('/predictions', protect, tenantMiddleware, async (req, res) => {
  try {
    const host = `${req.protocol}://${req.get('host')}`;
    const marketUrl = `${host}/api/market-data`;
    const suggestionsUrl = `${host}/api/market-data/suggestions`;
    const headers = {
      Authorization: req.headers.authorization,
      'Tenant-Id': req.tenantId,
      'Content-Type': 'application/json'
    };

    console.log('🔮 Fetching market data for predictions from:', marketUrl);
    const marketResp = await axios.get(marketUrl, { 
      headers,
      timeout: 30000 
    });
    
    const marketData = Array.isArray(marketResp.data) 
      ? marketResp.data 
      : (marketResp.data.marketData || marketResp.data.data || []);

    console.log('💡 Fetching AI suggestions from:', suggestionsUrl);
    const suggestionsResp = await axios.post(suggestionsUrl, { marketData }, { 
      headers,
      timeout: 30000 
    });

    // Normalize response to the shape frontend expects
    console.log('✅ Predictions generated successfully');
    res.status(200).json({ success: true, data: { suggestion: suggestionsResp.data, marketData } });
  } catch (error) {
    console.error('❌ Error generating predictions:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate predictions', 
      error: error.message || 'Internal error',
      details: error.response?.data?.message || error.response?.data?.error
    });
  }
});

// Return the authenticated user's income profile and calculated tax
router.get('/user-income', protect, tenantMiddleware, async (req, res) => {
  try {
    console.log('💰 Fetching user income for tenant:', req.tenantId, 'user:', req.user._id);
    
    const userIncome = await UserIncome.findOne({ tenantId: req.tenantId, userId: req.user._id });

    if (!userIncome) {
      console.log('⚠️ User income profile not found for tenant:', req.tenantId);
      return res.status(404).json({ success: false, message: 'User income profile not found' });
    }

    console.log('🧮 Calculating tax for user income');
    const taxInfo = await calculateIncomeTax(userIncome.toObject(), req.tenantId);

    console.log('✅ User income and tax calculated successfully');
    res.status(200).json({ success: true, data: { userIncome, taxInfo } });
  } catch (error) {
    console.error('❌ Error fetching user income or calculating tax:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user income', 
      error: error.message || 'Internal error'
    });
  }
});

// Calculate tax savings from investments
router.post('/calculate-tax-savings', protect, tenantMiddleware, async (req, res) => {
  try {
    const { incomeData, investmentsData } = req.body;

    if (!incomeData || !investmentsData) {
      return res.status(400).json({
        success: false,
        message: 'Income data and investments data are required'
      });
    }

    console.log('🧮 Calculating tax savings from investments...');

    // Calculate tax without investments
    const taxWithoutInvestments = await calculateIncomeTax(incomeData, req.tenantId);

    // Calculate tax with investments
    const totalSection80C = investmentsData
      .filter(inv => INVESTMENT_CATEGORIES[inv.type]?.section === '80C')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalSection80CCD = investmentsData
      .filter(inv => INVESTMENT_CATEGORIES[inv.type]?.section === '80CCD')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const incomeWithDeductions = {
      ...incomeData,
      deductions: (incomeData.deductions || 0) + Math.min(totalSection80C, 150000),
      investments: (incomeData.investments || 0) + Math.min(totalSection80CCD, 50000)
    };

    const taxWithInvestments = await calculateIncomeTax(incomeWithDeductions, req.tenantId);

    const taxSavings = taxWithoutInvestments.taxAmount - taxWithInvestments.taxAmount;

    res.status(200).json({
      success: true,
      data: {
        taxWithoutInvestments,
        taxWithInvestments,
        taxSavings,
        investmentSummary: {
          section80C: {
            totalInvestment: totalSection80C,
            maxLimit: 150000,
            utilized: Math.min(totalSection80C, 150000)
          },
          section80CCD: {
            totalInvestment: totalSection80CCD,
            maxLimit: 50000,
            utilized: Math.min(totalSection80CCD, 50000)
          }
        }
      },
      message: 'Tax savings calculation completed'
    });
  } catch (error) {
    console.error('❌ Error calculating tax savings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate tax savings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get investment performance report
router.get('/reports/performance', protect, tenantMiddleware, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    // Mock performance data - in real app, this would come from actual investment performance
    const performanceReport = {
      year: parseInt(year),
      overallReturn: 12.5,
      totalValue: 1250000,
      monthlyPerformance: [
        { month: 'Jan', return: 2.1, value: 1021000 },
        { month: 'Feb', return: 1.8, value: 1039500 },
        { month: 'Mar', return: -0.5, value: 1034300 },
        { month: 'Apr', return: 3.2, value: 1067400 },
        { month: 'May', return: 2.5, value: 1094100 },
        { month: 'Jun', return: 1.2, value: 1107200 },
        { month: 'Jul', return: 4.1, value: 1152600 },
        { month: 'Aug', return: 2.8, value: 1184900 },
        { month: 'Sep', return: -1.2, value: 1170700 },
        { month: 'Oct', return: 3.5, value: 1211700 },
        { month: 'Nov', return: 2.2, value: 1238300 },
        { month: 'Dec', return: 1.0, value: 1250000 }
      ],
      bestPerforming: [
        { type: 'elss', return: 18.5, amount: 300000 },
        { type: 'equity', return: 15.2, amount: 450000 },
        { type: 'mutual_funds', return: 12.8, amount: 250000 }
      ],
      worstPerforming: [
        { type: 'fd', return: 6.5, amount: 150000 },
        { type: 'debt', return: 8.2, amount: 100000 }
      ]
    };

    res.status(200).json({
      success: true,
      data: performanceReport
    });
  } catch (error) {
    console.error('❌ Error fetching performance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;