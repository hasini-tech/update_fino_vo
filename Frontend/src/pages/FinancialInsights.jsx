import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Receipt, Calendar, CreditCard, RefreshCw } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const FinancialInsights = () => {
  const [insightsData, setInsightsData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantId, setTenantId] = useState(null);

  // Auto-fetch tenant and data on mount
  useEffect(() => {
    autoFetchData();
  }, []);

  // Automatically get tenant ID and fetch data
  const autoFetchData = async () => {
    try {
      setLoading(true);
      
      // Method 1: Get tenant from user auth/session
      const detectedTenant = await getCurrentTenantId();
      
      if (detectedTenant) {
        console.log('Auto-detected tenant:', detectedTenant);
        setTenantId(detectedTenant);
        await fetchFinancialData(detectedTenant);
      } else {
        setError('Could not detect tenant ID. Please ensure you are logged in.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Auto-fetch error:', err);
      setError(err.message || 'Failed to load data');
      setLoading(false);
    }
  };

  // Get current user's tenant ID automatically
  const getCurrentTenantId = async () => {
    try {
      // Method 1: From localStorage (if stored during login)
      const storedTenant = localStorage.getItem('tenantId') || 
                          localStorage.getItem('user_tenant_id') ||
                          localStorage.getItem('tenant');
      
      if (storedTenant) {
        console.log('Found tenant in localStorage:', storedTenant);
        return storedTenant;
      }

      // Method 2: From sessionStorage
      const sessionTenant = sessionStorage.getItem('tenantId') || 
                           sessionStorage.getItem('user_tenant_id');
      
      if (sessionTenant) {
        console.log('Found tenant in sessionStorage:', sessionTenant);
        return sessionTenant;
      }

      // Method 3: From user profile API
      try {
        const userResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const tenant = userData.tenantId || userData.tenant_id || userData.tenant;
          if (tenant) {
            console.log('Found tenant from user profile:', tenant);
            return tenant;
          }
        }
      } catch (e) {
        console.log('Could not fetch user profile:', e);
      }

      // Method 4: From current user context (if using React Context)
      if (window.currentUser?.tenantId) {
        console.log('Found tenant from window.currentUser:', window.currentUser.tenantId);
        return window.currentUser.tenantId;
      }

      // Method 5: Parse from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenant = urlParams.get('tenantId') || urlParams.get('tenant');
      if (urlTenant) {
        console.log('Found tenant in URL:', urlTenant);
        return urlTenant;
      }

      return null;
    } catch (err) {
      console.error('Error getting tenant ID:', err);
      return null;
    }
  };

  const fetchFinancialData = async (tid) => {
    if (!tid) {
      setError('Tenant ID not found');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching data for tenant:', tid);
      
      // Fetch insights
      const insightsResponse = await fetch(
        `${API_BASE_URL}/insights/generate?tenantId=${tid}`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const insightsResult = await insightsResponse.json();
      
      if (!insightsResult.success) {
        throw new Error(insightsResult.message || 'Failed to fetch insights');
      }
      
      setInsightsData(insightsResult);

      // Fetch recent transactions
      const transactionsResponse = await fetch(
        `${API_BASE_URL}/insights/recent-transactions?tenantId=${tid}&limit=10`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const transactionsResult = await transactionsResponse.json();
      
      if (transactionsResult.success) {
        setRecentTransactions(transactionsResult.transactions || []);
      }

      setLoading(false);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load financial data');
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (tenantId) {
      fetchFinancialData(tenantId);
    } else {
      autoFetchData();
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const incomeTransactions = recentTransactions.filter(t => t.type === 'income');
  const expenseTransactions = recentTransactions.filter(t => t.type === 'expense');

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg">Loading financial insights...</p>
          <p className="text-sm text-gray-500 mt-2">Detecting your account automatically</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Could Not Load Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Retry
            </button>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Make sure you're logged in and your session is active.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-indigo-600" />
              Financial Insights
            </h1>
            <p className="text-gray-600 mt-1">Your Personal Finance Dashboard</p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* AI Insight Banner */}
        {insightsData?.insight && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💡</span>
              <div>
                <h3 className="font-semibold text-lg mb-2">Financial Insight</h3>
                <p className="text-white/90 leading-relaxed">{insightsData.insight}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {insightsData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(insightsData.summary.totalIncome)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(insightsData.summary.totalExpense)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  insightsData.summary.netBalance >= 0 ? 'bg-blue-100' : 'bg-orange-100'
                }`}>
                  <DollarSign className={`w-6 h-6 ${
                    insightsData.summary.netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Balance</p>
                  <p className={`text-2xl font-bold ${
                    insightsData.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(insightsData.summary.netBalance)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GST Analysis */}
        {insightsData?.gstAnalysis && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-indigo-600" />
              GST Analysis (Indian Taxation)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-700 mb-1">GST on Income</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(insightsData.gstAnalysis.income.totalGST)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {insightsData.gstAnalysis.income.transactionsWithGST} transactions
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
                <p className="text-sm text-red-700 mb-1">GST on Expenses</p>
                <p className="text-2xl font-bold text-red-800">
                  {formatCurrency(insightsData.gstAnalysis.expense.totalGST)}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {insightsData.gstAnalysis.expense.transactionsWithGST} transactions
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-700 mb-1">Net GST</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(insightsData.gstAnalysis.netGST)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-700 mb-1">GST % of Expenses</p>
                <p className="text-2xl font-bold text-purple-800">
                  {insightsData.gstAnalysis.gstAsPercentOfExpense}%
                </p>
              </div>
            </div>

            {insightsData.gstAnalysis.expense.categoryWiseGST && 
             Object.keys(insightsData.gstAnalysis.expense.categoryWiseGST).length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-700 mb-3">Category-wise GST Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(insightsData.gstAnalysis.expense.categoryWiseGST)
                    .sort((a, b) => b[1].totalGST - a[1].totalGST)
                    .slice(0, 5)
                    .map(([category, data]) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{category}</p>
                          <p className="text-sm text-gray-600">
                            {data.count} transactions • Avg {data.avgGSTPercentage}% GST
                          </p>
                        </div>
                        <p className="text-lg font-bold text-gray-800">
                          {formatCurrency(data.totalGST)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Recent Income
            </h3>
            <div className="space-y-3">
              {incomeTransactions.length > 0 ? (
                incomeTransactions.slice(0, 5).map((txn, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{txn.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(txn.date)}
                        </span>
                        {txn.paymentMode && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {txn.paymentMode}
                          </span>
                        )}
                      </div>
                      {txn.gstAmount > 0 && (
                        <p className="text-xs text-green-700 mt-1">
                          GST: {formatCurrency(txn.gstAmount)}
                        </p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      +{formatCurrency(txn.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No income transactions</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Recent Expenses
            </h3>
            <div className="space-y-3">
              {expenseTransactions.length > 0 ? (
                expenseTransactions.slice(0, 5).map((txn, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{txn.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(txn.date)}
                        </span>
                        {txn.paymentMode && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {txn.paymentMode}
                          </span>
                        )}
                      </div>
                      {txn.gstAmount > 0 && (
                        <p className="text-xs text-red-700 mt-1">
                          GST: {formatCurrency(txn.gstAmount)}
                        </p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-red-600">
                      -{formatCurrency(txn.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No expense transactions</p>
              )}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {insightsData?.breakdown?.expenses && insightsData.breakdown.expenses.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Top Spending Categories</h3>
            <div className="space-y-3">
              {insightsData.breakdown.expenses.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{category.category}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{category.percentage}% of total</span>
                      <span>•</span>
                      <span>{category.count} transactions</span>
                      {category.gst > 0 && (
                        <>
                          <span>•</span>
                          <span>GST: {formatCurrency(category.gst)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-800">
                    {formatCurrency(category.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialInsights;