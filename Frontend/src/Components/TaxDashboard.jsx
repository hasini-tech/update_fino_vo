// frontend/src/Components/TaxDashboard.jsx - Updated UI
import React, { useState, useEffect } from 'react';
import taxService from '../services/taxService';

// Enhanced AI Recommendations Component
const AIRecommendations = ({ recommendations = [], taxData }) => {
  const processRecommendations = () => {
    try {
      if (!recommendations || !Array.isArray(recommendations)) {
        return getFallbackRecommendations();
      }

      return recommendations.map((rec, index) => ({
        id: rec.id || `rec-${index}-${Date.now()}`,
        title: rec.title ? String(rec.title) : 'Tax Optimization Tip',
        description: rec.description ? String(rec.description) : 'Consider consulting with a tax advisor for personalized recommendations.',
        category: rec.category ? String(rec.category) : 'general',
        priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
        potentialSavings: typeof rec.potentialSavings === 'number' ? rec.potentialSavings : 0,
        action: rec.action ? String(rec.action).trim() : 'review'
      }));
    } catch (error) {
      console.error('Error processing AI recommendations:', error);
      return getFallbackRecommendations();
    }
  };

  const getFallbackRecommendations = () => [
    {
      id: 'fallback-1',
      title: 'Maximize Section 80C Deductions',
      description: 'Invest up to ₹1.5 lakh in tax-saving instruments like ELSS, PPF, or life insurance under Section 80C.',
      priority: 'high',
      potentialSavings: 45000,
      category: 'deductions'
    },
    {
      id: 'fallback-2',
      title: 'Health Insurance Premium',
      description: 'Claim up to ₹25,000 for health insurance premiums under Section 80D for additional tax savings.',
      priority: 'medium',
      potentialSavings: 7500,
      category: 'deductions'
    }
  ];

  const safeRecommendations = processRecommendations();

  const getPriorityStyles = (priority) => {
    const styles = {
      high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-500 text-white' },
      medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-500 text-white' },
      low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-500 text-white' }
    };
    return styles[priority] || styles.medium;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center mb-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mr-4 shadow-sm">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Smart Tax Insights</h3>
          <p className="text-sm text-gray-500">Personalized suggestions to optimize your tax savings</p>
        </div>
      </div>

      {safeRecommendations.length > 0 ? (
        <div className="space-y-4">
          {safeRecommendations.map((rec) => {
            const styles = getPriorityStyles(rec.priority);
            return (
              <div
                key={rec.id}
                className={`p-4 rounded-lg border-2 ${styles.bg} ${styles.border} transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 flex-1 pr-2">{rec.title}</h4>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles.badge} shadow-sm`}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{rec.description}</p>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full capitalize font-medium">
                    {rec.category}
                  </span>
                  {rec.potentialSavings > 0 && (
                    <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      Save ₹{rec.potentialSavings.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <span className="text-2xl">💡</span>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations Available</h4>
          <p className="text-gray-500 text-sm">
            Complete your tax profile to get personalized AI recommendations.
          </p>
        </div>
      )}
    </div>
  );
};

// Enhanced Tax Progress Visualization
const TaxProgressBar = ({ label, amount, total, color = 'blue', suffix = '' }) => {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          ₹{amount?.toLocaleString('en-IN') || '0'}{suffix}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ease-out ${colorClasses[color]} shadow-sm`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-right mt-1">
        <span className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</span>
      </div>
    </div>
  );
};

// Main Tax Dashboard Component
const TaxDashboard = ({ userSession }) => {
  const [dashboardData, setDashboardData] = useState({
    taxSummary: null,
    aiRecommendations: [],
    taxRates: null,
    upcomingDeadlines: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setDashboardData(prev => ({ ...prev, loading: true, error: null }));

        const [taxSummaryRes, aiRecsRes, taxRatesRes, deadlinesRes] = await Promise.allSettled([
          taxService.getCurrentTaxCalculation(),
          taxService.getAIRecommendations(),
          taxService.getTaxRates(),
          taxService.getUpcomingDeadlines()
        ]);

        const newData = {
          loading: false,
          error: null
        };

        // Process all responses with enhanced error handling
        if (taxSummaryRes.status === 'fulfilled') {
          newData.taxSummary = taxSummaryRes.value?.data?.data || null;
        }

        if (aiRecsRes.status === 'fulfilled') {
          const recsData = aiRecsRes.value?.data?.data;
          newData.aiRecommendations = Array.isArray(recsData?.recommendations) ? recsData.recommendations : [];
        } else {
          newData.aiRecommendations = [];
        }

        if (taxRatesRes.status === 'fulfilled') {
          newData.taxRates = taxRatesRes.value?.data?.data || null;
        }

        if (deadlinesRes.status === 'fulfilled') {
          newData.upcomingDeadlines = Array.isArray(deadlinesRes.value?.data?.data) ? deadlinesRes.value.data.data : [];
        }

        setDashboardData(prev => ({ ...prev, ...newData }));

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setDashboardData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load dashboard data',
          aiRecommendations: []
        }));
      }
    };

    fetchDashboardData();
  }, []);

  const { taxSummary, aiRecommendations, taxRates, upcomingDeadlines, loading, error } = dashboardData;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl p-6">
              <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-40"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-yellow-800">Unable to Load Dashboard</h3>
            <p className="text-yellow-700 mt-1">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-1">Total Income</p>
              <p className="text-3xl font-bold text-gray-900">
                ₹{taxSummary?.totalIncome?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-blue-500 mt-1">Annual Gross Income</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-lg font-bold">₹</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-600 mb-1">Taxable Income</p>
              <p className="text-3xl font-bold text-gray-900">
                ₹{taxSummary?.taxableIncome?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-green-500 mt-1">After Deductions</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-lg">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-600 mb-1">Tax Liability</p>
              <p className="text-3xl font-bold text-red-600">
                ₹{taxSummary?.taxLiability?.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-red-500 mt-1">
                {taxSummary?.effectiveTaxRate ? `Effective Rate: ${taxSummary.effectiveTaxRate.toFixed(1)}%` : 'Annual Tax'}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-lg">💸</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-600 mb-1">Optimization Score</p>
              <p className="text-3xl font-bold text-purple-600">
                {taxSummary?.taxOptimizationScore || 0}%
              </p>
              <p className="text-xs text-purple-500 mt-1">Tax Efficiency</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-lg">⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Progress Visualization */}
      {taxSummary && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Tax Calculation Breakdown</h3>
          <div className="max-w-4xl">
            <TaxProgressBar
              label="Total Income"
              amount={taxSummary.totalIncome}
              total={taxSummary.totalIncome}
              color="blue"
            />
            
            <TaxProgressBar
              label="Deductions Applied"
              amount={taxSummary.totalDeductions}
              total={taxSummary.totalIncome}
              color="green"
            />
            
            <TaxProgressBar
              label="Taxable Income"
              amount={taxSummary.taxableIncome}
              total={taxSummary.totalIncome}
              color="purple"
            />
            
            <TaxProgressBar
              label="Tax Liability"
              amount={taxSummary.taxLiability}
              total={taxSummary.taxableIncome}
              color="red"
            />

            {taxSummary.monthlyTax && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Estimated Monthly Tax</span>
                  <span className="text-lg font-bold text-gray-900">
                    ₹{taxSummary.monthlyTax.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Recommendations */}
        <div>
          <AIRecommendations recommendations={aiRecommendations} taxData={taxSummary} />
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4 shadow-sm">
              <span className="text-white text-lg">📅</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Upcoming Deadlines</h3>
              <p className="text-sm text-gray-500">Important tax filing dates</p>
            </div>
          </div>

          {upcomingDeadlines.length > 0 ? (
            <div className="space-y-4">
              {upcomingDeadlines.slice(0, 5).map((deadline, index) => (
                <div key={deadline.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{deadline.title || 'Tax Deadline'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {deadline.dueDate ? new Date(deadline.dueDate).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    deadline.priority === 'high' ? 'bg-red-500 text-white' :
                    deadline.priority === 'medium' ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  } shadow-sm`}>
                    {deadline.priority || 'medium'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-3 opacity-50">📅</div>
              <p className="text-sm font-medium">No upcoming deadlines</p>
              <p className="text-xs mt-1">All tax obligations are up to date</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Tax Rates Information */}
      {taxRates && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Current Tax Rates</h3>
              <p className="text-sm text-gray-500 mt-1">
                {taxRates.financialYear} • {taxRates.source}
              </p>
            </div>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {taxSummary?.regime === 'old' ? 'Old Regime' : 'New Regime'}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taxRates.brackets?.map((bracket, index) => (
              <div key={index} className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <p className="text-sm font-semibold text-gray-900 mb-2">{bracket.range}</p>
                <p className="text-2xl font-bold text-blue-600 mb-2">{bracket.rate}%</p>
                <p className="text-xs text-gray-500 leading-relaxed">{bracket.description}</p>
              </div>
            ))}
          </div>
          
          {taxRates.deductions && (
            <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <h4 className="text-lg font-semibold text-green-800 mb-4">Available Deductions</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(taxRates.deductions).map(([key, value]) => (
                  <div key={key} className="text-center p-3 bg-white rounded-lg border border-green-100">
                    <p className="text-xs font-medium text-green-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-sm font-bold text-green-700 mt-1">₹{value?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaxDashboard;