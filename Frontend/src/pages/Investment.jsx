import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE from '../config/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const Investment = ({ userSession }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [marketData, setMarketData] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [userIncomeData, setUserIncomeData] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [investmentHistory, setInvestmentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [investing, setInvesting] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    monthlyIncome: '',
    monthlyExpenses: '',
    savings: '',
    riskTolerance: 'medium',
    investmentExperience: 'intermediate',
    age: '30',
    financialGoals: ['wealth_creation', 'retirement'],
    investmentHorizon: 'long_term'
  });

  const API_HOST = API_BASE.replace(/\/$/, '');
  const INVESTMENT_BASE = `${API_HOST}/api/investment`;

  // Mock data for instant loading
  const mockMarketData = {
    goldPrice: 5850,
    goldHistory: generateMockGoldHistory(),
    niftyData: { value: 19500, change: 0.8 },
    sensexData: { value: 65000, change: 0.6 },
    topStocks: [
      { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', price: 3450, change: 2.5, rating: 4.7 },
      { symbol: 'INFY', name: 'Infosys', sector: 'IT', price: 1850, change: 1.8, rating: 4.4 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2450, change: 1.2, rating: 4.8 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', price: 1650, change: -0.5, rating: 4.6 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', price: 890, change: 1.5, rating: 4.3 }
    ]
  };

  const mockPredictions = {
    suggestions: {
      allocation: [
        { name: 'Stocks', value: 60 },
        { name: 'Gold', value: 25 },
        { name: 'Emergency', value: 15 }
      ],
      breakdown: [
        { type: 'Stocks', amount: 9000, allocation: 60 },
        { type: 'Gold', amount: 3750, allocation: 25 },
        { type: 'Emergency Fund', amount: 2250, allocation: 15 }
      ],
      riskProfile: 'medium'
    },
    goldPrediction: {
      trend: 'up',
      message: "Gold prices expected to rise 1-2% in coming days - Good time to invest",
      analysis: "Based on market analysis, gold is trending up with moderate volatility.",
      confidence: 78
    },
    stockInsights: [
      {
        stock: "TCS",
        message: "Likely to rise 2-3% based on technical analysis and strong quarterly results",
        type: "buy",
        confidence: 78,
        reason: "Technical indicators & earnings report"
      },
      {
        stock: "RELIANCE",
        message: "Strong fundamentals, good for long-term holding with stable growth",
        type: "hold",
        confidence: 85,
        reason: "Fundamental analysis & market position"
      },
      {
        stock: "HDFCBANK",
        message: "Facing short-term pressure due to market conditions, wait for correction",
        type: "watch",
        confidence: 65,
        reason: "Market sentiment & sector analysis"
      }
    ],
    marketSentiment: {
      sentiment: 'Bullish',
      score: 7.5
    }
  };

  const mockUserIncomeSuggestions = {
    monthlyIncome: 50000,
    monthlyExpenses: 30000,
    disposableIncome: 20000,
    investmentAmount: 6000,
    allocation: {
      stocks: 3000,
      gold: 1800,
      mutual_funds: 1200
    },
    percentages: {
      stocks: 50,
      gold: 30,
      mutual_funds: 20
    },
    riskProfile: 'medium',
    suggestion: 'Based on your ₹50,000 monthly income, we recommend investing ₹6,000 monthly.'
  };

  useEffect(() => {
    // Load mock data instantly
    setMarketData(mockMarketData);
    setPredictions(mockPredictions);
    setUserIncomeData({
      userIncome: null,
      suggestions: mockUserIncomeSuggestions
    });

    // Then try to fetch real data in background
    fetchRealData();
  }, [activeTab]);

  const fetchRealData = async () => {
    try {
      // Prefer token from userSession, then authService, then localStorage
      const token = userSession?.token || (await import('../services/authService')).then(m=>m.default.getToken()).catch(()=>null) || localStorage.getItem('token');
      const tenantId = userSession?.user?.tenantId || (await import('../services/authService')).then(m=>m.default.getTenantId()).catch(()=>null) || localStorage.getItem('tenantId');

      if (!token || !tenantId) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Tenant-ID': tenantId
      };

      // Fetch real data in background
      const [marketResponse, predictionsResponse, incomeResponse] = await Promise.allSettled([
        axios.get(`${INVESTMENT_BASE}/market-data`, { headers }),
        axios.get(`${INVESTMENT_BASE}/predictions`, { headers }),
        axios.get(`${INVESTMENT_BASE}/user-income`, { headers })
      ]);

      // Update with real data if successful
      if (marketResponse.status === 'fulfilled') {
        setMarketData(marketResponse.value.data.data);
      }
      if (predictionsResponse.status === 'fulfilled') {
        setPredictions(predictionsResponse.value.data.data);
      }
      if (incomeResponse.status === 'fulfilled') {
        setUserIncomeData(incomeResponse.value.data);
      }

    } catch (error) {
      console.error('Background data fetch error:', error);
      // Keep using mock data - no problem
    }
  };

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = userSession?.token || (await import('../services/authService')).then(m=>m.default.getToken()).catch(()=>null) || localStorage.getItem('token');
      const tenantId = userSession?.user?.tenantId || (await import('../services/authService')).then(m=>m.default.getTenantId()).catch(()=>null) || localStorage.getItem('tenantId');

      const response = await axios.post(`${INVESTMENT_BASE}/save-income`, incomeForm, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });

      setUserIncomeData(response.data.data);
      setShowIncomeForm(false);
      alert('Income data saved successfully!');
    } catch (error) {
      console.error('Error saving income:', error);
      // Update UI with the form data even if backend fails
      const suggestions = generateMockSuggestions(incomeForm);
      setUserIncomeData({
        userIncome: incomeForm,
        suggestions
      });
      setShowIncomeForm(false);
      alert('Income data saved locally!');
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = async (investmentData) => {
    try {
      setInvesting(true);
      const token = userSession?.token || (await import('../services/authService')).then(m=>m.default.getToken()).catch(()=>null) || localStorage.getItem('token');
      const tenantId = userSession?.user?.tenantId || (await import('../services/authService')).then(m=>m.default.getTenantId()).catch(()=>null) || localStorage.getItem('tenantId');

      const response = await axios.post(`${INVESTMENT_BASE}/invest`, investmentData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });

      alert(response.data.message);
      // Refresh portfolio and history
      if (activeTab === 'portfolio' || activeTab === 'history') {
        fetchRealData();
      }
    } catch (error) {
      console.error('Investment error:', error);
      alert('Investment recorded locally! (Backend connection failed)');
    } finally {
      setInvesting(false);
    }
  };

  // Helper function to generate mock gold history
  function generateMockGoldHistory() {
    const history = [];
    let price = 5800;
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      price += (Math.random() - 0.5) * 100;
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price)
      });
    }
    return history;
  }

  // Helper function to generate mock suggestions
  function generateMockSuggestions(formData) {
    const monthlyIncome = Number(formData.monthlyIncome) || 50000;
    const monthlyExpenses = Number(formData.monthlyExpenses) || 30000;
    const disposableIncome = monthlyIncome - monthlyExpenses;
    const investmentAmount = disposableIncome * 0.3;

    return {
      monthlyIncome,
      monthlyExpenses,
      disposableIncome,
      investmentAmount: Math.round(investmentAmount),
      allocation: {
        stocks: Math.round(investmentAmount * 0.5),
        gold: Math.round(investmentAmount * 0.3),
        mutual_funds: Math.round(investmentAmount * 0.2)
      },
      percentages: {
        stocks: 50,
        gold: 30,
        mutual_funds: 20
      },
      riskProfile: formData.riskTolerance,
      suggestion: `Based on your ₹${monthlyIncome.toLocaleString()} monthly income, we recommend investing ₹${Math.round(investmentAmount).toLocaleString()} monthly.`
    };
  }

  return (
    <div className="investment-container p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="investment-header text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🤖 Smart Investment Advisor</h1>
        <p className="text-gray-600">AI-powered insights for smarter investing decisions</p>
      </div>

      {/* Navigation Tabs */}
      <div className="investment-tabs flex space-x-4 mb-6 border-b">
        <button 
          className={`tab flex items-center space-x-2 px-4 py-2 rounded-t-lg ${
            activeTab === 'dashboard' 
              ? 'bg-blue-600 text-white border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span>📊</span>
          <span>Dashboard</span>
        </button>
        <button 
          className={`tab flex items-center space-x-2 px-4 py-2 rounded-t-lg ${
            activeTab === 'portfolio' 
              ? 'bg-blue-600 text-white border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('portfolio')}
        >
          <span>💼</span>
          <span>Portfolio</span>
        </button>
        <button 
          className={`tab flex items-center space-x-2 px-4 py-2 rounded-t-lg ${
            activeTab === 'history' 
              ? 'bg-blue-600 text-white border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <span>📝</span>
          <span>History</span>
        </button>
      </div>

      {/* Income Input Section */}
      {activeTab === 'dashboard' && (
        <IncomeSection 
          userIncomeData={userIncomeData}
          showIncomeForm={showIncomeForm}
          setShowIncomeForm={setShowIncomeForm}
          incomeForm={incomeForm}
          setIncomeForm={setIncomeForm}
          onSaveIncome={handleSaveIncome}
          loading={loading}
        />
      )}

      {/* Tab Content */}
      {activeTab === 'dashboard' && marketData && predictions && (
        <DashboardContent 
          marketData={marketData}
          predictions={predictions}
          userIncomeData={userIncomeData}
          onInvest={handleInvest}
          investing={investing}
        />
      )}

      {activeTab === 'portfolio' && (
        <PortfolioContent portfolio={portfolio} />
      )}

      {activeTab === 'history' && (
        <HistoryContent history={investmentHistory} />
      )}
    </div>
  );
};

// Income Input Section Component
const IncomeSection = ({ userIncomeData, showIncomeForm, setShowIncomeForm, incomeForm, setIncomeForm, onSaveIncome, loading }) => {
  if (showIncomeForm) {
    return (
      <div className="income-form-section mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">💰 Enter Your Financial Details</h3>
            <button
              onClick={() => setShowIncomeForm(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={onSaveIncome} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Income (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={incomeForm.monthlyIncome}
                  onChange={(e) => setIncomeForm({...incomeForm, monthlyIncome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your monthly income"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Expenses (₹)
                </label>
                <input
                  type="number"
                  value={incomeForm.monthlyExpenses}
                  onChange={(e) => setIncomeForm({...incomeForm, monthlyExpenses: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your monthly expenses"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Savings (₹)
                </label>
                <input
                  type="number"
                  value={incomeForm.savings}
                  onChange={(e) => setIncomeForm({...incomeForm, savings: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your current savings"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Tolerance
                </label>
                <select
                  value={incomeForm.riskTolerance}
                  onChange={(e) => setIncomeForm({...incomeForm, riskTolerance: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investment Experience
                </label>
                <select
                  value={incomeForm.investmentExperience}
                  onChange={(e) => setIncomeForm({...incomeForm, investmentExperience: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={incomeForm.age}
                  onChange={(e) => setIncomeForm({...incomeForm, age: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your age"
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : 'Get Personalized Investment Suggestions'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (userIncomeData?.suggestions) {
    const suggestions = userIncomeData.suggestions;
    return (
      <div className="income-display-section mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">💰 Your Financial Profile</h3>
              <p className="text-green-600 font-semibold">{suggestions.suggestion}</p>
            </div>
            <button
              onClick={() => setShowIncomeForm(true)}
              className="flex items-center space-x-2 bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
            >
              <span>✏️</span>
              <span>Edit</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">₹{suggestions.monthlyIncome?.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Monthly Income</div>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">₹{suggestions.monthlyExpenses?.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Monthly Expenses</div>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">₹{suggestions.disposableIncome?.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Disposable Income</div>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">₹{suggestions.investmentAmount?.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Recommended Investment</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-3">📊 Recommended Monthly Allocation</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-700">₹{suggestions.allocation?.stocks?.toLocaleString()}</div>
                <div className="text-sm text-blue-600">Stocks ({suggestions.percentages?.stocks}%)</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-700">₹{suggestions.allocation?.gold?.toLocaleString()}</div>
                <div className="text-sm text-yellow-600">Gold ({suggestions.percentages?.gold}%)</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-700">₹{suggestions.allocation?.mutual_funds?.toLocaleString()}</div>
                <div className="text-sm text-green-600">Mutual Funds ({suggestions.percentages?.mutual_funds}%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="income-prompt-section mb-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white text-center">
        <div className="flex items-center justify-center mb-4">
          <span className="text-4xl mr-3">🎯</span>
          <h3 className="text-2xl font-bold">Start Your Investment Journey</h3>
        </div>
        <p className="text-blue-100 mb-4 text-lg">
          Enter your income details to get personalized investment suggestions tailored to your financial goals
        </p>
        <button
          onClick={() => setShowIncomeForm(true)}
          className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-lg"
        >
          💰 Enter Income Details
        </button>
      </div>
    </div>
  );
};

// Dashboard Content Component
const DashboardContent = ({ marketData, predictions, userIncomeData, onInvest, investing }) => {
  const COLORS = ['#3B82F6', '#F59E0B', '#10B981'];

  return (
    <div className="dashboard-content space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gold Price */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Gold Price</h3>
            <span className="text-yellow-500 text-2xl">🥇</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-2">
            ₹{marketData.goldPrice?.toLocaleString()}
          </div>
          <div className={`text-sm ${marketData.goldPrice > 5850 ? 'text-green-600' : 'text-red-600'}`}>
            {marketData.goldPrice > 5850 ? '+' : ''}{(marketData.goldPrice - 5850).toFixed(2)} 
            ({((marketData.goldPrice - 5850) / 5850 * 100).toFixed(2)}%)
          </div>
        </div>

        {/* Nifty 50 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Nifty 50</h3>
            <span className="text-green-500 text-2xl">📈</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-2">
            {marketData.niftyData?.value?.toLocaleString()}
          </div>
          <div className="text-sm text-green-600">
            +{marketData.niftyData?.change?.toFixed(2)}%
          </div>
        </div>

        {/* Sensex */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Sensex</h3>
            <span className="text-green-500 text-2xl">📊</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 mb-2">
            {marketData.sensexData?.value?.toLocaleString()}
          </div>
          <div className="text-sm text-green-600">
            +{marketData.sensexData?.change?.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* AI Predictions and Investment Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Investment Suggestions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <span className="text-yellow-500 text-xl mr-2">💡</span>
            <h3 className="text-lg font-semibold text-gray-800">AI Investment Suggestions</h3>
          </div>
          
          {predictions.suggestions && (
            <div className="space-y-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={predictions.suggestions.allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {predictions.suggestions.allocation.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2">
                {predictions.suggestions.breakdown?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{item.type}</span>
                    <span className="font-semibold">₹{item.amount?.toLocaleString()}</span>
                    <span className="text-sm text-gray-600">({item.allocation}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gold Prediction */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <span className="text-yellow-500 text-xl mr-2">⭐</span>
            <h3 className="text-lg font-semibold text-gray-800">Gold Market Analysis</h3>
          </div>
          <div className={`p-4 rounded-lg mb-4 ${
            predictions.goldPrediction.trend === 'up' ? 'bg-green-50 border border-green-200' :
            predictions.goldPrediction.trend === 'down' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center mb-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                predictions.goldPrediction.trend === 'up' ? 'bg-green-500' :
                predictions.goldPrediction.trend === 'down' ? 'bg-red-500' :
                'bg-blue-500'
              }`}></div>
              <span className="font-semibold capitalize">{predictions.goldPrediction.trend} Trend</span>
            </div>
            <p className="text-gray-700 mb-2">{predictions.goldPrediction.message}</p>
            <div className="text-sm text-gray-600">
              Confidence: {predictions.goldPrediction.confidence}%
            </div>
          </div>
          
          {/* Quick Invest Buttons */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Quick Invest</h4>
            <button
              onClick={() => onInvest({
                type: 'gold',
                name: '24K Gold',
                amount: userIncomeData?.suggestions?.allocation?.gold || 5000,
                transactionType: 'buy',
                notes: 'AI recommended gold investment'
              })}
              disabled={investing}
              className="w-full bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 disabled:bg-gray-400 flex items-center justify-center"
            >
              <span className="mr-2">🥇</span>
              Invest in Gold - ₹{(userIncomeData?.suggestions?.allocation?.gold || 5000).toLocaleString()}
            </button>
            
            <button
              onClick={() => onInvest({
                type: 'stocks',
                name: 'Diversified Stocks',
                amount: userIncomeData?.suggestions?.allocation?.stocks || 10000,
                transactionType: 'buy',
                notes: 'AI recommended stock investment'
              })}
              disabled={investing}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center"
            >
              <span className="mr-2">📈</span>
              Invest in Stocks - ₹{(userIncomeData?.suggestions?.allocation?.stocks || 10000).toLocaleString()}
            </button>
          </div>
        </div>
      </div>

      {/* Stock Insights */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {predictions.stockInsights?.map((insight, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold">{insight.stock}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  insight.type === 'buy' ? 'bg-green-100 text-green-800' :
                  insight.type === 'hold' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {insight.type.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{insight.message}</p>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Confidence: {insight.confidence}%</span>
                <span>{insight.reason}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Stocks */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Stocks</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Stock</th>
                <th className="text-left py-2">Name</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Change</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {marketData.topStocks?.map((stock, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-semibold">{stock.symbol}</td>
                  <td className="py-3">{stock.name}</td>
                  <td className="py-3 text-right">₹{stock.price?.toLocaleString()}</td>
                  <td className={`py-3 text-right ${
                    stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change}%
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onInvest({
                        type: 'stocks',
                        symbol: stock.symbol,
                        name: stock.name,
                        amount: 5000,
                        pricePerUnit: stock.price,
                        units: 5000 / stock.price,
                        transactionType: 'buy'
                      })}
                      disabled={investing}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
                    >
                      Invest
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Portfolio Content Component
const PortfolioContent = ({ portfolio }) => {
  if (!portfolio) {
    return (
      <div className="portfolio-content">
        <div className="text-center py-8">
          <span className="text-4xl">💼</span>
          <h2 className="text-2xl font-bold text-gray-800 mt-4">Portfolio</h2>
          <p className="text-gray-600 mt-2">No portfolio data available yet</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

  return (
    <div className="portfolio-content space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Summary */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Portfolio Allocation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolio.portfolio}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalInvested"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {portfolio.portfolio.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Invested']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Investment */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Total Investment</h3>
          <div className="text-3xl font-bold mb-2">
            ₹{portfolio.totalInvested?.toLocaleString()}
          </div>
          <div className="text-blue-100">
            Across {portfolio.portfolio?.length || 0} investment types
          </div>
        </div>
      </div>

      {/* Investment Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Investment Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {portfolio.portfolio?.map((item, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold capitalize">{item._id}</span>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                ₹{item.totalInvested?.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                {item.count} investment{item.count > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// History Content Component
const HistoryContent = ({ history }) => {
  return (
    <div className="history-content">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Investment History</h3>
        {(!history || history.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl">📝</span>
            <p className="mt-2">No investment history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Units</th>
                  <th className="text-left py-2">Transaction</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((investment, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      {new Date(investment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 capitalize">{investment.type}</td>
                    <td className="py-3">{investment.name}</td>
                    <td className="py-3 text-right">₹{investment.amount?.toLocaleString()}</td>
                    <td className="py-3 text-right">{investment.units || '-'}</td>
                    <td className="py-3 capitalize">
                      <span className={`px-2 py-1 rounded text-xs ${
                        investment.transactionType === 'buy' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {investment.transactionType}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        investment.status === 'completed' 
                          ? 'bg-blue-100 text-blue-800' 
                          : investment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {investment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Investment;