// profitLossRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Income from '../models/income.js';
import Expense from '../models/Expense.js';

const router = express.Router();

// Helper function to process financial data by month
const processFinancialDataByMonth = (incomes, expenses) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  // Initialize data structure
  const revenue = {
    salesRevenue: new Array(12).fill(0),
    otherRevenue: new Array(12).fill(0),
    salesDiscounts: new Array(12).fill(0),
    salesReturns: new Array(12).fill(0)
  };

  const costOfGoodsSold = {
    awsServer: new Array(12).fill(0),
    directSalaries: new Array(12).fill(0),
    internshipSalaries: new Array(12).fill(0),
    securedFunds: new Array(12).fill(0),
    projectProfitShare: new Array(12).fill(0),
    internshipProfitShare: new Array(12).fill(0)
  };

  const operatingExpenses = {
    marketingAdvertising: new Array(12).fill(0),
    chatOpt: new Array(12).fill(0),
    canva: new Array(12).fill(0),
    legalFees: new Array(12).fill(0),
    computersRepair: new Array(12).fill(0),
    officeExpenses: new Array(12).fill(0),
    deepseekAI: new Array(12).fill(0),
    claudeAI: new Array(12).fill(0),
    openAI: new Array(12).fill(0),
    utilities: new Array(12).fill(0),
    internetBill: new Array(12).fill(0),
    internshipExpenses: new Array(12).fill(0),
    googleWorkspace: new Array(12).fill(0),
    biliaryPayment: new Array(12).fill(0),
    miscellaneous: new Array(12).fill(0)
  };

  // Process incomes
  incomes.forEach(income => {
    const monthIndex = new Date(income.date).getMonth();
    if (monthIndex >= 0 && monthIndex < 12) {
      switch (income.category) {
        case 'sales':
          revenue.salesRevenue[monthIndex] += income.amount;
          break;
        case 'other-revenue':
          revenue.otherRevenue[monthIndex] += income.amount;
          break;
        case 'discount':
          revenue.salesDiscounts[monthIndex] += Math.abs(income.amount);
          break;
        case 'returns':
          revenue.salesReturns[monthIndex] += Math.abs(income.amount);
          break;
      }
    }
  });

  // Process expenses
  expenses.forEach(expense => {
    const monthIndex = new Date(expense.date).getMonth();
    if (monthIndex >= 0 && monthIndex < 12) {
      const amount = Math.abs(expense.amount);
      
      // Map to COGS categories
      switch (expense.category) {
        case 'hosting':
        case 'aws':
          costOfGoodsSold.awsServer[monthIndex] += amount;
          break;
        case 'salaries':
        case 'payroll':
          if (expense.description?.toLowerCase().includes('intern')) {
            costOfGoodsSold.internshipSalaries[monthIndex] += amount;
          } else {
            costOfGoodsSold.directSalaries[monthIndex] += amount;
          }
          break;
        case 'project-profit-share':
          costOfGoodsSold.projectProfitShare[monthIndex] += amount;
          break;
        case 'internship-profit-share':
          costOfGoodsSold.internshipProfitShare[monthIndex] += amount;
          break;
        case 'secured-funds':
          costOfGoodsSold.securedFunds[monthIndex] += amount;
          break;
        // Map to operating expenses
        case 'marketing':
        case 'advertising':
          operatingExpenses.marketingAdvertising[monthIndex] += amount;
          break;
        case 'software':
        case 'subscriptions':
          if (expense.description?.toLowerCase().includes('canva')) {
            operatingExpenses.canva[monthIndex] += amount;
          } else if (expense.description?.toLowerCase().includes('google')) {
            operatingExpenses.googleWorkspace[monthIndex] += amount;
          } else if (expense.description?.toLowerCase().includes('openai')) {
            operatingExpenses.openAI[monthIndex] += amount;
          } else if (expense.description?.toLowerCase().includes('claude')) {
            operatingExpenses.claudeAI[monthIndex] += amount;
          } else if (expense.description?.toLowerCase().includes('deepseek')) {
            operatingExpenses.deepseekAI[monthIndex] += amount;
          } else if (expense.description?.toLowerCase().includes('chatopt')) {
            operatingExpenses.chatOpt[monthIndex] += amount;
          }
          break;
        case 'legal':
          operatingExpenses.legalFees[monthIndex] += amount;
          break;
        case 'office':
        case 'supplies':
          operatingExpenses.officeExpenses[monthIndex] += amount;
          break;
        case 'utilities':
          operatingExpenses.utilities[monthIndex] += amount;
          break;
        case 'internet':
          operatingExpenses.internetBill[monthIndex] += amount;
          break;
        case 'repair':
          operatingExpenses.computersRepair[monthIndex] += amount;
          break;
        case 'internship':
          operatingExpenses.internshipExpenses[monthIndex] += amount;
          break;
        case 'biliary':
          operatingExpenses.biliaryPayment[monthIndex] += amount;
          break;
        case 'miscellaneous':
        case 'transportation':
          operatingExpenses.miscellaneous[monthIndex] += amount;
          break;
        default:
          operatingExpenses.miscellaneous[monthIndex] += amount;
      }
    }
  });

  return {
    revenue,
    costOfGoodsSold,
    expenses: operatingExpenses,
    metadata: {
      processedDate: new Date().toISOString(),
      totalIncomes: incomes.length,
      totalExpenses: expenses.length,
      dataType: 'real'
    }
  };
};

router.get('/', protect, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    // Get start and end dates for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Fetch incomes and expenses for the specified year
    const [incomes, expenses] = await Promise.all([
      Income.find({
        userId: req.user._id,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ date: 1 }),
      
      Expense.find({
        userId: req.user._id,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ date: 1 })
    ]);

    // Process the data into profit/loss format
    const profitLossData = processFinancialDataByMonth(incomes, expenses);

    res.json({
      success: true,
      data: profitLossData,
      summary: {
        totalIncomes: incomes.reduce((sum, income) => sum + income.amount, 0),
        totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
        year: parseInt(year)
      }
    });
    
  } catch (error) {
    console.error('Error fetching profit loss data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch profit loss data',
      message: error.message 
    });
  }
});

export default router;