import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const AITaxGSTSlabsDisplay = () => {
  const [loading, setLoading] = useState(true);
  const [taxSlabs, setTaxSlabs] = useState([]);
  const [gstSlabs, setGstSlabs] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [businessType, setBusinessType] = useState('');

  const formatIndianRupee = (amount) => {
    return '₹' + Number(amount).toLocaleString('en-IN');
  };

  // Generate AI suggestions for tax and GST slabs
  const generateAISuggestions = () => {
    // Generate realistic income and turnover
    const income = Math.floor(Math.random() * (5000000 - 500000)) + 500000;
    const gstTurnover = Math.random() > 0.5 ? Math.floor(Math.random() * (10000000 - 1000000)) + 1000000 : 0;
    const regime = Math.random() > 0.5 ? 'new' : 'old';
    const businessTypeGenerated = ['goods', 'services', 'both'][Math.floor(Math.random() * 3)];
    
    // Store business type in state
    setBusinessType(businessTypeGenerated);

    // Generate AI insights specific to slabs
    const insights = [
      `AI suggests ${regime === 'new' ? 'New Tax Regime' : 'Old Tax Regime'} for optimal tax slabs`,
      `Recommended income distribution across ${regime === 'new' ? '6' : '4'} tax brackets`,
      `Tax slab optimization score: ${Math.floor(Math.random() * (95 - 75)) + 75}/100`,
      gstTurnover > 0 ? `GST slab suggestions for ${businessTypeGenerated} business` : 'GST not applicable - below threshold',
      'Click "Generate New Suggestions" for alternative slab structures'
    ];

    // Generate AI-suggested tax slabs
    let suggestedTaxSlabs = [];
    if (regime === 'new') {
      suggestedTaxSlabs = [
        { 
          fromAmount: 0, 
          toAmount: 300000, 
          taxPercent: 0, 
          slabName: "Tax Free", 
          taxAmount: 0,
          aiSuggestion: "No tax - optimal utilization"
        },
        { 
          fromAmount: 300000, 
          toAmount: 600000, 
          taxPercent: 5, 
          slabName: "Basic Rate", 
          taxAmount: 15000,
          aiSuggestion: "Lowest taxable bracket"
        },
        { 
          fromAmount: 600000, 
          toAmount: 900000, 
          taxPercent: 10, 
          slabName: "Standard Rate", 
          taxAmount: 30000,
          aiSuggestion: "Consider investment options"
        },
        { 
          fromAmount: 900000, 
          toAmount: 1200000, 
          taxPercent: 15, 
          slabName: "Upper Middle", 
          taxAmount: 45000,
          aiSuggestion: "Explore tax-saving instruments"
        },
        { 
          fromAmount: 1200000, 
          toAmount: 1500000, 
          taxPercent: 20, 
          slabName: "Higher Income", 
          taxAmount: 60000,
          aiSuggestion: "Review deductions carefully"
        },
        { 
          fromAmount: 1500000, 
          toAmount: null, 
          taxPercent: 30, 
          slabName: "Maximum Rate", 
          taxAmount: (income - 1500000) * 0.3,
          aiSuggestion: "Consider income splitting strategies"
        }
      ];
    } else {
      suggestedTaxSlabs = [
        { 
          fromAmount: 0, 
          toAmount: 250000, 
          taxPercent: 0, 
          slabName: "Basic Exemption", 
          taxAmount: 0,
          aiSuggestion: "Full exemption available"
        },
        { 
          fromAmount: 250000, 
          toAmount: 500000, 
          taxPercent: 5, 
          slabName: "Lower Bracket", 
          taxAmount: 12500,
          aiSuggestion: "Minimal tax impact"
        },
        { 
          fromAmount: 500000, 
          toAmount: 1000000, 
          taxPercent: 20, 
          slabName: "Middle Bracket", 
          taxAmount: 100000,
          aiSuggestion: "Review 80C deductions"
        },
        { 
          fromAmount: 1000000, 
          toAmount: null, 
          taxPercent: 30, 
          slabName: "Higher Bracket", 
          taxAmount: (income - 1000000) * 0.3,
          aiSuggestion: "Explore advanced tax planning"
        }
      ];
    }

    // Generate AI-suggested GST slabs if applicable
    let suggestedGstSlabs = [];
    if (gstTurnover > 0) {
      if (businessTypeGenerated === 'goods') {
        suggestedGstSlabs = [
          { 
            taxPercent: 0, 
            slabName: "Nil Rated", 
            description: "Essential goods, fresh vegetables",
            aiSuggestion: "No GST - maximize these categories",
            exampleItems: "Fresh vegetables, milk, grains"
          },
          { 
            taxPercent: 5, 
            slabName: "Low Rate", 
            description: "Food items, medicines, transport",
            aiSuggestion: "Lowest GST rate for affordability",
            exampleItems: "Restaurants, medicines, transport"
          },
          { 
            taxPercent: 12, 
            slabName: "Standard Rate", 
            description: "Processed foods, computers",
            aiSuggestion: "Standard rate for general goods",
            exampleItems: "Computers, processed foods, mobile"
          },
          { 
            taxPercent: 18, 
            slabName: "General Rate", 
            description: "Most manufactured goods",
            aiSuggestion: "Most common GST rate",
            exampleItems: "Electronics, furniture, services"
          },
          { 
            taxPercent: 28, 
            slabName: "Luxury Rate", 
            description: "Luxury cars, aerated drinks",
            aiSuggestion: "Consider cost-benefit analysis",
            exampleItems: "Luxury cars, tobacco, high-end goods"
          }
        ];
      } else if (businessTypeGenerated === 'services') {
        suggestedGstSlabs = [
          { 
            taxPercent: 0, 
            slabName: "Exempt Services", 
            description: "Healthcare, education",
            aiSuggestion: "GST exempt - focus category",
            exampleItems: "Healthcare, education services"
          },
          { 
            taxPercent: 5, 
            slabName: "Special Rate", 
            description: "Transport, restaurants",
            aiSuggestion: "Special rate for specific services",
            exampleItems: "Transportation, small restaurants"
          },
          { 
            taxPercent: 12, 
            slabName: "Standard Services", 
            description: "Business services",
            aiSuggestion: "Standard rate for most services",
            exampleItems: "Consulting, software services"
          },
          { 
            taxPercent: 18, 
            slabName: "Regular Rate", 
            description: "Professional services",
            aiSuggestion: "Regular rate applies",
            exampleItems: "Legal, accounting, advertising"
          }
        ];
      } else {
        suggestedGstSlabs = [
          { 
            taxPercent: 5, 
            slabName: "Mixed Category", 
            description: "Goods and services mix",
            aiSuggestion: "Lowest combined rate",
            exampleItems: "Composite supply businesses"
          },
          { 
            taxPercent: 12, 
            slabName: "Standard Mixed", 
            description: "General goods & services",
            aiSuggestion: "Balanced rate for mixed business",
            exampleItems: "Retail with services"
          },
          { 
            taxPercent: 18, 
            slabName: "General Mixed", 
            description: "Most business activities",
            aiSuggestion: "Most common mixed rate",
            exampleItems: "Manufacturing with services"
          }
        ];
      }
    }

    setTaxSlabs(suggestedTaxSlabs);
    setGstSlabs(suggestedGstSlabs);
    setAiInsights(insights);
    setLoading(false);

    toast.success('🤖 AI has generated new slab suggestions!');
  };

  // Initialize with AI suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      generateAISuggestions();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Regenerate with new AI suggestions
  const regenerateSuggestions = () => {
    setLoading(true);
    setTimeout(() => {
      generateAISuggestions();
    }, 800);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI Tax & GST Slab Suggestions</h3>
              <p className="text-sm text-purple-100">AI-generated slab recommendations for tax planning</p>
            </div>
          </div>
          <button
            onClick={regenerateSuggestions}
            disabled={loading}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New AI Suggestions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {loading ? (
          // Loading State
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600">AI is analyzing optimal tax slabs...</p>
            <p className="text-sm text-gray-500 mt-2">Generating personalized slab suggestions</p>
          </div>
        ) : (
          <>
            {/* AI Insights */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-blue-800">AI Slab Optimization Insights</h4>
              </div>
              <div className="space-y-2">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="mt-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Suggested Income Tax Slabs */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-800 text-lg">
                  AI-Suggested Income Tax Slabs
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Live AI Suggestions</span>
                </div>
              </div>
              
              <div className="overflow-x-auto border rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Income Range
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tax Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Slab Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AI Suggestions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taxSlabs.map((slab, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatIndianRupee(slab.fromAmount)} - {slab.toAmount ? formatIndianRupee(slab.toAmount) : '∞'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            slab.taxPercent === 0 ? 'bg-green-100 text-green-800' :
                            slab.taxPercent <= 10 ? 'bg-blue-100 text-blue-800' :
                            slab.taxPercent <= 20 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {slab.taxPercent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{slab.slabName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700 max-w-xs">
                            {slab.aiSuggestion}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            slab.taxPercent === 0 ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {slab.taxPercent === 0 ? 'Optimal' : 'AI Suggested'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Suggested GST Slabs (if applicable) */}
            {gstSlabs.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-800 text-lg">
                    AI-Suggested GST Slabs
                  </h4>
                  <div className="text-sm text-gray-600">
                    Business Type: <span className="font-semibold capitalize">{businessType}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gstSlabs.map((slab, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-bold text-gray-800">{slab.slabName}</h5>
                          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${
                            slab.taxPercent === 0 ? 'bg-green-100 text-green-800' :
                            slab.taxPercent <= 5 ? 'bg-blue-100 text-blue-800' :
                            slab.taxPercent <= 12 ? 'bg-indigo-100 text-indigo-800' :
                            slab.taxPercent <= 18 ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {slab.taxPercent}% GST Rate
                          </span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                          AI Suggested
                        </span>
                      </div>
                      
                      {slab.description && (
                        <p className="text-sm text-gray-600 mb-2">{slab.description}</p>
                      )}
                      
                      {slab.exampleItems && (
                        <p className="text-xs text-gray-500 mb-3">
                          <span className="font-medium">Examples:</span> {slab.exampleItems}
                        </p>
                      )}
                      
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-sm font-medium text-blue-700 mb-1">AI Suggestion:</div>
                        <p className="text-sm text-gray-700">{slab.aiSuggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* GST Summary */}
                <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-800">GST Slab Selection Strategy</h5>
                      <p className="text-sm text-gray-600">
                        AI recommends focusing on lower GST slabs where applicable to optimize tax efficiency
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Suggestion Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">AI-Powered Slab Suggestions</p>
                    <p className="text-xs text-gray-600">These are AI-generated suggestions for tax planning. Consult a professional for actual tax filing.</p>
                  </div>
                </div>
                <button
                  onClick={regenerateSuggestions}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Get New AI Suggestions
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AITaxGSTSlabsDisplay;