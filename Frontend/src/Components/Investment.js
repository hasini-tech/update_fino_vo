// src/components/Investment.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingCart, Star,
  Lightbulb, AlertTriangle, DollarSign, Gem,
  History, Portfolio
} from 'lucide-react';

const Investment = ({ userSession }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [marketData, setMarketData] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [userFinance, setUserFinance] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [investmentHistory, setInvestmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState(false);

  const API_BASE = 'http://localhost:5000/api/investment';

  useEffect(() => {
    fetchInvestmentData();
  }, [activeTab]);

  const fetchInvestmentData = async () => {
    try {
      setLoading(true);
      const token = userSession?.token || localStorage.getItem('token');
      const tenantId = userSession?.user?.tenantId || localStorage.getItem('tenantId');

      const headers = {
        Authorization: `Bearer ${token}`,
        'Tenant-ID': tenantId
      };

      const endpoints = {
        dashboard: [
          axios.get(`${API_BASE}/market-data`, { headers }),
          axios.get(`${API_BASE}/predictions`, { headers }),
          axios.get(`${API_BASE}/user-finance`, { headers })
        ],
        portfolio: [
          axios.get(`${API_BASE}/portfolio`, { headers })
        ],
        history: [
          axios.get(`${API_BASE}/history`, { headers })
        ]
      };

      const requests = endpoints[activeTab] || endpoints.dashboard;
      const responses = await Promise.all(requests);

      if (activeTab === 'dashboard') {
        setMarketData(responses[0].data.data);
        setPredictions(responses[1].data.data);
        setUserFinance(responses[2].data.data);
      } else if (activeTab === 'portfolio') {
        setPortfolio(responses[0].data.data);
      } else if (activeTab === 'history') {
        setInvestmentHistory(responses[0].data.data.investments);
      }

    } catch (error) {
      console.error('Error fetching investment data:', error);
      alert('Failed to load investment data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = async (investmentData) => {
    try {
      setInvesting(true);
      const token = userSession?.token || localStorage.getItem('token');
      const tenantId = userSession?.user?.tenantId || localStorage.getItem('tenantId');

      const response = await axios.post(`${API_BASE}/invest`, investmentData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });

      alert(response.data.message);
      fetchInvestmentData(); // Refresh data
    } catch (error) {
      console.error('Investment error:', error);
      alert(error.response?.data?.message || 'Investment failed');
    } finally {
      setInvesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="investment-container p-6">
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
          <TrendingUp size={18} />
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
          <Portfolio size={18} />
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
          <History size={18} />
          <span>History</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <DashboardContent 
          marketData={marketData}
          predictions={predictions}
          userFinance={userFinance}
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

// Sub-components for different tabs
const DashboardContent = ({ marketData, predictions, userFinance, onInvest, investing }) => {
  if (!marketData || !predictions) return <div className="text-center py-8">Loading dashboard data...</div>;

  const COLORS = ['#0088FE', '#FFBB28', '#00C49F'];

  return (
    <div className="dashboard-content">
      {/* Market Overview */}
      <div className="market-overview mb-6">
        <div className="market-card bg-white rounded-lg shadow-md p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="market-item flex items-center space-x-4 p-4 border rounded-lg">
            <DollarSign className="icon text-blue-600" size={24} />
            <div className="market-info">
              <span className="label text-gray-600 text-sm">Nifty 50</span>
              <div className="value text-xl font-bold text-gray-800">₹{marketData.niftyData?.value?.toLocaleString() || '0'}</div>
              <span className={`change flex items-center space-x-1 text-sm ${
                marketData.niftyData?.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {marketData.niftyData?.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(marketData.niftyData?.change || 0).toFixed(2)}%</span>
              </span>
            </div>
          </div>
          
          <div className="market-item flex items-center space-x-4 p-4 border rounded-lg">
            <TrendingUp className="icon text-green-600" size={24} />
            <div className="market-info">
              <span className="label text-gray-600 text-sm">Sensex</span>
              <div className="value text-xl font-bold text-gray-800">₹{marketData.sensexData?.value?.toLocaleString() || '0'}</div>
              <span className={`change flex items-center space-x-1 text-sm ${
                marketData.sensexData?.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {marketData.sensexData?.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>{Math.abs(marketData.sensexData?.change || 0).toFixed(2)}%</span>
              </span>
            </div>
          </div>
          
          <div className="market-item flex items-center space-x-4 p-4 border rounded-lg">
            <Gem className="icon text-yellow-600" size={24} />
            <div className="market-info">
              <span className="label text-gray-600 text-sm">Gold</span>
              <div className="value text-xl font-bold text-gray-800">₹{marketData.goldPrice}/g</div>
              <span className="change text-gray-500 text-sm">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="investment-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="investment-column space-y-6">
          {/* Smart Suggestions */}
          <div className="investment-card bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">💡 Smart Investment Suggestions</h3>
            <div className="suggestion-content flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="allocation-chart">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={predictions.suggestions?.allocation || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(predictions.suggestions?.allocation || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="suggestion-details flex-1 space-y-3">
                {(predictions.suggestions?.breakdown || []).map((item, index) => (
                  <div key={index} className="suggestion-item flex justify-between items-center p-3 border rounded-lg">
                    <span className="type font-medium text-gray-700">{item.type}</span>
                    <span className="amount font-bold text-green-600">₹{item.amount?.toLocaleString()}</span>
                    <span className="allocation text-gray-500">{item.allocation}%</span>
                    <button 
                      className="invest-btn bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                      onClick={() => onInvest({
                        type: item.type.toLowerCase().includes('stock') ? 'stocks' : 
                              item.type.toLowerCase().includes('gold') ? 'gold' : 'other',
                        name: item.type,
                        amount: item.amount,
                        transactionType: 'buy'
                      })}
                      disabled={investing}
                    >
                      {investing ? 'Investing...' : 'Invest'}
                    </button>
                  </div>
                ))}
                
                <div className="risk-profile mt-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Risk Profile: <strong className="text-blue-600">{predictions.suggestions?.riskProfile}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Gold Advisor */}
          <div className="investment-card bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🥇 Gold Investment Advisor</h3>
            <div className="gold-content space-y-4">
              <div className="gold-price-section flex justify-between items-center">
                <div className="current-price">
                  <span className="price text-2xl font-bold text-gray-800">₹{marketData.goldPrice}</span>
                  <span className="unit text-gray-600 ml-2">per gram</span>
                </div>
                <div className={`recommendation flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  predictions.goldPrediction?.trend === 'up' ? 'bg-green-100 text-green-800' : 
                  predictions.goldPrediction?.trend === 'down' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <ShoppingCart size={18} />
                  <span className="text-sm font-medium">{predictions.goldPrediction?.message}</span>
                </div>
              </div>

              <div className="gold-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={marketData.goldHistory || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#FFD700" 
                      strokeWidth={2}
                      name="Gold Price (₹)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="prediction-info p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">AI Prediction</h4>
                <p className="text-gray-700 text-sm mb-2">{predictions.goldPrediction?.analysis}</p>
                <div className="confidence text-blue-600 text-sm font-medium">
                  Confidence: {predictions.goldPrediction?.confidence}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="investment-column space-y-6">
          {/* Stock Advisor */}
          <div className="investment-card bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📈 Stock Market Advisor</h3>
            <div className="stock-content">
              <div className="stock-list">
                <h4 className="font-semibold text-gray-700 mb-3">Top Stock Picks</h4>
                <div className="space-y-3">
                  {(marketData.topStocks || []).slice(0, 5).map(stock => (
                    <div key={stock.symbol} className="stock-item flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                      <div className="stock-info">
                        <div className="symbol font-bold text-gray-800">{stock.symbol}</div>
                        <div className="name text-sm text-gray-600">{stock.name}</div>
                        <div className="sector text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{stock.sector}</div>
                      </div>
                      <div className="stock-performance text-right">
                        <div className="price font-semibold text-gray-800">₹{stock.price?.toLocaleString()}</div>
                        <span className={`change flex items-center justify-end space-x-1 text-sm ${
                          stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stock.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          <span>{Math.abs(stock.change || 0).toFixed(2)}%</span>
                        </span>
                      </div>
                      <div className="stock-rating flex items-center space-x-1">
                        <Star fill="gold" size={16} className="text-yellow-500" />
                        <span className="text-sm text-gray-600">{stock.rating || '4.5'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="investment-card bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🤖 AI Stock Insights</h3>
            <div className="insights-content space-y-4">
              <div className="sentiment-section">
                <h4 className="font-semibold text-gray-700 mb-2">Market Sentiment</h4>
                <div className={`sentiment flex justify-between items-center p-3 rounded-lg ${
                  predictions.marketSentiment?.sentiment?.toLowerCase() === 'bullish' 
                    ? 'bg-green-100 text-green-800' 
                    : predictions.marketSentiment?.sentiment?.toLowerCase() === 'bearish'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <span className="font-medium">{predictions.marketSentiment?.sentiment}</span>
                  <span className="text-sm">Score: {predictions.marketSentiment?.score}/10</span>
                </div>
              </div>

              <div className="insights-list space-y-3">
                {(predictions.stockInsights || []).map((insight, index) => (
                  <div key={index} className="insight-item flex space-x-3 p-3 border rounded-lg">
                    <div className="insight-icon">
                      {insight.type === 'buy' ? 
                        <TrendingUp className="text-green-600" size={20} /> : 
                        <AlertTriangle className="text-red-600" size={20} />
                      }
                    </div>
                    <div className="insight-content flex-1">
                      <div className="insight-header flex justify-between items-start mb-2">
                        <span className="stock font-semibold text-gray-800">{insight.stock}</span>
                        <span className="confidence text-sm text-blue-600">{insight.confidence}% confidence</span>
                      </div>
                      <p className="insight-message text-sm text-gray-700 mb-2">{insight.message}</p>
                      <span className="insight-reason text-xs text-gray-500">Based on: {insight.reason}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ai-tips flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                <Lightbulb className="tip-icon text-purple-600" size={18} />
                <p className="text-sm text-purple-700">AI analyzes market trends, news sentiment, and technical indicators</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PortfolioContent = ({ portfolio }) => {
  if (!portfolio) return <div className="text-center py-8">Loading portfolio...</div>;

  return (
    <div className="portfolio-content">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Investment Portfolio</h2>
      <div className="portfolio-summary grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="total-invested bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Invested</h3>
          <span className="amount text-3xl font-bold text-green-600">₹{portfolio.totalInvested?.toLocaleString()}</span>
        </div>
        
        <div className="allocation-chart bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Portfolio Allocation</h3>
          <div className="chart-placeholder text-center text-gray-500 py-8">
            Portfolio allocation chart will be displayed here
          </div>
        </div>
      </div>
      
      <div className="portfolio-breakdown bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Breakdown by Type</h3>
        <div className="breakdown-grid space-y-3">
          {(portfolio.portfolio || []).map((item, index) => (
            <div key={index} className="breakdown-item flex justify-between items-center p-3 border rounded-lg">
              <span className="type font-medium text-gray-700 capitalize">{item._id}</span>
              <span className="amount font-semibold text-gray-800">₹{item.totalInvested?.toLocaleString()}</span>
              <span className="percentage text-blue-600 font-medium">
                {((item.totalInvested / portfolio.totalInvested) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HistoryContent = ({ history }) => {
  return (
    <div className="history-content">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Investment History</h2>
      <div className="history-list bg-white rounded-lg shadow-md">
        {(!history || history.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            No investments yet. Start investing to see your history here.
          </div>
        ) : (
          <div className="divide-y">
            {history.map(investment => (
              <div key={investment.id} className="history-item flex justify-between items-center p-4 hover:bg-gray-50">
                <div className="investment-info">
                  <div className="type font-semibold text-gray-800 capitalize">{investment.type}</div>
                  <div className="name text-sm text-gray-600">{investment.name}</div>
                  <div className="date text-xs text-gray-500">
                    {new Date(investment.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div className="investment-amount text-right">
                  <div className="amount text-lg font-bold text-green-600">₹{investment.amount?.toLocaleString()}</div>
                  <span className={`status text-xs px-2 py-1 rounded-full ${
                    investment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    investment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {investment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Investment;