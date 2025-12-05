import React from 'react';
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';

const ProgressCharts = ({ project }) => {
  const calculateFinancialData = () => {
    const income = project.income?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const expenses = project.expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const tax = project.tax?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const netAmount = income - expenses - tax;
    const budgetUtilization = project.budget ? (expenses / project.budget) * 100 : 0;
    const incomeProgress = project.budget ? (income / project.budget) * 100 : 0;
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalTax: tax,
      netAmount: netAmount,
      budgetUtilization: budgetUtilization,
      incomeProgress: incomeProgress
    };
  };

  const financialData = calculateFinancialData();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Mock data for charts
  const monthlyData = [
    { month: 'Jan', income: 50000, expenses: 30000 },
    { month: 'Feb', income: 75000, expenses: 45000 },
    { month: 'Mar', income: 60000, expenses: 35000 },
    { month: 'Apr', income: 90000, expenses: 55000 },
    { month: 'May', income: 80000, expenses: 40000 },
    { month: 'Jun', income: 95000, expenses: 60000 },
  ];

  const categoryData = [
    { category: 'Development', amount: 120000, percentage: 40 },
    { category: 'Marketing', amount: 60000, percentage: 20 },
    { category: 'Operations', amount: 45000, percentage: 15 },
    { category: 'Infrastructure', amount: 30000, percentage: 10 },
    { category: 'Miscellaneous', amount: 45000, percentage: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Progress</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {financialData.budgetUtilization.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(financialData.budgetUtilization, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Income Progress</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {financialData.incomeProgress.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(financialData.incomeProgress, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {financialData.totalIncome > 0 
                  ? ((financialData.netAmount / financialData.totalIncome) * 100).toFixed(1)
                  : 0
                }%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Net profit percentage</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Average</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(financialData.totalIncome / 6)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Calendar className="text-orange-600" size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Last 6 months</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Trend</h3>
          <div className="space-y-4">
            {monthlyData.map((month, index) => (
              <div key={month.month} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{month.month}</span>
                  <div className="flex space-x-4">
                    <span className="text-green-600">+{formatCurrency(month.income)}</span>
                    <span className="text-red-600">-{formatCurrency(month.expenses)}</span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <div 
                    className="h-2 bg-green-500 rounded-l-full"
                    style={{ width: `${(month.income / 100000) * 100}%` }}
                  ></div>
                  <div 
                    className="h-2 bg-red-500 rounded-r-full"
                    style={{ width: `${(month.expenses / 100000) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Expense Categories</h3>
          <div className="space-y-4">
            {categoryData.map((category, index) => (
              <div key={category.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{category.category}</span>
                  <span className="text-gray-600">{formatCurrency(category.amount)} ({category.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-red-500 rounded-full transition-all"
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <h4 className="font-semibold text-gray-900">Revenue Growth</h4>
            <p className="text-2xl font-bold text-green-600 mt-2">+24%</p>
            <p className="text-sm text-gray-600 mt-1">vs last period</p>
          </div>

          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="text-blue-600" size={24} />
            </div>
            <h4 className="font-semibold text-gray-900">On Track</h4>
            <p className="text-2xl font-bold text-blue-600 mt-2">85%</p>
            <p className="text-sm text-gray-600 mt-1">of budget goals</p>
          </div>

          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingDown className="text-purple-600" size={24} />
            </div>
            <h4 className="font-semibold text-gray-900">Cost Efficiency</h4>
            <p className="text-2xl font-bold text-purple-600 mt-2">-12%</p>
            <p className="text-sm text-gray-600 mt-1">expense reduction</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressCharts;