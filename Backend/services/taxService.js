// services/taxService.js
import Tax from '../models/Tax.js';
import Project from '../models/Project.js';

// Utility functions for safe data processing
const safeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[^\w\s.,!?\-()]/gi, '').trim();
};

const safeArray = (arr) => {
  return Array.isArray(arr) ? arr : [];
};

const safeNumber = (num, defaultValue = 0) => {
  if (typeof num === 'number' && !isNaN(num)) return num;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeObject = (obj) => {
  return obj && typeof obj === 'object' ? obj : {};
};

// Enhanced AI Business Tax Analysis with comprehensive error handling
export const analyzeBusinessForTaxes = async (businessData, tenantId) => {
  try {
    const safeBusinessData = safeObject(businessData);
    const { 
      businessType = '', 
      turnover = 0, 
      state = '', 
      employees = 0, 
      businessActivities = [], 
      establishmentYear 
    } = safeBusinessData;
    
    // AI Analysis Logic
    const applicableTaxes = [];
    const recommendations = [];
    const warnings = [];
    let complianceScore = 100;
    
    // Enhanced GST Analysis with more conditions
    const safeTurnover = safeNumber(turnover);
    const safeEmployees = safeNumber(employees);
    const safeBusinessType = safeString(businessType).toLowerCase();
    const safeBusinessActivities = safeArray(businessActivities);
    
    const gstThreshold = safeBusinessType === 'manufacturing' ? 4000000 : 2000000;
    
    if (safeTurnover > gstThreshold) {
      applicableTaxes.push({
        taxType: 'GST',
        frequency: 'monthly',
        estimatedLiability: safeTurnover * 0.18,
        forms: ['GSTR-1', 'GSTR-3B', 'GSTR-9'],
        dueDates: ['11th', '20th', '31st of following month'],
        registrationRequired: true,
        threshold: gstThreshold
      });
    } else if (safeTurnover > 1500000) {
      applicableTaxes.push({
        taxType: 'GST',
        frequency: 'quarterly',
        scheme: 'composition',
        estimatedLiability: safeTurnover * 0.01,
        forms: ['GSTR-4'],
        dueDates: ['18th of following quarter'],
        registrationRequired: true,
        threshold: 1500000
      });
    } else if (safeTurnover > 1000000 && safeBusinessActivities.includes('ecommerce')) {
      applicableTaxes.push({
        taxType: 'GST',
        frequency: 'monthly',
        estimatedLiability: safeTurnover * 0.18,
        forms: ['GSTR-1', 'GSTR-3B'],
        dueDates: ['10th of following month'],
        registrationRequired: true,
        threshold: 1000000,
        specialNote: 'TCS applicable for e-commerce operators'
      });
    }
    
    // Enhanced TDS Analysis
    if (safeEmployees > 10 || safeBusinessActivities.includes('contracting') || safeTurnover > 5000000) {
      const tdsRate = safeBusinessType === 'professional' ? 0.1 : 0.02;
      applicableTaxes.push({
        taxType: 'TDS',
        frequency: 'quarterly',
        estimatedLiability: safeTurnover * tdsRate,
        forms: ['24Q', '26Q', '27Q', '27EQ'],
        dueDates: ['7th of following month', '31st May', '31st October', '31st January'],
        tdsRates: {
          salary: 0.1,
          contractor: 0.02,
          professional: 0.1,
          rent: 0.1
        }
      });
    }
    
    // Professional Tax with state-specific logic
    const stateProfessionalTax = {
      'maharashtra': { rate: 200, threshold: 7500 },
      'karnataka': { rate: 200, threshold: 15000 },
      'tamil nadu': { rate: 250, threshold: 21000 },
      'default': { rate: 200, threshold: 10000 }
    };
    
    const safeState = safeString(state).toLowerCase();
    const ptConfig = stateProfessionalTax[safeState] || stateProfessionalTax.default;
    
    if (safeEmployees > 0) {
      applicableTaxes.push({
        taxType: 'Professional Tax',
        frequency: 'monthly',
        estimatedLiability: safeEmployees * ptConfig.rate,
        forms: ['PTEC', 'PTRC'],
        dueDates: ['Last day of month'],
        registrationThreshold: ptConfig.threshold,
        stateSpecific: true
      });
    }
    
    // Corporate Tax with enhanced logic
    if (safeBusinessType === 'private_limited' || safeBusinessType === 'public_limited') {
      const corpTaxRate = safeTurnover <= 50000000 ? 0.25 : 0.30;
      applicableTaxes.push({
        taxType: 'Corporate Tax',
        frequency: 'annual',
        estimatedLiability: safeTurnover * corpTaxRate,
        forms: ['ITR-6'],
        dueDates: ['30th September', '31st March'],
        auditRequired: safeTurnover > 10000000,
        taxRate: corpTaxRate
      });
    }
    
    // MSME Benefits for eligible businesses
    if (safeTurnover <= 50000000 && establishmentYear) {
      const currentYear = new Date().getFullYear();
      const businessAge = currentYear - safeNumber(establishmentYear, currentYear);
      
      if (businessAge <= 5) {
        recommendations.push({
          type: 'msme_benefits',
          description: 'Eligible for MSME benefits and lower interest rates',
          benefits: ['Lower interest rates', 'Credit guarantee', 'Subsidized loans'],
          confidence: 0.9
        });
      }
    }
    
    // Enhanced AI Recommendations
    if (safeTurnover > 1500000 && safeTurnover < gstThreshold) {
      recommendations.push({
        type: 'gst_optimization',
        description: 'Consider GST composition scheme to reduce compliance burden',
        potentialSavings: safeTurnover * 0.17,
        confidence: 0.85,
        actionItems: ['Apply for composition scheme', 'Maintain quarterly records']
      });
    }
    
    if (safeBusinessType === 'proprietorship' && safeTurnover > 5000000) {
      recommendations.push({
        type: 'business_structure',
        description: 'Consider converting to Private Limited for better tax benefits and liability protection',
        potentialSavings: safeTurnover * 0.05,
        confidence: 0.75,
        actionItems: ['Consult CA', 'Prepare incorporation documents']
      });
    }
    
    // Risk assessment
    if (applicableTaxes.length > 4) {
      complianceScore -= 15;
      warnings.push('High compliance burden - consider tax consultant');
    }
    
    if (safeTurnover > 10000000 && !applicableTaxes.find(tax => tax.taxType === 'Corporate Tax')) {
      complianceScore -= 10;
      warnings.push('Consider corporate structure for better tax planning');
    }
    
    const totalEstimatedLiability = applicableTaxes.reduce((sum, tax) => {
      return sum + safeNumber(tax.estimatedLiability, 0);
    }, 0);

    return {
      success: true,
      applicableTaxes: safeArray(applicableTaxes),
      recommendations: safeArray(recommendations),
      warnings: safeArray(warnings),
      complianceScore: Math.max(60, complianceScore),
      summary: {
        totalEstimatedLiability,
        complianceRequirements: applicableTaxes.length,
        riskLevel: complianceScore > 80 ? 'low' : complianceScore > 60 ? 'medium' : 'high',
        registrationRequirements: applicableTaxes.filter(tax => tax.registrationRequired).length
      },
      analysisDate: new Date().toISOString(),
      tenantId: safeString(tenantId)
    };
    
  } catch (error) {
    console.error('❌ Error in business tax analysis:', error);
    return {
      success: false,
      error: `Business tax analysis failed: ${error.message}`,
      applicableTaxes: [],
      recommendations: [],
      warnings: ['Analysis service temporarily unavailable'],
      complianceScore: 0,
      summary: {
        totalEstimatedLiability: 0,
        complianceRequirements: 0,
        riskLevel: 'unknown',
        registrationRequirements: 0
      },
      analysisDate: new Date().toISOString()
    };
  }
};

// Enhanced GST Calculation with comprehensive error handling
export const calculateGST = async (transactionData, businessType, turnover, state, tenantId) => {
  try {
    const safeTransactionData = safeObject(transactionData);
    const { 
      amount = 0, 
      isInterState = false, 
      productCategory = '', 
      hsnCode = '', 
      isService = false 
    } = safeTransactionData;

    const safeAmount = safeNumber(amount);
    const safeBusinessType = safeString(businessType);
    const safeTurnover = safeNumber(turnover);
    const safeState = safeString(state);
    
    // Enhanced GST rate determination
    const gstRates = {
      'essential': { rate: 0, description: 'Nil rated' },
      'common': { rate: 0.05, description: '5% GST' },
      'standard': { rate: 0.12, description: '12% GST' },
      'premium': { rate: 0.18, description: '18% GST' },
      'luxury': { rate: 0.28, description: '28% GST' },
      'service': { rate: 0.18, description: '18% GST for services' }
    };
    
    let gstConfig = gstRates.standard; // Default
    
    if (isService) {
      gstConfig = gstRates.service;
    } else if (productCategory && gstRates[productCategory]) {
      gstConfig = gstRates[productCategory];
    }
    
    // Special cases based on HSN code
    if (hsnCode) {
      const safeHsnCode = safeString(hsnCode);
      // Example: Agricultural products
      if (safeHsnCode.startsWith('01') || safeHsnCode.startsWith('02')) {
        gstConfig = gstRates.essential;
      }
      // Example: Pharmaceuticals
      if (safeHsnCode.startsWith('30')) {
        gstConfig = gstRates.common;
      }
    }
    
    const gstAmount = safeAmount * gstConfig.rate;
    
    let sgst = 0, cgst = 0, igst = 0;
    let taxDistribution = {};
    
    if (isInterState) {
      igst = gstAmount;
      taxDistribution = { igst };
    } else {
      sgst = gstAmount / 2;
      cgst = gstAmount / 2;
      taxDistribution = { sgst, cgst };
    }
    
    // Determine applicable form based on turnover and business type
    let applicableForm = 'GSTR-3B';
    if (safeTurnover <= 2000000) {
      applicableForm = safeBusinessType === 'composition' ? 'GSTR-4' : 'GSTR-3B';
    }
    
    return {
      success: true,
      baseAmount: safeAmount,
      gstRate: gstConfig.rate * 100,
      gstAmount,
      ...taxDistribution,
      totalAmount: safeAmount + gstAmount,
      applicableForm,
      hsnCode: safeString(hsnCode),
      productCategory: gstConfig.description,
      isInterState,
      calculationMethod: 'automated',
      timestamp: new Date().toISOString(),
      tenantId: safeString(tenantId)
    };
    
  } catch (error) {
    console.error('❌ Error in GST calculation:', error);
    return {
      success: false,
      error: `GST calculation failed: ${error.message}`,
      baseAmount: 0,
      gstRate: 0,
      gstAmount: 0,
      sgst: 0,
      cgst: 0,
      igst: 0,
      totalAmount: 0,
      applicableForm: 'Unknown',
      calculationMethod: 'error',
      timestamp: new Date().toISOString()
    };
  }
};

// Enhanced Manual Tax Calculation with validation
export const calculateManualTax = async (taxData, tenantId) => {
  try {
    const safeTaxData = safeObject(taxData);
    const { 
      transactionType = 'general', 
      amount = 0, 
      taxType = 'gst', 
      customRate, 
      isInterState = false, 
      state = '',
      financialYear = new Date().getFullYear()
    } = safeTaxData;

    // Input validation
    const safeAmount = safeNumber(amount);
    if (safeAmount <= 0) {
      throw new Error('Invalid amount provided');
    }

    const safeTaxType = safeString(taxType).toLowerCase();
    const safeFinancialYear = safeNumber(financialYear, new Date().getFullYear());

    let calculatedTax = 0;
    let breakdown = {};
    let applicableForms = [];
    let taxDetails = {};

    switch (safeTaxType) {
      case 'gst':
        const gstRate = safeNumber(customRate, getDefaultTaxRate('gst'));
        calculatedTax = safeAmount * gstRate;
        
        if (isInterState) {
          breakdown = { igst: calculatedTax };
        } else {
          breakdown = { 
            sgst: calculatedTax / 2, 
            cgst: calculatedTax / 2 
          };
        }
        
        applicableForms = safeAmount > 2000000 ? ['GSTR-1', 'GSTR-3B'] : ['GSTR-4'];
        taxDetails = {
          registrationThreshold: 2000000,
          compositionScheme: safeAmount <= 2000000
        };
        break;

      case 'tds':
        const tdsRate = safeNumber(customRate, getDefaultTaxRate('tds'));
        calculatedTax = safeAmount * tdsRate;
        breakdown = { tds: calculatedTax };
        applicableForms = ['24Q', '26Q', '27Q'];
        taxDetails = {
          tdsCertificates: ['Form 16', 'Form 16A'],
          dueDates: ['7th of next month', '30th April']
        };
        break;

      case 'income_tax':
        const incomeTax = calculateIncomeTaxSlab(safeAmount, safeFinancialYear);
        calculatedTax = incomeTax.taxAmount;
        breakdown = incomeTax.breakdown;
        applicableForms = getIncomeTaxForms(safeAmount);
        taxDetails = {
          slabs: incomeTax.slabs,
          cess: incomeTax.cess,
          rebate: incomeTax.rebate
        };
        break;

      case 'professional_tax':
        calculatedTax = safeNumber(customRate, getDefaultProfessionalTax(state));
        breakdown = { professional_tax: calculatedTax };
        applicableForms = ['PTEC', 'PTRC'];
        taxDetails = {
          stateSpecific: true,
          monthlyPayment: true
        };
        break;

      case 'corporate_tax':
        const corpTaxRate = getCorporateTaxRate(safeAmount, safeFinancialYear);
        calculatedTax = safeAmount * corpTaxRate;
        breakdown = { corporate_tax: calculatedTax };
        applicableForms = ['ITR-6'];
        taxDetails = {
          taxRate: corpTaxRate,
          auditRequired: safeAmount > 10000000
        };
        break;

      default:
        calculatedTax = safeAmount * (safeNumber(customRate, 0.1));
        breakdown = { [safeTaxType]: calculatedTax };
        applicableForms = ['Custom Form'];
        taxDetails = {
          customCalculation: true
        };
    }

    const safeCalculatedTax = Math.round(calculatedTax * 100) / 100;

    return {
      success: true,
      transactionType: safeString(transactionType),
      taxType: safeTaxType,
      baseAmount: safeAmount,
      taxRate: (safeNumber(customRate) || getDefaultTaxRate(safeTaxType)) * 100,
      calculatedTax: safeCalculatedTax,
      totalAmount: safeAmount + safeCalculatedTax,
      breakdown: safeObject(breakdown),
      applicableForms: safeArray(applicableForms),
      taxDetails: safeObject(taxDetails),
      calculationMethod: 'manual',
      financialYear: safeFinancialYear,
      timestamp: new Date().toISOString(),
      tenantId: safeString(tenantId)
    };

  } catch (error) {
    console.error('❌ Error in manual tax calculation:', error);
    return {
      success: false,
      error: `Manual tax calculation failed: ${error.message}`,
      transactionType: 'error',
      taxType: 'error',
      baseAmount: 0,
      taxRate: 0,
      calculatedTax: 0,
      totalAmount: 0,
      breakdown: {},
      applicableForms: [],
      calculationMethod: 'error',
      timestamp: new Date().toISOString()
    };
  }
};

// Enhanced Income Tax Calculation with slabs
const calculateIncomeTaxSlab = (income, financialYear) => {
  try {
    const safeIncome = safeNumber(income);
    const safeFinancialYear = safeNumber(financialYear, new Date().getFullYear());
    
    let tax = 0;
    const slabs = [];
    
    // FY 2023-24 slabs (can be extended for different years)
    const taxSlabs = [
      { min: 0, max: 250000, rate: 0 },
      { min: 250001, max: 500000, rate: 0.05 },
      { min: 500001, max: 1000000, rate: 0.20 },
      { min: 1000001, max: Infinity, rate: 0.30 }
    ];

    let remainingIncome = safeIncome;
    const breakdown = {};

    taxSlabs.forEach((slab, index) => {
      if (remainingIncome > 0) {
        const taxableInSlab = Math.min(remainingIncome, slab.max - slab.min + (index === 0 ? 1 : 0));
        const slabTax = taxableInSlab * slab.rate;
        
        if (slabTax > 0) {
          breakdown[`slab_${index + 1}`] = slabTax;
          tax += slabTax;
        }
        
        slabs.push({
          range: slab.max === Infinity ? `Above ₹${slab.min.toLocaleString()}` : 
                 `₹${slab.min.toLocaleString()} - ₹${slab.max.toLocaleString()}`,
          rate: `${slab.rate * 100}%`,
          amount: slabTax
        });
        
        remainingIncome -= taxableInSlab;
      }
    });

    // Rebate under section 87A
    let rebate = 0;
    if (safeIncome <= 500000) {
      rebate = Math.min(tax, 12500);
      tax -= rebate;
    }

    // Health and education cess
    const cess = tax * 0.04;
    tax += cess;

    return {
      taxAmount: Math.round(tax),
      breakdown: { ...breakdown, cess, rebate },
      slabs: safeArray(slabs),
      cess,
      rebate,
      effectiveRate: safeIncome > 0 ? (tax / safeIncome) * 100 : 0
    };
  } catch (error) {
    console.error('❌ Error in income tax slab calculation:', error);
    return {
      taxAmount: 0,
      breakdown: {},
      slabs: [],
      cess: 0,
      rebate: 0,
      effectiveRate: 0
    };
  }
};

// Enhanced Tax Compliance Calendar
export const getTaxComplianceCalendar = async (businessType, state, tenantId, financialYear = new Date().getFullYear()) => {
  try {
    const safeBusinessType = safeString(businessType);
    const safeState = safeString(state);
    const safeFinancialYear = safeNumber(financialYear, new Date().getFullYear());
    
    const calendar = [];
    
    // GST Compliance
    for (let month = 0; month < 12; month++) {
      calendar.push({
        taxType: 'GST',
        description: 'GSTR-1 Filing - Outward Supplies',
        dueDate: new Date(safeFinancialYear, month, 11),
        form: 'GSTR-1',
        priority: 'high',
        frequency: 'monthly',
        penalty: '₹50 per day (CGST + SGST)'
      });
      
      calendar.push({
        taxType: 'GST',
        description: 'GSTR-3B Filing - Monthly Return',
        dueDate: new Date(safeFinancialYear, month, 20),
        form: 'GSTR-3B',
        priority: 'high',
        frequency: 'monthly',
        penalty: '₹50 per day (CGST + SGST)'
      });
    }

    // Annual GST Returns
    calendar.push({
      taxType: 'GST',
      description: 'GSTR-9 - Annual Return',
      dueDate: new Date(safeFinancialYear + 1, 11, 31),
      form: 'GSTR-9',
      priority: 'medium',
      frequency: 'annual'
    });

    // TDS Compliance
    const tdsQuarters = [
      { quarter: 'Q1', dueDate: new Date(safeFinancialYear, 6, 31), forms: ['24Q', '26Q', '27Q'] },
      { quarter: 'Q2', dueDate: new Date(safeFinancialYear, 9, 31), forms: ['24Q', '26Q', '27Q'] },
      { quarter: 'Q3', dueDate: new Date(safeFinancialYear, 0, 31), forms: ['24Q', '26Q', '27Q'] },
      { quarter: 'Q4', dueDate: new Date(safeFinancialYear, 3, 31), forms: ['24Q', '26Q', '27Q'] }
    ];
    
    tdsQuarters.forEach(quarter => {
      calendar.push({
        taxType: 'TDS',
        description: `TDS Return - ${quarter.quarter}`,
        dueDate: quarter.dueDate,
        form: quarter.forms.join('/'),
        priority: 'high',
        frequency: 'quarterly',
        penalty: '₹200 per day'
      });
    });

    // Professional Tax
    const ptDueDay = getProfessionalTaxDueDay(safeState);
    for (let month = 0; month < 12; month++) {
      calendar.push({
        taxType: 'Professional Tax',
        description: 'Monthly Professional Tax Payment',
        dueDate: new Date(safeFinancialYear, month, ptDueDay),
        form: 'PTEC',
        priority: 'medium',
        frequency: 'monthly',
        stateSpecific: true
      });
    }

    // Income Tax Calendar
    const advanceTaxDates = [
      { installment: 1, dueDate: new Date(safeFinancialYear, 5, 15), percent: 15 },
      { installment: 2, dueDate: new Date(safeFinancialYear, 8, 15), percent: 45 },
      { installment: 3, dueDate: new Date(safeFinancialYear, 11, 15), percent: 75 },
      { installment: 4, dueDate: new Date(safeFinancialYear + 1, 2, 15), percent: 100 }
    ];

    advanceTaxDates.forEach(installment => {
      calendar.push({
        taxType: 'Income Tax',
        description: `Advance Tax - Installment ${installment.installment} (${installment.percent}%)`,
        dueDate: installment.dueDate,
        form: 'Challan 280',
        priority: 'high',
        frequency: 'quarterly'
      });
    });

    // Income Tax Return
    const itrDueDate = safeBusinessType === 'company' ? 
      new Date(safeFinancialYear + 1, 8, 30) : // 30th Sept for companies
      new Date(safeFinancialYear + 1, 9, 31);  // 31st Oct for others
    
    calendar.push({
      taxType: 'Income Tax',
      description: 'Income Tax Return Filing',
      dueDate: itrDueDate,
      form: getIncomeTaxForms(0, safeBusinessType),
      priority: 'high',
      frequency: 'annual',
      auditRequired: safeBusinessType === 'company'
    });

    // Sort by due date and add metadata
    const sortedCalendar = calendar
      .sort((a, b) => a.dueDate - b.dueDate)
      .map(item => ({
        ...item,
        daysUntilDue: Math.ceil((item.dueDate - new Date()) / (1000 * 60 * 60 * 24)),
        isOverdue: item.dueDate < new Date(),
        id: `${item.taxType}_${item.form}_${item.dueDate.getTime()}`
      }));

    return {
      success: true,
      calendar: sortedCalendar,
      financialYear: safeFinancialYear,
      businessType: safeBusinessType,
      state: safeState,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error generating compliance calendar:', error);
    return {
      success: false,
      error: `Compliance calendar generation failed: ${error.message}`,
      calendar: [],
      financialYear: new Date().getFullYear(),
      timestamp: new Date().toISOString()
    };
  }
};

// Enhanced Income Tax Calculation
export const calculateIncomeTax = async (incomeData, tenantId) => {
  try {
    const safeIncomeData = safeObject(incomeData);
    const { 
      annualIncome = 0, 
      age = 0, 
      deductions = 0, 
      investments = 0,
      financialYear = new Date().getFullYear(),
      isSeniorCitizen = false,
      isSuperSeniorCitizen = false
    } = safeIncomeData;
    
    const safeAnnualIncome = safeNumber(annualIncome);
    const safeDeductions = safeNumber(deductions);
    const safeInvestments = safeNumber(investments);
    const safeFinancialYear = safeNumber(financialYear, new Date().getFullYear());
    
    // Age-based basic exemption limit
    let basicExemption = 250000;
    if (isSuperSeniorCitizen) basicExemption = 500000;
    else if (isSeniorCitizen) basicExemption = 300000;

    const taxableIncome = Math.max(0, safeAnnualIncome - safeDeductions - safeInvestments - basicExemption);
    
    const taxCalculation = calculateIncomeTaxSlab(taxableIncome, safeFinancialYear);
    
    return {
      success: true,
      annualIncome: safeAnnualIncome,
      basicExemption,
      deductions: safeDeductions,
      investments: safeInvestments,
      taxableIncome,
      taxAmount: taxCalculation.taxAmount,
      effectiveRate: taxCalculation.effectiveRate,
      taxSlabs: taxCalculation.slabs,
      cess: taxCalculation.cess,
      rebate: taxCalculation.rebate,
      financialYear: safeFinancialYear,
      calculationMethod: 'detailed',
      timestamp: new Date().toISOString(),
      tenantId: safeString(tenantId)
    };
    
  } catch (error) {
    console.error('❌ Error in income tax calculation:', error);
    return {
      success: false,
      error: `Income tax calculation failed: ${error.message}`,
      annualIncome: 0,
      taxableIncome: 0,
      taxAmount: 0,
      effectiveRate: 0,
      taxSlabs: [],
      calculationMethod: 'error',
      timestamp: new Date().toISOString()
    };
  }
};

// Enhanced Tax Saving Recommendations with safe data processing
export const getTaxSavingRecommendations = async (incomeData, tenantId) => {
  try {
    const safeIncomeData = safeObject(incomeData);
    const { 
      annualIncome = 0, 
      currentInvestments = 0, 
      age = 0, 
      financialYear = new Date().getFullYear() 
    } = safeIncomeData;
    
    const safeAnnualIncome = safeNumber(annualIncome);
    const safeCurrentInvestments = safeNumber(currentInvestments);
    const safeAge = safeNumber(age);
    const safeFinancialYear = safeNumber(financialYear, new Date().getFullYear());
    
    const recommendations = [];
    const max80C = 150000;
    const max80D = safeAge >= 60 ? 50000 : 25000;
    const maxNPS = 50000;
    
    // Section 80C recommendations
    if (safeCurrentInvestments < max80C) {
      const remaining80C = max80C - safeCurrentInvestments;
      const potential80CSavings = remaining80C * 0.3;
      
      recommendations.push({
        type: 'section_80c',
        category: 'deductions',
        description: `Invest ₹${remaining80C.toLocaleString()} in tax-saving instruments under Section 80C`,
        potentialSavings: potential80CSavings,
        instruments: [
          { name: 'ELSS Mutual Funds', amount: remaining80C * 0.4, lockin: '3 years' },
          { name: 'Public Provident Fund (PPF)', amount: remaining80C * 0.3, lockin: '15 years' },
          { name: 'Tax-saving FDs', amount: remaining80C * 0.2, lockin: '5 years' },
          { name: 'Life Insurance Premium', amount: remaining80C * 0.1, lockin: 'Varies' }
        ],
        priority: 'high',
        deadline: '31st March',
        section: '80C',
        maxLimit: max80C
      });
    }
    
    // Section 80D - Health Insurance
    recommendations.push({
      type: 'section_80d',
      category: 'deductions',
      description: `Claim health insurance premium under Section 80D - up to ₹${max80D.toLocaleString()}`,
      potentialSavings: max80D * 0.3,
      instruments: [
        { name: 'Health Insurance Premium', amount: max80D, lockin: 'Annual' }
      ],
      priority: 'medium',
      section: '80D',
      maxLimit: max80D
    });
    
    // NPS Additional Deduction
    if (safeAnnualIncome > 500000) {
      recommendations.push({
        type: 'nps_additional',
        category: 'deductions',
        description: `Additional deduction of ₹${maxNPS.toLocaleString()} under Section 80CCD(1B) for NPS`,
        potentialSavings: maxNPS * 0.3,
        instruments: [
          { name: 'National Pension System', amount: maxNPS, lockin: 'Till retirement' }
        ],
        priority: 'medium',
        section: '80CCD(1B)',
        maxLimit: maxNPS
      });
    }
    
    // HRA Optimization
    if (safeAnnualIncome > 800000) {
      recommendations.push({
        type: 'hra_optimization',
        category: 'exemptions',
        description: 'Optimize HRA exemption by providing proper rent receipts and rental agreement',
        potentialSavings: 60000,
        actionItems: [
          'Submit rent receipts to employer',
          'Maintain rental agreement',
          'Ensure landlord PAN is provided if rent > ₹1,00,000 p.a.'
        ],
        priority: 'medium',
        section: 'HRA'
      });
    }
    
    // Home Loan Benefits
    if (safeAnnualIncome > 1000000) {
      recommendations.push({
        type: 'home_loan',
        category: 'deductions',
        description: 'Claim deductions on home loan interest (Section 24) and principal (Section 80C)',
        potentialSavings: 150000,
        instruments: [
          { name: 'Home Loan Interest', amount: 200000, section: '24' },
          { name: 'Home Loan Principal', amount: 150000, section: '80C' }
        ],
        priority: 'low',
        sections: ['24', '80C']
      });
    }
    
    const totalPotentialSavings = recommendations.reduce((sum, rec) => {
      return sum + safeNumber(rec.potentialSavings, 0);
    }, 0);
    
    const sortedRecommendations = recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
    });

    return {
      success: true,
      recommendations: sortedRecommendations,
      summary: {
        totalPotentialSavings,
        highPriority: sortedRecommendations.filter(rec => rec.priority === 'high').length,
        mediumPriority: sortedRecommendations.filter(rec => rec.priority === 'medium').length,
        lowPriority: sortedRecommendations.filter(rec => rec.priority === 'low').length,
        estimatedTaxSavings: totalPotentialSavings,
        financialYear: safeFinancialYear
      },
      lastUpdated: new Date().toISOString(),
      tenantId: safeString(tenantId)
    };
    
  } catch (error) {
    console.error('❌ Error generating tax saving recommendations:', error);
    return {
      success: false,
      error: `Tax saving recommendations failed: ${error.message}`,
      recommendations: [],
      summary: {
        totalPotentialSavings: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        estimatedTaxSavings: 0,
        financialYear: new Date().getFullYear()
      },
      lastUpdated: new Date().toISOString()
    };
  }
};

// Helper function to get default tax rates
const getDefaultTaxRate = (taxType) => {
  const defaultRates = {
    'gst': 0.18,
    'tds': 0.1,
    'income_tax': 0.3,
    'professional_tax': 0.02,
    'corporate_tax': 0.25,
    'custom_duty': 0.1,
    'excise_duty': 0.12
  };
  const safeTaxType = safeString(taxType).toLowerCase();
  return defaultRates[safeTaxType] || 0.1;
};

// Helper function to get professional tax due day by state
const getProfessionalTaxDueDay = (state) => {
  const stateDueDays = {
    'maharashtra': 30,
    'karnataka': 30,
    'tamil nadu': 15,
    'default': 30
  };
  const safeState = safeString(state).toLowerCase();
  return stateDueDays[safeState] || stateDueDays.default;
};

// Helper function to get default professional tax by state
const getDefaultProfessionalTax = (state) => {
  const stateRates = {
    'maharashtra': 200,
    'karnataka': 200,
    'tamil nadu': 250,
    'default': 200
  };
  const safeState = safeString(state).toLowerCase();
  return stateRates[safeState] || stateRates.default;
};

// Helper function to get corporate tax rate
const getCorporateTaxRate = (turnover, financialYear) => {
  const safeTurnover = safeNumber(turnover);
  // Domestic company rates
  if (safeTurnover <= 50000000) {
    return 0.25; // Lower rate for small companies
  }
  return 0.30; // Standard rate
};

// Helper function to get income tax forms
const getIncomeTaxForms = (income, businessType = 'individual') => {
  const safeIncome = safeNumber(income);
  const safeBusinessType = safeString(businessType).toLowerCase();
  
  if (safeBusinessType === 'company') {
    return ['ITR-6'];
  } else if (safeIncome <= 500000) {
    return ['ITR-1'];
  } else if (safeIncome <= 2000000 && safeBusinessType === 'individual') {
    return ['ITR-2'];
  } else {
    return ['ITR-3', 'ITR-4'];
  }
};

// Export all functions
export default {
  analyzeBusinessForTaxes,
  calculateGST,
  calculateManualTax,
  getTaxComplianceCalendar,
  calculateIncomeTax,
  getTaxSavingRecommendations
};