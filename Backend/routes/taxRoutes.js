// backend/routes/taxRoutes.js
import express from 'express';
import { 
  getCurrentTaxCalculation,
  getTaxRates,
  getAIRecommendations,
  getUpcomingDeadlines,
  calculateManualTax,
  resetToIncomeTax,
  getTaxSummary,
  getTaxReports,
  createTax,
  getTaxes,
  updateTax,
  deleteTax
} from '../controllers/taxController.js';
import { 
  analyzeBusinessForTaxes,
  calculateGST,
  calculateManualTax as calculateManualTaxService,
  getTaxComplianceCalendar,
  calculateIncomeTax,
  getTaxSavingRecommendations
} from '../services/taxService.js';
import { protect, tenantMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

console.log('🔧 Tax routes module loaded');

// Tax Types (No auth required for now - can add later)
router.get('/tax-types', (req, res) => {
  console.log('📋 GET /tax-types');
  // attempt to read tenant-specific tax types from TaxConfig
  import('../models/TaxConfig.js').then(({ default: TaxConfig }) => {
    (async () => {
      try {
        const tenantId = req.tenantId || undefined;
        const config = await TaxConfig.findOne({ tenantId }) || await TaxConfig.findOne({ tenantId: { $exists: false } });
        if (config && config.taxTypes && config.taxTypes.length) {
          return res.json({ success: true, data: config.taxTypes.map(t => t.name) });
        }

        const TAX_TYPES = [
          'GST',
          'Income Tax', 
          'Professional Tax',
          'TDS',
          'Property Tax',
          'Corporate Tax',
          'Capital Gains Tax',
          'Customs Duty',
          'Excise Duty',
          'Service Tax',
          'Other'
        ];

        res.json({ success: true, data: TAX_TYPES });
      } catch (err) {
        console.error('❌ Error fetching tax types from config:', err);
        res.json({ success: true, data: ['Income Tax', 'GST', 'Professional Tax', 'TDS', 'Other'] });
      }
    })();
  }).catch(err => {
    console.error('❌ Error loading TaxConfig model:', err);
    res.json({ success: true, data: ['Income Tax', 'GST', 'Professional Tax', 'TDS', 'Other'] });
  });
});

// Apply authentication and tenant middleware to protected routes
router.use(protect);
router.use(tenantMiddleware);

// Core Tax Calculation Routes
router.get('/current', (req, res, next) => {
  console.log('📊 GET /current - Request received');
  getCurrentTaxCalculation(req, res, next);
});

router.get('/rates', (req, res, next) => {
  console.log('📋 GET /rates - Request received');
  getTaxRates(req, res, next);
});

// Tenant/global tax config
router.get('/config', protect, tenantMiddleware, (req, res, next) => {
  console.log('📋 GET /config - Request received');
  // lazy require to avoid circular load issues
  const { getTaxConfig } = require('../controllers/taxController.js');
  getTaxConfig(req, res, next);
});

router.post('/config', protect, tenantMiddleware, (req, res, next) => {
  console.log('💾 POST /config - Request received');
  const { upsertTaxConfig } = require('../controllers/taxController.js');
  upsertTaxConfig(req, res, next);
});

router.get('/ai/recommendations', (req, res, next) => {
  console.log('🤖 GET /ai/recommendations - Request received');
  getAIRecommendations(req, res, next);
});

router.get('/upcoming-deadlines', (req, res, next) => {
  console.log('📅 GET /upcoming-deadlines - Request received');
  getUpcomingDeadlines(req, res, next);
});

router.get('/summary', (req, res, next) => {
  console.log('📊 GET /summary - Request received');
  getTaxSummary(req, res, next);
});

router.get('/reports', (req, res, next) => {
  console.log('📋 GET /reports - Request received');
  getTaxReports(req, res, next);
});

router.post('/calculate/manual', (req, res, next) => {
  console.log('🧮 POST /calculate/manual - Request received');
  calculateManualTax(req, res, next);
});

router.post('/reset', (req, res, next) => {
  console.log('🔄 POST /reset - Request received');
  resetToIncomeTax(req, res, next);
});

// Business Tax Analysis Routes
router.post('/analyze-business', async (req, res) => {
  try {
    console.log('🤖 POST /analyze-business - Request received');
    const { businessData } = req.body;

    if (!businessData) {
      return res.status(400).json({
        success: false,
        message: 'Business data is required for analysis'
      });
    }
    
    const taxAnalysis = await analyzeBusinessForTaxes(businessData, req.tenantId);
    
    res.status(200).json({
      success: true,
      data: taxAnalysis,
      message: 'Business tax analysis completed'
    });
  } catch (error) {
    console.error('❌ Error analyzing business:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze business for taxes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GST Calculation
router.post('/calculate/gst', async (req, res) => {
  try {
    console.log('🧮 POST /calculate/gst - Request received');
    const { transactionData, businessType, turnover, state } = req.body;

    if (!transactionData) {
      return res.status(400).json({
        success: false,
        message: 'Transaction data is required for GST calculation'
      });
    }
    
    const gstCalculation = await calculateGST(transactionData, businessType, turnover, state, req.tenantId);
    
    res.status(200).json({
      success: true,
      data: gstCalculation,
      message: 'GST calculation completed'
    });
  } catch (error) {
    console.error('❌ Error calculating GST:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate GST',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Income Tax Calculation
router.post('/calculate/income-tax', async (req, res) => {
  try {
    console.log('🧮 POST /calculate/income-tax - Request received');
    const { incomeData } = req.body;

    if (!incomeData) {
      return res.status(400).json({
        success: false,
        message: 'Income data is required for calculation'
      });
    }
    
    const incomeTaxCalculation = await calculateIncomeTax(incomeData, req.tenantId);
    
    res.status(200).json({
      success: true,
      data: incomeTaxCalculation,
      message: 'Income tax calculation completed'
    });
  } catch (error) {
    console.error('❌ Error calculating income tax:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate income tax',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Tax Saving Recommendations
router.post('/tax-saving-recommendations', async (req, res) => {
  try {
    console.log('💡 POST /tax-saving-recommendations - Request received');
    const { incomeData } = req.body;

    if (!incomeData) {
      return res.status(400).json({
        success: false,
        message: 'Income data is required for recommendations'
      });
    }
    
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

// Tax Compliance Calendar
router.get('/compliance-calendar', async (req, res) => {
  try {
    console.log('📅 GET /compliance-calendar - Request received');
    const { businessType, state } = req.query;
    
    const complianceCalendar = await getTaxComplianceCalendar(businessType, state, req.tenantId);
    
    res.status(200).json({
      success: true,
      data: complianceCalendar,
      message: 'Compliance calendar generated'
    });
  } catch (error) {
    console.error('❌ Error generating compliance calendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance calendar',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Tax Record CRUD Operations
router.post('/records', (req, res, next) => {
  console.log('📝 POST /records - Request received');
  createTax(req, res, next);
});

router.get('/records', (req, res, next) => {
  console.log('📋 GET /records - Request received');
  getTaxes(req, res, next);
});

router.get('/records/project/:projectId', (req, res, next) => {
  console.log(`📋 GET /records/project/${req.params.projectId} - Request received`);
  getTaxes(req, res, next);
});

router.put('/records/:id', (req, res, next) => {
  console.log(`✏️ PUT /records/${req.params.id} - Request received`);
  updateTax(req, res, next);
});

router.delete('/records/:id', (req, res, next) => {
  console.log(`🗑️ DELETE /records/${req.params.id} - Request received`);
  deleteTax(req, res, next);
});

console.log('✅ Tax routes registered successfully');

export default router;