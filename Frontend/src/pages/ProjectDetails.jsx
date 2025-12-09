import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, TrendingUp, Brain, PieChart, Download, Home, DollarSign, BarChart3, Lightbulb } from 'lucide-react';
import ProjectTransactions from '../Components/ProjectModule/ProjectTransactions';
import ProgressCharts from '../Components/ProjectModule/ProgressCharts';
import AISuggestions from '../Components/ProjectModule/AISuggestions';

const ProjectDetails = ({ project, onBack, userSession }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [financialData, setFinancialData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalTax: 0,
    netAmount: 0,
    budgetUtilization: 0
  });
  const [currentProject, setCurrentProject] = useState(project);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (currentProject) {
      calculateFinancialData();
    }
  }, [currentProject, refreshTrigger]);

  const calculateFinancialData = () => {
    const income = currentProject.income?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const expenses = currentProject.expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const tax = currentProject.tax?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const netAmount = income - expenses - tax;
    const budgetUtilization = currentProject.budget ? (expenses / currentProject.budget) * 100 : 0;
    
    setFinancialData({
      totalIncome: income,
      totalExpenses: expenses,
      totalTax: tax,
      netAmount: netAmount,
      budgetUtilization: budgetUtilization
    });
  };

  // Function to handle project updates from child components
  const handleProjectUpdate = (updatedProject) => {
    setCurrentProject(updatedProject);
    // Trigger a refresh to update all components
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to handle adding transaction from the header button
  const handleAddTransactionClick = () => {
    setActiveTab('transactions');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentProject.name}</h1>
                <p className="text-gray-600 text-sm">Complete Project Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleAddTransactionClick}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Add Transaction
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <div className="flex space-x-8 border-b border-gray-200">
              {[
                { id: 'overview', label: 'Overview', icon: Home },
                { id: 'financials', label: 'Financials', icon: DollarSign },
                { id: 'transactions', label: 'Transactions', icon: FileText },
                { id: 'progress', label: 'Progress', icon: BarChart3 },
                { id: 'insights', label: 'AI Insights', icon: Lightbulb }
              ].map(tab => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-1 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <IconComponent size={16} className="mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab 
            project={currentProject} 
            financialData={financialData} 
            onProjectUpdate={handleProjectUpdate}
            key={`overview-${refreshTrigger}`}
          />
        )}
        {activeTab === 'financials' && (
          <FinancialsTab 
            project={currentProject} 
            financialData={financialData} 
            onProjectUpdate={handleProjectUpdate}
            key={`financials-${refreshTrigger}`}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab 
            project={currentProject} 
            onProjectUpdate={handleProjectUpdate}
            key={`transactions-${refreshTrigger}`}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressTab 
            project={currentProject} 
            onProjectUpdate={handleProjectUpdate}
            key={`progress-${refreshTrigger}`}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsTab 
            project={currentProject} 
            onProjectUpdate={handleProjectUpdate}
            key={`insights-${refreshTrigger}`}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ project, financialData, onProjectUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">Welcome to {project.name}</h2>
        <p className="text-blue-100">Complete financial management for your project</p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <DollarSign className="text-blue-600" size={24} />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Budget</h3>
          <p className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(project.budget || 0)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Income</h3>
          <p className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(financialData.totalIncome)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="text-red-600" size={24} />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Expenses</h3>
          <p className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(financialData.totalExpenses)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <PieChart className="text-purple-600" size={24} />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Budget Utilization</h3>
          <p className="text-xl font-bold text-gray-900">{financialData.budgetUtilization.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts and Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium text-green-600 capitalize">{project.status || 'active'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                </p>
              </div>
              {project.description && (
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-sm text-gray-900 mt-1">{project.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Income Transactions</span>
                <span className="text-sm font-medium text-gray-900">{project.income?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Expense Transactions</span>
                <span className="text-sm font-medium text-gray-900">{project.expenses?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tax Records</span>
                <span className="text-sm font-medium text-gray-900">{project.tax?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Financial Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Progress Chart */}
              <div className="text-center">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Budget Progress</h4>
                <div className="relative inline-block">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      stroke="#4f46e5"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray="339.292"
                      strokeDashoffset={339.292 * (1 - financialData.budgetUtilization / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">
                      {financialData.budgetUtilization.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Income vs Expenses */}
              <div className="text-center">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Income vs Expenses</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Income</span>
                    <span className="text-xs font-medium text-green-600">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(financialData.totalIncome)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min((financialData.totalIncome / (project.budget || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Expenses</span>
                    <span className="text-xs font-medium text-red-600">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(financialData.totalExpenses)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min((financialData.totalExpenses / (project.budget || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Financials Tab Component
const FinancialsTab = ({ project, financialData, onProjectUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Financial Summary</h2>
        
        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Total Income</p>
                <p className="text-xl font-bold text-green-900 mt-1">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(financialData.totalIncome)}
                </p>
              </div>
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Total Expenses</p>
                <p className="text-xl font-bold text-red-900 mt-1">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(financialData.totalExpenses)}
                </p>
              </div>
              <TrendingUp className="text-red-600" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Total Tax</p>
                <p className="text-xl font-bold text-yellow-900 mt-1">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(financialData.totalTax)}
                </p>
              </div>
              <FileText className="text-yellow-600" size={24} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Net Amount</p>
                <p className={`text-xl font-bold mt-1 ${
                  financialData.netAmount >= 0 ? 'text-blue-900' : 'text-red-900'
                }`}>
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(financialData.netAmount)}
                </p>
              </div>
              <PieChart className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        {/* Detailed Financial Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Breakdown</h3>
            {project.income?.length > 0 ? (
              <div className="space-y-3">
                {project.income.map((income, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">{income.description || 'Income'}</p>
                      <p className="text-xs text-gray-500">
                        {income.date ? new Date(income.date).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <p className="text-green-600 font-semibold">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(income.amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No income records found</p>
            )}
          </div>

          {/* Expense Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            {project.expenses?.length > 0 ? (
              <div className="space-y-3">
                {project.expenses.map((expense, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">{expense.description || 'Expense'}</p>
                      <p className="text-xs text-gray-500">
                        {expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <p className="text-red-600 font-semibold">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(expense.amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No expense records found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Transactions Tab Component
const TransactionsTab = ({ project, onProjectUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Transaction Management</h2>
        <ProjectTransactions 
          project={project} 
          onProjectUpdate={onProjectUpdate}
        />
      </div>
    </div>
  );
};

// Progress Tab Component
const ProgressTab = ({ project, onProjectUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Progress Analytics</h2>
        <ProgressCharts project={project} />
      </div>
    </div>
  );
};

// Insights Tab Component
const InsightsTab = ({ project, onProjectUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">AI-Powered Insights</h2>
        <AISuggestions project={project} />
      </div>
    </div>
  );
};

export default ProjectDetails;