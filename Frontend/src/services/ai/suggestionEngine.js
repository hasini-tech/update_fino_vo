// src/services/ai/suggestionEngine.js
export const calculateInvestmentSuggestions = (userData) => {
  const { monthlyIncome, monthlyExpenses, savings, age, riskTolerance } = userData;
  
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const investmentAmount = disposableIncome * 0.3; // 30% of disposable income
  
  // Risk-based allocation
  let stockAllocation, goldAllocation, emergencyAllocation;
  
  if (riskTolerance === 'high') {
    stockAllocation = 70;
    goldAllocation = 20;
    emergencyAllocation = 10;
  } else if (riskTolerance === 'medium') {
    stockAllocation = 60;
    goldAllocation = 25;
    emergencyAllocation = 15;
  } else {
    stockAllocation = 50;
    goldAllocation = 30;
    emergencyAllocation = 20;
  }

  return {
    stocks: {
      amount: Math.round(investmentAmount * (stockAllocation / 100)),
      allocation: stockAllocation
    },
    gold: {
      amount: Math.round(investmentAmount * (goldAllocation / 100)),
      allocation: goldAllocation
    },
    emergency: {
      amount: Math.round(investmentAmount * (emergencyAllocation / 100)),
      allocation: emergencyAllocation
    },
    riskProfile: riskTolerance
  };
};