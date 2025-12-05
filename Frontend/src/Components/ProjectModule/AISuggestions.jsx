import React, { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Shield, Heart, Zap, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

const AISuggestions = ({ project }) => {
  const [activeInsight, setActiveInsight] = useState('overview');

  const calculateFinancialData = () => {
    const income = project.income?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const expenses = project.expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const tax = project.tax?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const netAmount = income - expenses - tax;
    const budgetUtilization = project.budget ? (expenses / project.budget) * 100 : 0;
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalTax: tax,
      netAmount: netAmount,
      budgetUtilization: budgetUtilization
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

  // AI Insights Data
  const insights = {
    overview: {
      title: "Project Health Overview",
      status: financialData.netAmount >= 0 ? "healthy" : "needs_attention",
      score: financialData.netAmount >= 0 ? 78 : 45,
      summary: financialData.netAmount >= 0 
        ? "Your project is performing well with positive cash flow and good budget management."
        : "Your project is currently operating at a loss. Focus on increasing revenue and reducing costs.",
      recommendations: [
        {
          type: "positive",
          text: "Maintain current revenue streams"
        },
        {
          type: financialData.budgetUtilization > 80 ? "warning" : "positive",
          text: financialData.budgetUtilization > 80 
            ? "Budget utilization is high - consider cost optimization"
            : "Budget utilization is within optimal range"
        },
        {
          type: financialData.netAmount >= 0 ? "positive" : "critical",
          text: financialData.netAmount >= 0 
            ? "Positive net income indicates good financial health"
            : "Negative net income requires immediate attention"
        }
      ]
    },
    income: {
      title: "Income Optimization",
      suggestions: [
        {
          icon: TrendingUp,
          title: "Diversify Revenue Streams",
          description: "Add 2-3 new income sources to reduce dependency on current streams",
          impact: "High",
          effort: "Medium",
          timeline: "1-2 months"
        },
        {
          icon: Zap,
          title: "Increase Pricing",
          description: "Consider 15-20% price increase for premium services",
          impact: "Medium",
          effort: "Low",
          timeline: "Immediate"
        },
        {
          icon: Lightbulb,
          title: "Upsell Services",
          description: "Implement upselling strategy for existing clients",
          impact: "Medium",
          effort: "Low",
          timeline: "2 weeks"
        }
      ]
    },
    expenses: {
      title: "Expense Reduction",
      suggestions: [
        {
          icon: TrendingDown,
          title: "Optimize Operational Costs",
          description: "Identify and reduce unnecessary operational expenses by 15%",
          impact: "High",
          effort: "Medium",
          timeline: "1 month"
        },
        {
          icon: Shield,
          title: "Renegotiate Contracts",
          description: "Renegotiate with vendors for better terms and pricing",
          impact: "Medium",
          effort: "Low",
          timeline: "3 weeks"
        },
        {
          icon: Brain,
          title: "Automate Processes",
          description: "Implement automation to reduce manual labor costs",
          impact: "Medium",
          effort: "High",
          timeline: "2-3 months"
        }
      ]
    },
    taxes: {
      title: "Tax Optimization",
      suggestions: [
        {
          icon: Shield,
          title: "Maximize Deductions",
          description: "Ensure all eligible business expenses are claimed as deductions",
          impact: "High",
          effort: "Low",
          timeline: "Ongoing"
        },
        {
          icon: Lightbulb,
          title: "Tax Planning",
          description: "Implement quarterly tax planning to optimize liability",
          impact: "Medium",
          effort: "Medium",
          timeline: "Next quarter"
        },
        {
          icon: Zap,
          title: "Investment in Tax-saving Instruments",
          description: "Consider ELSS and other tax-saving investment options",
          impact: "Medium",
          effort: "Low",
          timeline: "Before financial year end"
        }
      ]
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Health Score Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Health Score</h3>
            <p className="text-gray-600 text-sm">
              AI-powered assessment of your project's financial health
            </p>
          </div>
          <div className={`w-20 h-20 rounded-full ${getHealthBg(insights.overview.score)} flex items-center justify-center border-4 border-white shadow-sm`}>
            <span className={`text-2xl font-bold ${getHealthColor(insights.overview.score)}`}>
              {insights.overview.score}
            </span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            insights.overview.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-sm font-medium text-gray-700">
            {insights.overview.status === 'healthy' ? 'Healthy Project' : 'Needs Attention'}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">{insights.overview.summary}</p>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Health Overview', icon: Heart },
          { id: 'income', label: 'Income Boost', icon: TrendingUp },
          { id: 'expenses', label: 'Cost Reduction', icon: TrendingDown },
          { id: 'taxes', label: 'Tax Optimization', icon: Shield }
        ].map(item => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveInsight(item.id)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeInsight === item.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <IconComponent size={16} className="mr-2" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Insights Content */}
      <div className="space-y-6">
        {activeInsight === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{insights.overview.title}</h3>
            <div className="grid gap-4">
              {insights.overview.recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  rec.type === 'positive' ? 'bg-green-50 border-green-200' :
                  rec.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center">
                    {rec.type === 'positive' && <CheckCircle className="text-green-500 mr-2" size={16} />}
                    {rec.type === 'warning' && <AlertTriangle className="text-yellow-500 mr-2" size={16} />}
                    {rec.type === 'critical' && <AlertTriangle className="text-red-500 mr-2" size={16} />}
                    <p className="text-sm font-medium text-gray-900">{rec.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {['income', 'expenses', 'taxes'].includes(activeInsight) && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">{insights[activeInsight].title}</h3>
            <div className="grid gap-6">
              {insights[activeInsight].suggestions.map((suggestion, index) => {
                const IconComponent = suggestion.icon;
                return (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="text-blue-600" size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{suggestion.title}</h4>
                          <p className="text-gray-600 mb-4">{suggestion.description}</p>
                          
                          <div className="flex space-x-4 text-sm">
                            <div>
                              <span className="text-gray-500">Impact:</span>
                              <span className={`ml-1 font-medium ${
                                suggestion.impact === 'High' ? 'text-green-600' :
                                suggestion.impact === 'Medium' ? 'text-yellow-600' : 'text-gray-600'
                              }`}>
                                {suggestion.impact}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Effort:</span>
                              <span className={`ml-1 font-medium ${
                                suggestion.effort === 'Low' ? 'text-green-600' :
                                suggestion.effort === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {suggestion.effort}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Timeline:</span>
                              <span className="ml-1 font-medium text-gray-700">{suggestion.timeline}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                        Implement
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white border border-gray-200 rounded-lg text-left hover:shadow-md transition-shadow">
            <TrendingUp className="text-green-600 mb-2" size={20} />
            <h4 className="font-semibold text-gray-900 mb-1">Add Income Source</h4>
            <p className="text-sm text-gray-600">Quickly add new revenue stream</p>
          </button>
          
          <button className="p-4 bg-white border border-gray-200 rounded-lg text-left hover:shadow-md transition-shadow">
            <TrendingDown className="text-red-600 mb-2" size={20} />
            <h4 className="font-semibold text-gray-900 mb-1">Review Expenses</h4>
            <p className="text-sm text-gray-600">Analyze and optimize costs</p>
          </button>
          
          <button className="p-4 bg-white border border-gray-200 rounded-lg text-left hover:shadow-md transition-shadow">
            <Shield className="text-purple-600 mb-2" size={20} />
            <h4 className="font-semibold text-gray-900 mb-1">Tax Planning</h4>
            <p className="text-sm text-gray-600">Optimize tax strategy</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISuggestions;