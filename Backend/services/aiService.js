export const generateAIInsights = async (projectData) => {
  // Simulate AI analysis - in production, integrate with actual AI service
  const { project, incomeData, expenseData, taxData, totals } = projectData;
  
  // Expense analysis
  const expenseCategories = expenseData.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  const highestExpenseCategory = Object.keys(expenseCategories).reduce((a, b) => 
    expenseCategories[a] > expenseCategories[b] ? a : b, 'N/A'
  );

  // Income analysis
  const totalIncome = incomeData.reduce((sum, income) => sum + income.amount, 0);
  const avgIncome = incomeData.length > 0 ? totalIncome / incomeData.length : 0;

  // Budget analysis
  const budgetStatus = project.budget ? {
    utilization: (totals.totalExpenses / project.budget) * 100,
    remaining: project.budget - totals.totalExpenses,
    isOverBudget: totals.totalExpenses > project.budget
  } : null;

  // Generate insights
  const insights = {
    expense: {
      title: "Expense Optimization",
      insights: [],
      recommendations: []
    },
    income: {
      title: "Income Opportunities",
      insights: [],
      recommendations: []
    },
    tax: {
      title: "Tax Efficiency",
      insights: [],
      recommendations: []
    },
    overall: {
      title: "Project Health",
      insights: [],
      recommendations: []
    }
  };

  // Expense insights
  if (expenseData.length > 0) {
    insights.expense.insights.push(
      `Your highest spending category is ${highestExpenseCategory} (₹${expenseCategories[highestExpenseCategory]?.toLocaleString()})`,
      `Average monthly expense: ₹${(totals.totalExpenses / Math.max(1, expenseData.length)).toFixed(2)}`
    );

    if (expenseCategories['Entertainment'] > totals.totalExpenses * 0.2) {
      insights.expense.recommendations.push(
        "Consider reducing entertainment expenses by 15% to improve savings",
        "Explore cost-effective alternatives for high-spending categories"
      );
    }
  }

  // Income insights
  if (incomeData.length > 0) {
    insights.income.insights.push(
      `Total project income: ₹${totalIncome.toLocaleString()}`,
      `Average income transaction: ₹${avgIncome.toLocaleString()}`
    );

    if (incomeData.length < 3) {
      insights.income.recommendations.push(
        "Diversify income sources to increase financial stability",
        "Consider passive income opportunities related to this project"
      );
    }
  }

  // Budget insights
  if (budgetStatus) {
    if (budgetStatus.isOverBudget) {
      insights.overall.insights.push(
        `Project is over budget by ₹${Math.abs(budgetStatus.remaining).toLocaleString()}`
      );
      insights.overall.recommendations.push(
        "Review and prioritize essential expenses",
        "Consider cost-cutting measures for non-essential items"
      );
    } else {
      insights.overall.insights.push(
        `Budget utilization: ${budgetStatus.utilization.toFixed(1)}%`,
        `Remaining budget: ₹${budgetStatus.remaining.toLocaleString()}`
      );
    }
  }

  // Tax insights
  if (taxData.length > 0) {
    const totalTax = taxData.reduce((sum, tax) => sum + tax.amount, 0);
    insights.tax.insights.push(
      `Total tax paid: ₹${totalTax.toLocaleString()}`,
      `Tax represents ${((totalTax / totals.totalIncome) * 100).toFixed(1)}% of income`
    );

    if (totalTax > totals.totalIncome * 0.3) {
      insights.tax.recommendations.push(
        "Consult tax advisor for potential deductions",
        "Explore tax-efficient investment strategies"
      );
    }
  }

  return insights;
};