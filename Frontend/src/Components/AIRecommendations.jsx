// components/AIRecommendations.jsx - ULTRA SAFE VERSION
import React from 'react';

const AIRecommendations = ({ recommendations = [] }) => {
  // Ultra-safe data processing - no .replace() calls at all
  const processRecommendations = () => {
    try {
      if (!Array.isArray(recommendations)) {
        return [];
      }

      return recommendations.map((rec, index) => {
        if (!rec || typeof rec !== 'object') {
          return getFallbackRecommendation(index);
        }

        return {
          id: rec.id || `rec-${index}-${Math.random().toString(36).substr(2, 9)}`,
          title: String(rec.title || 'Tax Optimization Tip').trim(),
          description: String(rec.description || 'Consider consulting with a tax advisor for personalized recommendations.').trim(),
          priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
          potentialSavings: typeof rec.potentialSavings === 'number' ? rec.potentialSavings : 0,
          category: String(rec.category || 'general').trim(),
          action: String(rec.action || 'review').trim()
        };
      });
    } catch (error) {
      console.error('Error in AIRecommendations:', error);
      return getFallbackRecommendations();
    }
  };

  const getFallbackRecommendation = (index) => ({
    id: `fallback-${index}-${Date.now()}`,
    title: 'Tax Optimization Tip',
    description: 'Consider consulting with a tax advisor for personalized recommendations.',
    priority: 'medium',
    potentialSavings: 0,
    category: 'general',
    action: 'review'
  });

  const getFallbackRecommendations = () => [
    {
      id: 'fallback-1',
      title: 'Maximize Section 80C Deductions',
      description: 'Invest in tax-saving instruments like ELSS, PPF, or life insurance to claim up to ₹1.5 lakh under Section 80C.',
      priority: 'high',
      potentialSavings: 45000,
      category: 'deductions'
    },
    {
      id: 'fallback-2',
      title: 'Health Insurance Premium',
      description: 'Claim up to ₹25,000 for health insurance premiums under Section 80D for tax savings.',
      priority: 'medium',
      potentialSavings: 7500,
      category: 'deductions'
    }
  ];

  const safeRecommendations = processRecommendations();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'low': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityTextColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-800';
      case 'medium': return 'text-yellow-800';
      case 'low': return 'text-green-800';
      default: return 'text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white text-lg">AI</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Tax Recommendations</h3>
          <p className="text-sm text-gray-500">Smart suggestions to optimize your taxes</p>
        </div>
      </div>

      <div className="space-y-4">
        {safeRecommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)} ${getPriorityTextColor(rec.priority)} transition-all hover:shadow-sm`}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-base flex-1 pr-4">{rec.title}</h4>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                rec.priority === 'high' ? 'bg-red-200 text-red-900' :
                rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                'bg-green-200 text-green-900'
              }`}>
                {rec.priority.toUpperCase()}
              </span>
            </div>
            
            <p className="text-sm mb-3 opacity-90 leading-relaxed">{rec.description}</p>
            
            <div className="flex justify-between items-center">
              <span className="text-xs bg-black bg-opacity-10 px-2 py-1 rounded">
                {rec.category}
              </span>
              {rec.potentialSavings > 0 && (
                <span className="text-sm font-bold text-green-700">
                  Save ₹{rec.potentialSavings.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {safeRecommendations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-3">📊</div>
          <p>No recommendations available</p>
          <p className="text-sm mt-1">Complete your profile to get personalized tax tips</p>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;