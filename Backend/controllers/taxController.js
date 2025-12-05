// backend/controllers/taxController.js
import Tax from '../models/Tax.js';
import Project from '../models/Project.js';
import Income from '../models/income.js';
import TaxConfig from '../models/TaxConfig.js';

// Helper function to calculate optimization score
const calculateOptimizationScore = (income, deductions, regime = 'new') => {
  if (income === 0) return 0;
  
  let maxPossibleDeductions = 0;
  
  if (regime === 'old') {
    maxPossibleDeductions = 75000 + 150000 + 25000 + 50000 + 50000; // standard + 80C + 80D + NPS + HRA
  } else {
    maxPossibleDeductions = 75000; // Only standard deduction in new regime
  }
  
  const deductionRatio = Math.min(deductions / maxPossibleDeductions, 1);
  const baseScore = regime === 'old' ? 40 : 30;
  
  return Math.round(baseScore + (deductionRatio * 60));
};

// Enhanced tax calculation with income-based logic
const calculateTaxWithBrackets = (taxableIncome, config) => {
  const brackets = config?.taxBrackets?.length ? config.taxBrackets : getDefaultBrackets();
  const cessRate = config?.cess || 0.04;
  
  let totalTax = 0;
  const breakdown = [];
  let remainingIncome = taxableIncome;

  // Sort brackets by min value to ensure correct calculation
  const sortedBrackets = [...brackets].sort((a, b) => (a.min || 0) - (b.min || 0));

  for (const bracket of sortedBrackets) {
    if (remainingIncome <= 0) break;
    
    const bracketMin = bracket.min || 0;
    const bracketMax = bracket.max === null || bracket.max === undefined ? Infinity : bracket.max;
    
    // Calculate taxable amount in this bracket
    let taxableInBracket = 0;
    if (remainingIncome > bracketMin) {
      taxableInBracket = Math.min(remainingIncome, bracketMax) - bracketMin;
      if (taxableInBracket > 0) {
        const bracketTax = taxableInBracket * (bracket.rate / 100);
        totalTax += bracketTax;
        
        breakdown.push({
          range: bracket.range,
          tax: Math.round(bracketTax),
          rate: bracket.rate,
          slab: bracket.slab,
          taxableAmount: Math.round(taxableInBracket)
        });
        
        remainingIncome -= taxableInBracket;
      }
    }
  }

  // Add cess
  const cess = totalTax * cessRate;
  totalTax += cess;

  if (cess > 0) {
    breakdown.push({
      range: "Health & Education Cess",
      tax: Math.round(cess),
      rate: cessRate * 100,
      slab: "cess"
    });
  }

  return { 
    totalTax: Math.round(totalTax), 
    breakdown: breakdown.filter(item => item.tax > 0 || item.slab === "cess"),
    cess: Math.round(cess)
  };
};

// Dynamic deductions based on income and regime
const calculateDynamicDeductions = (totalIncome, config) => {
  const regime = config?.regime || 'new';
  const deductionsFromConfig = config?.deductions || { 
    standard: 75000, 
    section80C: 150000, 
    section80D: 25000, 
    nps: 50000,
    hra: 0
  };
  
  let deductions = {};

  // Standard deduction available in both regimes
  deductions.standard = deductionsFromConfig.standard || 75000;

  // Additional deductions only in old regime
  if (regime === 'old') {
    // Section 80C - scales with income
    if (totalIncome > 500000) {
      deductions.section80C = Math.min(deductionsFromConfig.section80C || 150000, totalIncome * 0.15);
    } else {
      deductions.section80C = 0;
    }

    // Section 80D - health insurance
    if (totalIncome > 300000) {
      deductions.section80D = deductionsFromConfig.section80D || 25000;
    }

    // NPS additional deduction
    if (totalIncome > 750000) {
      deductions.nps = deductionsFromConfig.nps || 50000;
    }

    // HRA estimation (would need actual HRA data)
    if (totalIncome > 600000) {
      deductions.hra = Math.min(totalIncome * 0.1, 60000);
    }
  }

  return deductions;
};

// Generate AI recommendations based on income
const generateIncomeBasedRecommendations = (totalIncome, taxableIncome, regime, deductions) => {
  const recommendations = [];

  // Regime selection advice
  if (totalIncome > 500000 && totalIncome < 1500000) {
    recommendations.push({
      id: 'rec-regime-comparison',
      title: "Compare Tax Regimes",
      description: "Your income level may benefit from comparing old vs new tax regimes for optimal savings",
      priority: "high",
      potentialSavings: Math.round(totalIncome * 0.02),
      category: "planning",
      action: "compare_regimes"
    });
  }

  // Section 80C recommendations
  if (regime === 'old' && totalIncome > 500000) {
    const remaining80C = 150000 - (deductions.section80C || 0);
    if (remaining80C > 0) {
      recommendations.push({
        id: 'rec-80c-optimize',
        title: "Maximize Section 80C",
        description: `Invest additional ₹${remaining80C.toLocaleString()} in tax-saving instruments under Section 80C`,
        priority: "high",
        potentialSavings: Math.round(remaining80C * 0.3),
        category: "investments",
        action: "invest_80c"
      });
    }
  }

  // Health insurance recommendation
  if (totalIncome > 400000 && (!deductions.section80D || deductions.section80D === 0)) {
    recommendations.push({
      id: 'rec-health-insurance',
      title: "Health Insurance Premium",
      description: "Claim up to ₹25,000 for health insurance premiums under Section 80D",
      priority: "medium",
      potentialSavings: Math.round(25000 * 0.3),
      category: "insurance",
      action: "review_health_insurance"
    });
  }

  // NPS recommendation for higher income
  if (totalIncome > 750000 && regime === 'old' && (!deductions.nps || deductions.nps === 0)) {
    recommendations.push({
      id: 'rec-nps-contribution',
      title: "National Pension System",
      description: "Additional ₹50,000 deduction available under Section 80CCD(1B) for NPS",
      priority: "medium",
      potentialSavings: Math.round(50000 * 0.3),
      category: "retirement",
      action: "invest_nps"
    });
  }

  // Tax-saving investments for high income
  if (totalIncome > 1000000) {
    recommendations.push({
      id: 'rec-tax-planning',
      title: "Advanced Tax Planning",
      description: "Consider tax-saving investments and proper asset allocation for optimal tax efficiency",
      priority: "high",
      potentialSavings: Math.round(totalIncome * 0.05),
      category: "planning",
      action: "consult_tax_advisor"
    });
  }

  return recommendations;
};

// Get default tax brackets
const getDefaultBrackets = () => {
  const currentYear = new Date().getFullYear();
  return [
    { range: "Up to ₹3,00,000", rate: 0, min: 0, max: 300000, slab: "0-3L" },
    { range: "₹3,00,001 - ₹6,00,000", rate: 5, min: 300001, max: 600000, slab: "3L-6L" },
    { range: "₹6,00,001 - ₹9,00,000", rate: 10, min: 600001, max: 900000, slab: "6L-9L" },
    { range: "₹9,00,001 - ₹12,00,000", rate: 15, min: 900001, max: 1200000, slab: "9L-12L" },
    { range: "₹12,00,001 - ₹15,00,000", rate: 20, min: 1200001, max: 1500000, slab: "12L-15L" },
    { range: "Above ₹15,00,000", rate: 30, min: 1500001, max: null, slab: "15L+" }
  ];
};

// Get income breakdown
const getIncomeBreakdown = (incomes) => {
  const breakdown = {};
  incomes.forEach(inc => {
    const category = inc.category || 'other';
    breakdown[category] = (breakdown[category] || 0) + inc.amount;
  });
  return breakdown;
};

// Calculate tax savings potential
const calculateTaxSavingsPotential = (totalIncome, currentDeductions, regime = 'new') => {
  if (totalIncome === 0) return 0;
  
  let maxPotentialDeductions = 0;
  
  if (regime === 'old') {
    maxPotentialDeductions = 75000 + 150000 + 25000 + 50000 + 50000; // All possible deductions
  } else {
    maxPotentialDeductions = 75000; // Only standard in new regime
  }
  
  const currentSavings = currentDeductions;
  const potentialAdditional = Math.max(0, maxPotentialDeductions - currentSavings);
  
  return Math.round(potentialAdditional * 0.3); // Assuming 30% tax rate for savings
};

// Get current year tax calculation - MAIN FUNCTION
export const getCurrentTaxCalculation = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentYear = new Date().getFullYear();

    console.log(`📊 Getting enhanced tax calculation for tenant: ${tenantId}, year: ${currentYear}`);

    // Fetch user's income data
    const incomes = await Income.find({ 
      tenantId,
      isDeleted: false,
      date: {
        $gte: new Date(`${currentYear}-04-01`),
        $lte: new Date(`${currentYear + 1}-03-31`)
      }
    });

    console.log(`Found ${incomes.length} income records`);

    // Load tax config
    const config = await TaxConfig.findOne({ tenantId }) || await TaxConfig.findOne({ tenantId: { $exists: false } });
    const regime = config?.regime || 'new';

    // Calculate totals and dynamic deductions
    const totalIncome = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const deductionBreakdown = calculateDynamicDeductions(totalIncome, config);
    const totalDeductions = Object.values(deductionBreakdown).reduce((sum, amount) => sum + amount, 0);

    // Calculate taxable income and tax
    const taxableIncome = Math.max(0, totalIncome - totalDeductions);
    const taxCalculation = calculateTaxWithBrackets(taxableIncome, config);
    
    // Generate AI recommendations
    const aiRecommendations = generateIncomeBasedRecommendations(totalIncome, taxableIncome, regime, deductionBreakdown);

    // Get business taxes if any
    const businessTaxes = await Tax.find({
      tenantId,
      isDeleted: false,
      date: {
        $gte: new Date(`${currentYear}-04-01`),
        $lte: new Date(`${currentYear + 1}-03-31`)
      }
    });

    // Calculate business tax summary
    const businessTaxSummary = {
      gst: {
        totalLiability: businessTaxes.filter(t => t.taxType === 'GST').reduce((sum, t) => sum + t.amount, 0),
        paid: businessTaxes.filter(t => t.taxType === 'GST' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
        pending: businessTaxes.filter(t => t.taxType === 'GST' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)
      },
      tds: {
        totalLiability: businessTaxes.filter(t => t.taxType === 'TDS').reduce((sum, t) => sum + t.amount, 0),
        paid: businessTaxes.filter(t => t.taxType === 'TDS' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
        pending: businessTaxes.filter(t => t.taxType === 'TDS' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)
      }
    };

    const taxData = {
      // Personal Tax Details
      totalIncome,
      totalDeductions,
      taxableIncome,
      taxLiability: taxCalculation.totalTax,
      incomeBreakdown: getIncomeBreakdown(incomes),
      deductionBreakdown,
      taxBreakdown: taxCalculation.breakdown,
      
      // Enhanced Insights
      hasIncomeData: totalIncome > 0,
      isManualCalculation: false,
      taxOptimizationScore: calculateOptimizationScore(totalIncome, totalDeductions, regime),
      aiRecommendations,
      year: currentYear,
      status: totalIncome > 0 ? 'calculated' : 'no_income_data',
      regime,
      
      // New Enhanced Fields
      effectiveTaxRate: totalIncome > 0 ? (taxCalculation.totalTax / totalIncome) * 100 : 0,
      monthlyTax: Math.round(taxCalculation.totalTax / 12),
      taxSavingsPotential: calculateTaxSavingsPotential(totalIncome, totalDeductions, regime),
      totalCess: taxCalculation.cess,
      
      // Business Taxes
      businessTaxes: businessTaxSummary,
      
      // Summary
      summary: {
        totalTaxLiability: taxCalculation.totalTax + businessTaxSummary.gst.totalLiability + businessTaxSummary.tds.totalLiability,
        totalPaid: businessTaxSummary.gst.paid + businessTaxSummary.tds.paid,
        totalPending: taxCalculation.totalTax + businessTaxSummary.gst.pending + businessTaxSummary.tds.pending,
        complianceScore: calculateOptimizationScore(totalIncome, totalDeductions, regime),
        directTaxes: taxCalculation.totalTax + businessTaxSummary.tds.totalLiability,
        indirectTaxes: businessTaxSummary.gst.totalLiability
      },
      
      updatedAt: new Date()
    };

    console.log('✅ Enhanced tax calculation completed successfully');
    res.json({
      success: true,
      data: taxData
    });

  } catch (error) {
    console.error('❌ Error calculating current tax:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate tax',
      message: error.message
    });
  }
};

// Get tax rates
export const getTaxRates = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentYear = new Date().getFullYear();
    console.log('📋 Fetching comprehensive tax rates...');

    const config = await TaxConfig.findOne({ tenantId }) || await TaxConfig.findOne({ tenantId: { $exists: false } });

    if (config) {
      const taxRates = {
        financialYear: config.financialYear || `${currentYear}-${currentYear + 1}`,
        lastUpdated: config.lastUpdated || new Date().toISOString(),
        source: config.source || 'Custom Tax Config',
        regime: config.regime || 'new',
        brackets: config.taxBrackets || getDefaultBrackets(),
        deductions: config.deductions || {},
        cess: typeof config.cess === 'number' ? config.cess : 0.04,
        taxTypes: config.taxTypes || []
      };

      console.log('✅ Returning tenant tax config');
      return res.json({ success: true, data: taxRates });
    }

    // Default tax rates
    const taxRates = {
      financialYear: `${currentYear}-${currentYear + 1}`,
      lastUpdated: new Date().toISOString(),
      source: 'Income Tax Act, 1961',
      regime: 'new',
      brackets: getDefaultBrackets(),
      deductions: {
        standard: 75000,
        section80C: 150000,
        section80D: 25000,
        hra: 0,
        medical: 25000,
        nps: 50000
      },
      cess: 0.04
    };

    console.log('✅ Tax rates fetched successfully (defaults)');
    res.json({ success: true, data: taxRates });

  } catch (error) {
    console.error('❌ Error fetching tax rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax rates',
      message: error.message
    });
  }
};

// Get AI recommendations
export const getAIRecommendations = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const currentYear = new Date().getFullYear();

    console.log(`🤖 Fetching AI tax recommendations for tenant: ${tenantId}`);

    // Fetch user's income data
    const incomes = await Income.find({ 
      tenantId,
      isDeleted: false,
      date: {
        $gte: new Date(`${currentYear}-04-01`),
        $lte: new Date(`${currentYear + 1}-03-31`)
      }
    });

    const totalIncome = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const config = await TaxConfig.findOne({ tenantId }) || await TaxConfig.findOne({ tenantId: { $exists: false } });
    const regime = config?.regime || 'new';
    
    const deductionBreakdown = calculateDynamicDeductions(totalIncome, config);
    const totalDeductions = Object.values(deductionBreakdown).reduce((sum, amount) => sum + amount, 0);

    const recommendations = generateIncomeBasedRecommendations(totalIncome, 0, regime, deductionBreakdown);
    const optimizationScore = calculateOptimizationScore(totalIncome, totalDeductions, regime);

    console.log(`✅ Generated ${recommendations.length} recommendations`);
    res.json({
      success: true,
      data: {
        recommendations,
        optimizationScore,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating AI recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error.message
    });
  }
};

// Calculate manual tax
export const calculateManualTax = async (req, res) => {
  try {
    const { income, regime = 'new' } = req.body;
    const manualIncome = parseFloat(income);

    if (isNaN(manualIncome) || manualIncome < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid income amount'
      });
    }

    console.log(`🧮 Calculating manual tax for income: ₹${manualIncome.toLocaleString()}, regime: ${regime}`);
    
    const tenantId = req.tenantId;
    const config = await TaxConfig.findOne({ tenantId }) || await TaxConfig.findOne({ tenantId: { $exists: false } });
    
    // Use provided regime or config regime
    const effectiveRegime = regime || config?.regime || 'new';
    const deductionBreakdown = calculateDynamicDeductions(manualIncome, { ...config, regime: effectiveRegime });
    const totalDeductions = Object.values(deductionBreakdown).reduce((sum, amount) => sum + amount, 0);
    const taxableIncome = Math.max(0, manualIncome - totalDeductions);
    const taxCalculation = calculateTaxWithBrackets(taxableIncome, config);
    const aiRecommendations = generateIncomeBasedRecommendations(manualIncome, taxableIncome, effectiveRegime, deductionBreakdown);

    const response = {
      totalIncome: manualIncome,
      totalDeductions,
      taxableIncome,
      taxLiability: taxCalculation.totalTax,
      incomeBreakdown: { salary: manualIncome },
      deductionBreakdown,
      taxBreakdown: taxCalculation.breakdown,
      hasIncomeData: false,
      isManualCalculation: true,
      taxOptimizationScore: calculateOptimizationScore(manualIncome, totalDeductions, effectiveRegime),
      aiRecommendations,
      regime: effectiveRegime,
      effectiveTaxRate: manualIncome > 0 ? (taxCalculation.totalTax / manualIncome) * 100 : 0,
      monthlyTax: Math.round(taxCalculation.totalTax / 12),
      year: new Date().getFullYear(),
      status: 'manual_calculation',
      manualIncome: manualIncome
    };

    console.log('✅ Manual tax calculation completed');
    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ Error calculating manual tax:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate manual tax',
      message: error.message
    });
  }
};

// Get upcoming deadlines
export const getUpcomingDeadlines = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { days = 30 } = req.query;
    const currentDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(days));

    console.log(`📅 Fetching upcoming deadlines for ${days} days, tenant: ${tenantId}`);

    const upcomingTaxes = await Tax.find({
      tenantId,
      isDeleted: false,
      status: { $in: ['pending', 'overdue'] },
      dueDate: {
        $gte: currentDate,
        $lte: endDate
      }
    })
    .populate('projectId', 'name color')
    .sort({ dueDate: 1 })
    .limit(20);

    console.log(`Found ${upcomingTaxes.length} upcoming tax deadlines`);

    // Add standard tax deadlines
    const deadlines = [...upcomingTaxes];
    const currentYear = new Date().getFullYear();

    // Income tax advance tax deadlines
    const advanceTaxDates = [
      { date: new Date(currentYear, 5, 15), title: "Advance Tax - Q1 (15%)", type: "income_tax", priority: "high" },
      { date: new Date(currentYear, 8, 15), title: "Advance Tax - Q2 (45%)", type: "income_tax", priority: "high" },
      { date: new Date(currentYear, 11, 15), title: "Advance Tax - Q3 (75%)", type: "income_tax", priority: "high" },
      { date: new Date(currentYear + 1, 2, 15), title: "Advance Tax - Q4 (100%)", type: "income_tax", priority: "high" }
    ];

    advanceTaxDates.forEach((deadline, index) => {
      if (deadline.date >= currentDate && deadline.date <= endDate) {
        deadlines.push({
          _id: `advance_tax_${index}`,
          taxType: deadline.type,
          title: deadline.title,
          dueDate: deadline.date,
          amount: 0,
          status: "pending",
          priority: deadline.priority,
          formType: "Challan 280"
        });
      }
    });

    // Sort by due date
    deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    console.log(`✅ Returning ${deadlines.length} total deadlines`);
    res.json({
      success: true,
      data: deadlines,
      count: deadlines.length
    });

  } catch (error) {
    console.error('❌ Error fetching upcoming deadlines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deadlines',
      message: error.message
    });
  }
};

// Reset to income-based calculation
export const resetToIncomeTax = async (req, res) => {
  try {
    console.log('🔄 Resetting to income-based calculation');
    // This would typically refetch the income-based calculation
    res.json({
      success: true,
      message: 'Reset to income-based calculation',
      data: null
    });
  } catch (error) {
    console.error('❌ Error resetting tax calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset calculation',
      message: error.message
    });
  }
};

// Get tax summary
export const getTaxSummary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { year = new Date().getFullYear() } = req.query;

    console.log(`📊 Fetching tax summary for year: ${year}, tenant: ${tenantId}`);

    const taxRecords = await Tax.find({ 
      tenantId,
      isDeleted: false,
      date: {
        $gte: new Date(`${year}-04-01`),
        $lte: new Date(`${parseInt(year) + 1}-03-31`)
      }
    }).sort({ date: 1 });

    console.log(`Found ${taxRecords.length} tax records`);

    const taxTypes = ['GST', 'Income Tax', 'TDS', 'Professional Tax', 'Corporate Tax'];
    const summary = taxTypes.map(type => {
      const records = taxRecords.filter(r => r.taxType === type);
      const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
      const paidAmount = records.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);
      const pendingAmount = records.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
      
      return {
        taxType: type,
        totalAmount,
        recordCount: records.length,
        paidAmount,
        pendingAmount,
        overdueAmount: records.filter(r => r.status === 'overdue').reduce((sum, r) => sum + r.amount, 0)
      };
    }).filter(s => s.recordCount > 0);

    const overall = {
      totalAmount: taxRecords.reduce((sum, r) => sum + r.amount, 0),
      totalRecords: taxRecords.length,
      totalPaid: taxRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0),
      totalPending: taxRecords.filter(r => r.status === 'pending').length,
      totalOverdue: taxRecords.filter(r => r.status === 'overdue').length
    };

    console.log('✅ Tax summary fetched successfully');
    res.json({
      success: true,
      data: {
        summary,
        overall,
        year: parseInt(year)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching tax summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax summary',
      message: error.message
    });
  }
};

// CRUD operations for tax records
export const createTax = async (req, res) => {
  try {
    const { projectId, taxType, amount, date, dueDate, description, status, taxPeriod, priority, formType } = req.body;

    console.log('📝 Creating new tax record');

    if (!projectId || !taxType || !amount || !date || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: projectId, taxType, amount, date, dueDate'
      });
    }

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

    const tax = new Tax({
      projectId,
      taxType,
      amount: parseFloat(amount),
      date: new Date(date),
      dueDate: new Date(dueDate),
      description,
      status: status || 'pending',
      taxPeriod,
      priority: priority || 'medium',
      formType,
      tenantId: req.tenantId,
      createdBy: req.user._id
    });

    await tax.save();

    await Project.findByIdAndUpdate(projectId, {
      $push: { taxIds: tax._id }
    });

    console.log(`✅ Tax record created: ${tax._id}`);
    res.status(201).json({
      success: true,
      data: tax,
      message: 'Tax record created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating tax:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tax record',
      error: error.message
    });
  }
};

export const getTaxes = async (req, res) => {
  try {
    const { projectId } = req.query;

    console.log(`📋 Fetching taxes${projectId ? ' for project ' + projectId : ''}`);

    let query = { tenantId: req.tenantId, isDeleted: false };
    if (projectId) {
      query.projectId = projectId;
    }

    const taxes = await Tax.find(query)
      .populate('projectId', 'name color')
      .sort({ dueDate: 1, createdAt: -1 });

    console.log(`✅ Found ${taxes.length} tax records`);
    res.status(200).json({
      success: true,
      data: taxes,
      count: taxes.length
    });
  } catch (error) {
    console.error('❌ Error fetching taxes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tax records',
      error: error.message
    });
  }
};

export const updateTax = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`✏️ Updating tax record: ${id}`);

    const tax = await Tax.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: 'Tax record not found'
      });
    }

    console.log(`✅ Tax record updated: ${tax._id}`);
    res.status(200).json({
      success: true,
      data: tax,
      message: 'Tax record updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating tax:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tax record',
      error: error.message
    });
  }
};

export const deleteTax = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting tax record: ${id}`);

    const tax = await Tax.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      { isDeleted: true },
      { new: true }
    );

    if (!tax) {
      return res.status(404).json({
        success: false,
        message: 'Tax record not found'
      });
    }

    console.log(`✅ Tax record deleted: ${tax._id}`);
    res.status(200).json({
      success: true,
      message: 'Tax record deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting tax:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tax record',
      error: error.message
    });
  }
};

// Tax configuration management
export const getTaxConfig = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const config = await TaxConfig.findOne({ tenantId }) || await TaxConfig.findOne({ tenantId: { $exists: false } });
    if (!config) {
      return res.json({ success: true, data: null, message: 'No tax config found' });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('❌ Error fetching tax config:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tax config', error: error.message });
  }
};

// Get tax reports
export const getTaxReports = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    console.log(`📋 Fetching tax reports for tenant: ${tenantId}`);

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    
    const reports = await Promise.all(years.map(async (year) => {
      const incomes = await Income.find({
        tenantId,
        isDeleted: false,
        date: {
          $gte: new Date(`${year}-04-01`),
          $lte: new Date(`${year + 1}-03-31`)
        }
      });

      const businessTaxes = await Tax.find({
        tenantId,
        isDeleted: false,
        date: {
          $gte: new Date(`${year}-04-01`),
          $lte: new Date(`${year + 1}-03-31`)
        }
      });

      const config = await TaxConfig.findOne({ tenantId }) || await TaxConfig.findOne({ tenantId: { $exists: false } });
      const deductionsFromConfig = (config && config.deductions) ? config.deductions : { standard: 75000 };
      const standardDeduction = deductionsFromConfig.standard || 75000;
      const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
      const taxableIncome = Math.max(0, totalIncome - standardDeduction);

      const brackets = (config && config.taxBrackets && config.taxBrackets.length) ? config.taxBrackets : [
        { range: "Up to ₹3,00,000", rate: 0, min: 0, max: 300000, slab: "0-3L" },
        { range: "₹3,00,001 - ₹6,00,000", rate: 5, min: 300001, max: 600000, slab: "3L-6L" },
        { range: "₹6,00,001 - ₹9,00,000", rate: 10, min: 600001, max: 900000, slab: "6L-9L" },
        { range: "₹9,00,001 - ₹12,00,000", rate: 15, min: 900001, max: 1200000, slab: "9L-12L" },
        { range: "₹12,00,001 - ₹15,00,000", rate: 20, min: 1200001, max: 1500000, slab: "12L-15L" },
        { range: "Above ₹15,00,000", rate: 30, min: 1500001, max: null, slab: "15L+" }
      ];

      let tax = 0;
      brackets.slice().reverse().forEach(br => {
        const min = br.min || 0;
        const max = br.max;
        if (max == null) {
          if (taxableIncome > min) {
            tax += (taxableIncome - min) * (br.rate / 100);
          }
        } else {
          if (taxableIncome > min) {
            const taxable = Math.min(taxableIncome, max) - min;
            tax += taxable * (br.rate / 100);
          }
        }
      });

      const cessRate = (config && typeof config.cess === 'number') ? config.cess : 0.04;
      const taxWithCess = Math.round(tax + (tax * cessRate));

      const gstTotal = businessTaxes.filter(t => t.taxType === 'GST').reduce((sum, t) => sum + t.amount, 0);
      const tdsTotal = businessTaxes.filter(t => t.taxType === 'TDS').reduce((sum, t) => sum + t.amount, 0);
      const ptTotal = businessTaxes.filter(t => t.taxType === 'Professional Tax').reduce((sum, t) => sum + t.amount, 0);

      return {
        _id: `report_${year}`,
        year,
        type: 'comprehensive',
        personalTax: {
          totalIncome,
          taxLiability: taxWithCess
        },
        businessTaxes: {
          gst: gstTotal,
          tds: tdsTotal,
          professionalTax: ptTotal
        },
        totalLiability: taxWithCess + gstTotal + tdsTotal + ptTotal,
        isManualCalculation: false,
        complianceScore: calculateOptimizationScore(totalIncome, standardDeduction),
        updatedAt: new Date(`${year + 1}-03-31`)
      };
    }));

    console.log(`✅ Generated ${reports.length} tax reports`);
    res.json({
      success: true,
      data: reports
    });

  } catch (error) {
    console.error('❌ Error fetching tax reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tax reports',
      message: error.message
    });
  }
};

export const upsertTaxConfig = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const payload = req.body;
    let config = await TaxConfig.findOne({ tenantId });
    if (config) {
      Object.assign(config, payload, { lastUpdated: new Date() });
      await config.save();
      return res.json({ success: true, data: config, message: 'Tax config updated' });
    }
    config = new TaxConfig(Object.assign({}, payload, { tenantId, lastUpdated: new Date() }));
    await config.save();
    res.status(201).json({ success: true, data: config, message: 'Tax config created' });
  } catch (error) {
    console.error('❌ Error upserting tax config:', error);
    res.status(500).json({ success: false, message: 'Failed to save tax config', error: error.message });
  }
};

export default {
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
  deleteTax,
  getTaxConfig,
  upsertTaxConfig
};