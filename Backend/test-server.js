// backend/services/taxService.js
import Tax from '../models/Tax.js';
import Income from '../models/income.js';

// Current tax rates (can be updated easily)
const CURRENT_TAX_RATES = {
  year: 2025,
  financialYear: "2024-25",
  brackets: [
    { limit: 300000, rate: 0, description: "No tax" },
    { limit: 600000, rate: 0.05, description: "5% on income above ₹3L" },
    { limit: 900000, rate: 0.10, description: "10% on income above ₹6L" },
    { limit: 1200000, rate: 0.15, description: "15% on income above ₹9L" },
    { limit: 1500000, rate: 0.20, description: "20% on income above ₹12L" },
    { limit: Infinity, rate: 0.30, description: "30% on income above ₹15L" }
  ],
  deductions: {
    standard: 13850,
    section80C: 150000,
    hra: 0, // Actual calculation based on salary
    medical: 25000
  },
  cess: 0.04 // 4% health and education cess
};

// Tax calculation helper function
export async function calculateTaxForTenant(tenantId, year) {
  try {
    console.log(`🧮 Starting tax calculation for tenant ${tenantId}, year ${year}`);
    
    // Get all income records for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const incomes = await Income.find({
      tenantId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    console.log(`💰 Found ${incomes.length} income records for year ${year}`);
    
    let totalIncome = 0;
    const incomeBreakdown = {};
    
    // Calculate total income and breakdown only if income exists
    if (incomes.length > 0) {
      incomes.forEach(income => {
        totalIncome += income.amount;
        const category = income.category || 'other';
        incomeBreakdown[category] = (incomeBreakdown[category] || 0) + income.amount;
      });
    }
    
    // Calculate deductions and tax only if we have income data
    let totalDeductions = 0;
    let taxableIncome = 0;
    let taxLiability = 0;
    const deductionBreakdown = {};
    const taxBreakdown = [];

    if (incomes.length > 0) {
      // Apply standard deduction
      totalDeductions = CURRENT_TAX_RATES.deductions.standard;
      deductionBreakdown.standard = CURRENT_TAX_RATES.deductions.standard;
      
      taxableIncome = Math.max(0, totalIncome - totalDeductions);
      const taxResult = calculateDetailedTaxLiability(taxableIncome);
      taxLiability = taxResult.totalTax;
      taxBreakdown = taxResult.breakdown;
    }
    
    console.log(`📊 Tax calculation results:
      Has Income Data: ${incomes.length > 0}
      Total Income: ₹${totalIncome}
      Tax Liability: ₹${taxLiability}
    `);
    
    // Create or update tax record
    const taxData = {
      tenantId,
      year,
      totalIncome,
      totalDeductions,
      taxableIncome,
      taxLiability,
      incomeBreakdown,
      deductionBreakdown,
      taxBreakdown,
      deductionUsed: 'standard',
      status: incomes.length > 0 ? 'calculated' : 'no_income_data',
      hasIncomeData: incomes.length > 0,
      isManualCalculation: false,
      taxRates: CURRENT_TAX_RATES
    };
    
    const taxCalculation = await Tax.findOneAndUpdate(
      { tenantId, year },
      taxData,
      { 
        new: true, 
        upsert: true, 
        runValidators: true,
        setDefaultsOnInsert: true 
      }
    );
    
    console.log(`✅ Tax calculation saved to database with ID: ${taxCalculation._id}`);
    return taxCalculation;
  } catch (error) {
    console.error('❌ Error in tax calculation:', error);
    throw error;
  }
}

// Calculate tax for manual income input
export async function calculateManualTax(tenantId, manualIncome, year = new Date().getFullYear()) {
  try {
    console.log(`🧮 Calculating manual tax for income: ₹${manualIncome}`);
    
    const standardDeduction = CURRENT_TAX_RATES.deductions.standard;
    const totalDeductions = standardDeduction;
    const taxableIncome = Math.max(0, manualIncome - standardDeduction);
    const taxResult = calculateDetailedTaxLiability(taxableIncome);
    
    const manualTaxData = {
      tenantId,
      year,
      totalIncome: manualIncome,
      totalDeductions,
      taxableIncome,
      taxLiability: taxResult.totalTax,
      incomeBreakdown: { manual: manualIncome },
      deductionBreakdown: { standard: standardDeduction },
      taxBreakdown: taxResult.breakdown,
      deductionUsed: 'standard',
      status: 'manual_calculation',
      hasIncomeData: true,
      isManualCalculation: true,
      manualIncome: manualIncome,
      taxRates: CURRENT_TAX_RATES
    };
    
    console.log(`📊 Manual tax calculation:
      Manual Income: ₹${manualIncome}
      Taxable Income: ₹${taxableIncome}
      Tax Liability: ₹${taxResult.totalTax}
    `);
    
    return manualTaxData;
  } catch (error) {
    console.error('❌ Error in manual tax calculation:', error);
    throw error;
  }
}

// Enhanced tax calculation with detailed breakdown
function calculateDetailedTaxLiability(taxableIncome) {
  const brackets = CURRENT_TAX_RATES.brackets;
  let totalTax = 0;
  let previousLimit = 0;
  const breakdown = [];

  for (const bracket of brackets) {
    if (taxableIncome > previousLimit) {
      const amountInBracket = Math.min(taxableIncome - previousLimit, bracket.limit - previousLimit);
      const taxInBracket = amountInBracket * bracket.rate;
      totalTax += taxInBracket;
      
      if (amountInBracket > 0) {
        breakdown.push({
          range: `₹${previousLimit.toLocaleString('en-IN')} - ₹${bracket.limit === Infinity ? '∞' : bracket.limit.toLocaleString('en-IN')}`,
          amount: amountInBracket,
          rate: bracket.rate * 100,
          tax: taxInBracket
        });
      }
      
      previousLimit = bracket.limit;
    } else {
      break;
    }
  }
  
  // Add health and education cess (4%)
  const cessAmount = totalTax * CURRENT_TAX_RATES.cess;
  totalTax += cessAmount;
  
  breakdown.push({
    range: "Health & Education Cess",
    amount: cessAmount,
    rate: CURRENT_TAX_RATES.cess * 100,
    tax: cessAmount
  });
  
  return {
    totalTax: Math.round(totalTax),
    breakdown
  };
}

// Get current tax rates
export function getCurrentTaxRates() {
  return CURRENT_TAX_RATES;
}