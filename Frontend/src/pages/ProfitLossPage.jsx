
// ProfitLossPage.jsx - Fixed Profit & Loss Analysis with Working Charts
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, AlertCircle, Calendar, FileText, Download, Eye, EyeOff, Plus, X, Check, Filter, Search, RefreshCw, ChevronDown, ChevronUp, Edit3, Trash2, Save, Printer, User, CreditCard, Building, Globe, Phone, Mail, MapPin, Clock, Star, Award, Target, Zap, Shield, Heart, Book, Users, Briefcase, Home, Car, ShoppingBag, Coffee, Music, Film, Gamepad2, Dumbbell, Plane, Gift, ShoppingCart, Wifi, Lightbulb, Droplets, Wind, Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, CloudOff, Thermometer, Gauge, Activity, Navigation, Anchor, Mountain, TreePine, Leaf, Flower2, Sprout, Wheat, Fish, Beef, Apple, Carrot, Milk, Egg, WheatOff, Vegan, Database, ShieldAlert, XCircle, CheckCircle2, ArrowUp, ArrowDown, Info, Sparkles } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import authService from '../services/authService';
import '../styles/profitloss.css';

const ProfitLossPage = ({ userSession }) => {
  const [timeRange, setTimeRange] = useState('2025-2026');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [profitLossData, setProfitLossData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [profitAnalysis, setProfitAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('real');
  
  const isFetching = useRef(false);

  useEffect(() => {
    loadFinancialData();
  }, [timeRange, selectedMonth]);

  useEffect(() => {
    if (profitLossData) {
      analyzeProfits();
    }
  }, [profitLossData]);

  const getTenantId = () => {
    const tenantId = localStorage.getItem('tenantId') || authService.getTenantId();
    // Validate tenant ID format - must be 6 digits or start with "fallback-"
    if (tenantId && (/^\d{6}$/.test(tenantId) || tenantId.startsWith('fallback-'))) {
      return tenantId;
    }
    // Generate a valid fallback tenant ID
    return 'fallback-' + Math.random().toString(36).substr(2, 9);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
    
    return headers;
  };

  const loadFinancialData = async () => {
    if (isFetching.current) return;

    try {
      isFetching.current = true;
      setLoading(true);
      setError(null);

      // Load real data from APIs only
      const financialData = await loadRealFinancialData();

      if (financialData) {
        // Keep processed monthly structure (revenue, costOfGoodsSold, expenses)
        // and also attach the original API responses for debugging or inspection.
        setProfitLossData({
          ...financialData,
          rawIncome: financialData.rawIncome || [],
          rawExpenses: financialData.rawExpenses || []
        });
        setDataSource('real');
      } else {
        setProfitLossData(null);
        setDataSource('real');
        setError('No live financial data available from server.');
      }

    } catch (err) {
      console.error('Error loading financial data:', err);
      setError('Unable to load financial data. Check server connectivity.');
      setProfitLossData(null);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  // Removed sample/fallback data generator to rely solely on live API data

  const loadRealFinancialData = async () => {
    try {
      // Fetch income data
      const incomeResponse = await fetch('http://localhost:5000/api/income', {
        headers: getAuthHeaders()
      });
      
      // Fetch expenditure data
      const expenseResponse = await fetch('http://localhost:5000/api/transactions/expenses', {
        headers: getAuthHeaders()
      });

      let incomeData = [];
      let expenseData = [];

      if (incomeResponse.ok) {
        const incomeResult = await incomeResponse.json();
        if (Array.isArray(incomeResult)) {
          incomeData = incomeResult;
        }
      }

      if (expenseResponse.ok) {
        const expenseResult = await expenseResponse.json();
        if (Array.isArray(expenseResult)) {
          expenseData = expenseResult;
        }
      }

      // Check if we have any real data
      const hasRealData = incomeData.length > 0 || expenseData.length > 0;

      // Process data into monthly format
      const processedData = processRealDataToMonthly(incomeData, expenseData);
      return {
        ...processedData,
        rawIncome: incomeData,
        rawExpenses: expenseData,
        metadata: {
          generatedDate: new Date().toISOString(),
          year: new Date().getFullYear(),
          dataType: 'real',
          source: 'api',
          hasRealData: hasRealData,
          incomeCount: incomeData.length,
          expenseCount: expenseData.length
        }
      };
      
    } catch (error) {
      console.error('Error fetching real data:', error);
      return null;
    }
  };

  const processRealDataToMonthly = (incomeData, expenseData) => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentYear = new Date().getFullYear();
    
    // Initialize monthly arrays with zeros
    const initializeArray = (length) => new Array(length).fill(0);
    
    const monthlyData = {
      revenue: {
        salesRevenue: initializeArray(12),
        otherRevenue: initializeArray(12),
        salesDiscounts: initializeArray(12),
        salesReturns: initializeArray(12)
      },
      costOfGoodsSold: {
        awsServer: initializeArray(12),
        directSalaries: initializeArray(12),
        internshipSalaries: initializeArray(12),
        securedFunds: initializeArray(12),
        projectProfitShare: initializeArray(12),
        internshipProfitShare: initializeArray(12)
      },
      expenses: {
        marketingAdvertising: initializeArray(12),
        chatOpt: initializeArray(12),
        canva: initializeArray(12),
        legalFees: initializeArray(12),
        computersRepair: initializeArray(12),
        officeExpenses: initializeArray(12),
        deepseekAI: initializeArray(12),
        claudeAI: initializeArray(12),
        openAI: initializeArray(12),
        utilities: initializeArray(12),
        internetBill: initializeArray(12),
        internshipExpenses: initializeArray(12),
        googleWorkspace: initializeArray(12),
        biliaryPayment: initializeArray(12),
        miscellaneous: initializeArray(12),
        domainSubscription: initializeArray(12),
      }
    };

    // Process income data - FIXED LOGIC
    incomeData.forEach(income => {
      if (income.date && income.amount) {
        const date = new Date(income.date);
        const month = date.getMonth(); // 0-11
        // Remove strict year filter, include all data
        if (month >= 0 && month < 12) {
          const amount = parseFloat(income.amount) || 0;
          const category = income.category?.toLowerCase() || '';
          const description = income.description?.toLowerCase() || '';
          // Flexible income categorization
          if (category.includes('sales') || description.includes('sale') || description.includes('revenue')) {
            monthlyData.revenue.salesRevenue[month] += amount;
          } else if (category.includes('salary') || description.includes('salary') || description.includes('wage')) {
            monthlyData.costOfGoodsSold.directSalaries[month] += amount;
          } else if (category.includes('interest') || description.includes('dividend') || description.includes('investment')) {
            monthlyData.revenue.otherRevenue[month] += amount;
          } else if (category.includes('freelance') || description.includes('contract') || description.includes('project')) {
            monthlyData.revenue.salesRevenue[month] += amount;
          } else {
            // Fallback: add to Other Revenue
            monthlyData.revenue.otherRevenue[month] += amount;
          }
        }
      }
    });

    // Process expense data - FIXED LOGIC
    expenseData.forEach(expense => {
      if (expense.date && expense.amount) {
        const date = new Date(expense.date);
        const month = date.getMonth(); // 0-11
        // Remove strict year filter, include all data
        if (month >= 0 && month < 12) {
          const category = expense.category?.toLowerCase() || '';
          const description = expense.description?.toLowerCase() || '';
          const amount = parseFloat(expense.amount) || 0;
          // Flexible expense categorization
          if (category.includes('marketing') || description.includes('advertising') || description.includes('promotion')) {
            monthlyData.expenses.marketingAdvertising[month] += amount;
          } else if (category.includes('salary') || description.includes('salary') || description.includes('employee') || description.includes('payroll')) {
            monthlyData.costOfGoodsSold.directSalaries[month] += amount;
          } else if (category.includes('intern') || description.includes('internship')) {
            monthlyData.costOfGoodsSold.internshipSalaries[month] += amount;
          } else if (description.includes('aws') || description.includes('server') || description.includes('hosting') || description.includes('cloud')) {
            monthlyData.costOfGoodsSold.awsServer[month] += amount;
          } else if (description.includes('internet') || description.includes('wifi') || description.includes('broadband')) {
            monthlyData.expenses.internetBill[month] += amount;
          } else if (description.includes('electric') || description.includes('water') || description.includes('gas') || description.includes('utility')) {
            monthlyData.expenses.utilities[month] += amount;
          } else if (description.includes('legal') || description.includes('lawyer') || description.includes('consultant') || description.includes('professional')) {
            monthlyData.expenses.legalFees[month] += amount;
          } else if (description.includes('office') || description.includes('rent') || description.includes('supply') || description.includes('stationery')) {
            monthlyData.expenses.officeExpenses[month] += amount;
          } else if (description.includes('openai') || description.includes('chatgpt') || description.includes('gpt')) {
            monthlyData.expenses.openAI[month] += amount;
          } else if (description.includes('claude') || description.includes('anthropic')) {
            monthlyData.expenses.claudeAI[month] += amount;
          } else if (description.includes('deepseek')) {
            monthlyData.expenses.deepseekAI[month] += amount;
          } else if (description.includes('google') || description.includes('workspace') || description.includes('g suite')) {
            monthlyData.expenses.googleWorkspace[month] += amount;
          } else if (description.includes('canva')) {
            monthlyData.expenses.canva[month] += amount;
          } else if (description.includes('domain') || description.includes('hosting') || description.includes('subscription')) {
            monthlyData.expenses.domainSubscription[month] += amount;
          } else if (description.includes('computer') || description.includes('laptop') || description.includes('repair') || description.includes('hardware')) {
            monthlyData.expenses.computersRepair[month] += amount;
          } else if (description.includes('chat') || description.includes('bot') || description.includes('automation')) {
            monthlyData.expenses.chatOpt[month] += amount;
          } else {
            // Fallback: add to Miscellaneous
            monthlyData.expenses.miscellaneous[month] += amount;
          }
        }
      }
    });

    return monthlyData;
  };

  const analyzeProfits = () => {
    if (!profitLossData) return;

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    const monthlyAnalysis = months.map((month, index) => {
      // Calculate revenue components (subtracting discounts and returns)
      const salesRevenue = Number(profitLossData.revenue?.salesRevenue?.[index] || 0);
      const otherRevenue = Number(profitLossData.revenue?.otherRevenue?.[index] || 0);
      const salesDiscounts = Number(profitLossData.revenue?.salesDiscounts?.[index] || 0);
      const salesReturns = Number(profitLossData.revenue?.salesReturns?.[index] || 0);

      const totalRevenue = salesRevenue + otherRevenue - (salesDiscounts + salesReturns);

      // Calculate COGS (sum of all COGS categories for the month)
      const cogs = Object.values(profitLossData.costOfGoodsSold || {}).reduce((sum, arr) => 
        sum + Number(arr?.[index] || 0), 0);

      // Calculate operating expenses (sum of all expense categories for the month)
      const operatingExpenses = Object.values(profitLossData.expenses || {}).reduce((sum, arr) => 
        sum + Number(arr?.[index] || 0), 0);

      // Total Expense = COGS + Operating Expenses
      const totalExpense = cogs + operatingExpenses;

      // Net Profit = Total Revenue - Total Expense (explicit requirement)
      const netProfit = totalRevenue - totalExpense;

      // Gross Profit (for reference) = Total Revenue - COGS
      const grossProfit = totalRevenue - cogs;

      // Margins (use totalRevenue as denominator when > 0)
      const grossMargin = totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue !== 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Determine financial health based on net profit / margin
      let financialHealth = 'EXCELLENT';
      if (netProfit < 0) financialHealth = 'CRITICAL';
      else if (netMargin < 5) financialHealth = 'POOR';
      else if (netMargin < 15) financialHealth = 'FAIR';
      else if (netMargin < 25) financialHealth = 'GOOD';

      return {
        month,
        revenue: totalRevenue,
        grossRevenue: salesRevenue + otherRevenue,
        deductions: salesDiscounts + salesReturns,
        cogs,
        expenses: operatingExpenses,
        totalExpense,
        grossProfit,
        netProfit,
        grossMargin: Number(grossMargin.toFixed(2)) || 0,
        netMargin: Number(netMargin.toFixed(2)) || 0,
        financialHealth
      };
    });

    // Calculate Year-to-Date totals
    const ytdRevenue = monthlyAnalysis.reduce((sum, month) => sum + (Number(month.revenue) || 0), 0);
    const ytdCogs = monthlyAnalysis.reduce((sum, month) => sum + (Number(month.cogs) || 0), 0);
    const ytdOperatingExpenses = monthlyAnalysis.reduce((sum, month) => sum + (Number(month.expenses) || 0), 0);
    const ytdTotalExpense = ytdCogs + ytdOperatingExpenses;
    const ytdGrossProfit = monthlyAnalysis.reduce((sum, month) => sum + (Number(month.grossProfit) || 0), 0);
    // YTD Net Profit using the explicit formula: Total Revenue - Total Expense
    const ytdNetProfit = ytdRevenue - ytdTotalExpense;
    const ytdNetMargin = ytdRevenue > 0 ? (ytdNetProfit / ytdRevenue) * 100 : 0;

    const ytdAnalysis = {
      month: 'YTD',
      revenue: ytdRevenue,
      cogs: ytdCogs,
      expenses: ytdOperatingExpenses,
      totalExpense: ytdTotalExpense,
      grossProfit: ytdGrossProfit,
      netProfit: ytdNetProfit,
      netMargin: Number(ytdNetMargin.toFixed(2)) || 0,
      financialHealth: ytdNetProfit < 0 ? 'CRITICAL' : 
                     ytdNetMargin < 5 ? 'POOR' : 
                     ytdNetMargin < 15 ? 'FAIR' : 
                     ytdNetMargin < 25 ? 'GOOD' : 'EXCELLENT'
    };

    // Calculate performance trends
    const profitableMonths = monthlyAnalysis.filter(m => (m.netProfit || 0) > 0);
    const lossMonths = monthlyAnalysis.filter(m => (m.netProfit || 0) < 0);
    
    // Find best and worst months safely
    const bestMonth = monthlyAnalysis.reduce((best, current) => 
      (current.netProfit || 0) > (best.netProfit || 0) ? current : monthlyAnalysis[0], monthlyAnalysis[0]);
    
    const worstMonth = monthlyAnalysis.reduce((worst, current) => 
      (current.netProfit || 0) < (worst.netProfit || 0) ? current : monthlyAnalysis[0], monthlyAnalysis[0]);

    const averageNetMargin = monthlyAnalysis.reduce((sum, month) => sum + (month.netMargin || 0), 0) / monthlyAnalysis.length;

    setProfitAnalysis({
      monthly: monthlyAnalysis,
      ytd: ytdAnalysis,
      summary: {
        profitableMonths: profitableMonths.length,
        lossMonths: lossMonths.length,
        totalMonths: monthlyAnalysis.length,
        bestMonth,
        worstMonth,
        averageNetMargin: averageNetMargin || 0,
        totalRevenue: ytdRevenue,
        totalProfit: ytdNetProfit,
        totalExpenses: ytdTotalExpense
      }
    });
  };

  const formatINR = (amount) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  };

  const formatPercent = (value) => {
    const safeValue = Number(value) || 0;
    return `${safeValue.toFixed(1)}%`;
  };

  const handleRefresh = () => {
    loadFinancialData();
  };

  const handleImportData = () => {
    alert('Your actual income and expenditure data is being used for profit & loss analysis. Add more transactions in the Income and Expenditure modules to see updated analysis.');
  };

  if (loading && !profitLossData) {
    return (
      <div className="profit-loss-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing Your Financial Data...</p>
      </div>
    );
  }

  return (
    <div className="profit-loss-page">
      {/* Header - CENTER ALIGNED */}
      <div className="pl-header">
        <div className="pl-header-content-centered">
          <div className="pl-header-main-centered">
            <h1>Financial Dashboard</h1>
            <p>Real Profit & Loss Analysis • {timeRange}</p>
            <div className="data-source-info">
              <Database size={12} />
              <span>Data: {dataSource.toUpperCase()} • </span>
              {profitLossData?.metadata?.hasRealData && (
                <span className="real-data-stats">
                  ({profitLossData.metadata.incomeCount || 0} income records, {profitLossData.metadata.expenseCount || 0} expense records)
                </span>
              )}
              <button className="import-btn" onClick={handleImportData}>
                <Download size={12} />
                Using Your Actual Data
              </button>
            </div>
          </div>
        </div>
        <div className="pl-header-controls">
          <div className="control-group">
            <Calendar size={16} />
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              disabled={loading}
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>
          <div className="control-group">
            <BarChart3 size={16} />
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={loading}
            >
              {['ALL', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Info Banner removed — relying only on live API data */}

      

      {error && (
        <div className="info-banner error">
          <div className="info-content">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button className="info-dismiss" onClick={() => setError(null)}>
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="pl-navigation">
        <button 
          className={`nav-btn ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          <PieChart size={18} />
          Overview
        </button>
        <button 
          className={`nav-btn ${activeView === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveView('analysis')}
        >
          <BarChart3 size={18} />
          Detailed Analysis
        </button>
        <button 
          className={`nav-btn ${activeView === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveView('insights')}
        >
          <TrendingUp size={18} />
          Insights
        </button>
      </div>

      {/* Main Content */}
      <div className="pl-content">
        {activeView === 'overview' && (
          <OverviewView 
            data={profitLossData} 
            analysis={profitAnalysis} 
            formatINR={formatINR} 
            formatPercent={formatPercent} 
            loading={loading}
            hasData={!!profitLossData}
          />
        )}
        {activeView === 'analysis' && (
          <AnalysisView 
            data={profitLossData} 
            analysis={profitAnalysis} 
            formatINR={formatINR} 
            formatPercent={formatPercent} 
            loading={loading}
            hasData={!!profitLossData}
          />
        )}
        {activeView === 'insights' && (
          <InsightsView 
            data={profitLossData}
            analysis={profitAnalysis} 
            formatINR={formatINR} 
            formatPercent={formatPercent} 
            loading={loading}
            hasData={!!profitLossData}
          />
        )}
      </div>
    </div>
  );
};

// Chart Components (RevenueExpenseBarChart and ProfitTrendLineChart remain the same)
const RevenueExpenseBarChart = ({ data, formatINR }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <BarChart3 size={32} />
        <p>No revenue/expense data available for chart</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    month: item.month,
    revenue: item.revenue,
    expenses: item.expenses
  }));

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={value => formatINR(value).replace('₹', '₹ ')} />
          <Tooltip formatter={value => [formatINR(value), 'Amount']} />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
          <Bar dataKey="expenses" name="Expenses" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ProfitTrendLineChart = ({ data, formatINR }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-placeholder">
        <TrendingUp size={32} />
        <p>No profit trend data available for chart</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    month: item.month,
    grossProfit: item.grossProfit,
    netProfit: item.netProfit
  }));

  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={value => formatINR(value).replace('₹', '₹ ')} />
          <Tooltip formatter={value => [formatINR(value), 'Amount']} />
          <Legend />
          <Line type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#8884d8" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Overview View Component (unchanged)
const OverviewView = ({ data, analysis, formatINR, formatPercent, loading, hasData }) => {
  // ... (OverviewView component remains exactly the same)
  if (!hasData) {
    return (
      <div className="overview-view">
        <div className="no-data">
          <BarChart3 size={48} />
          <p>No financial data available</p>
          <p className="no-data-subtext">Add income and expenditure records to see your profit & loss analysis</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="overview-view">
        <div className="no-data">
          <BarChart3 size={48} />
          <p>Analyzing your financial data...</p>
        </div>
      </div>
    );
  }

  const { ytd, summary, monthly } = analysis;

  // Calculate trends based on monthly data
  const revenueTrend = monthly && monthly.length > 1 && monthly[0].revenue !== 0 ? 
    ((monthly[monthly.length - 1].revenue - monthly[0].revenue) / monthly[0].revenue * 100) : 0;
  
  const profitTrend = monthly && monthly.length > 1 && monthly[0].netProfit !== 0 ? 
    ((monthly[monthly.length - 1].netProfit - monthly[0].netProfit) / Math.abs(monthly[0].netProfit) * 100) : 0;

  return (
    <div className="overview-view">
      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card revenue">
          <div className="metric-icon">
            <DollarSign size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Total Revenue</div>
            <div className="metric-value">{formatINR(ytd.revenue)}</div>
            <div className={`metric-trend ${revenueTrend >= 0 ? 'positive' : 'negative'}`}>
              {revenueTrend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="metric-card profit">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Net Profit</div>
            <div className="metric-value">{formatINR(ytd.netProfit)}</div>
            <div className={`metric-trend ${profitTrend >= 0 ? 'positive' : 'negative'}`}>
              {profitTrend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {profitTrend >= 0 ? '+' : ''}{profitTrend.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="metric-card margin">
          <div className="metric-icon">
            <Target size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Net Margin</div>
            <div className="metric-value">{formatPercent(ytd.netMargin)}</div>
            <div className="metric-subtext">Industry Avg: 15%</div>
          </div>
        </div>

        <div className="metric-card health">
          <div className="metric-icon">
            <CheckCircle2 size={24} />
          </div>
          <div className="metric-content">
            <div className="metric-label">Financial Health</div>
            <div className={`metric-value health-${ytd.financialHealth.toLowerCase()}`}>
              {ytd.financialHealth}
            </div>
            <div className="metric-subtext">
              {summary.profitableMonths}/{summary.totalMonths} Profitable Months
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="summary-cards">
        <div className="summary-card">
          <h4>Performance Highlights</h4>
          <div className="highlight-list">
            <div className="highlight-item positive">
              <CheckCircle2 size={16} />
              <span>Best month: <strong>{summary.bestMonth.month}</strong> ({formatINR(summary.bestMonth.netProfit)})</span>
            </div>
            <div className="highlight-item positive">
              <CheckCircle2 size={16} />
              <span>Success rate: <strong>{((summary.profitableMonths / summary.totalMonths) * 100).toFixed(0)}%</strong></span>
            </div>
            <div className="highlight-item neutral">
              <Target size={16} />
              <span>Average margin: <strong>{formatPercent(summary.averageNetMargin)}</strong></span>
            </div>
            {summary.lossMonths > 0 && (
              <div className="highlight-item warning">
                <AlertCircle size={16} />
                <span>Loss months: <strong>{summary.lossMonths}</strong></span>
            </div>
            )}
          </div>
        </div>

        <div className="summary-card">
          <h4>Financial Breakdown</h4>
          <div className="breakdown-stack">
            <div className="breakdown-item">
              <span>Revenue</span>
              <span>{formatINR(ytd.revenue)}</span>
            </div>
            <div className="breakdown-item">
              <span>COGS</span>
              <span>{formatINR(ytd.cogs)}</span>
            </div>
            <div className="breakdown-item">
              <span>Gross Profit</span>
              <span className="profit-text">{formatINR(ytd.grossProfit)}</span>
            </div>
            <div className="breakdown-item">
              <span>Expenses</span>
              <span>{formatINR(ytd.expenses)}</span>
            </div>
            <div className="breakdown-item total">
              <span>Net Profit</span>
              <span className={ytd.netProfit >= 0 ? 'profit-text' : 'loss-text'}>
                {formatINR(ytd.netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Analysis View Component (unchanged)
const AnalysisView = ({ data, analysis, formatINR, formatPercent, loading, hasData }) => {
  // ... (AnalysisView component remains exactly the same)
  if (!hasData) {
    return (
      <div className="analysis-view">
        <div className="no-data">
          <BarChart3 size={48} />
          <p>No financial data available</p>
          <p className="no-data-subtext">Add income and expenditure records to see detailed analysis</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="analysis-view">
        <div className="no-data">
          <BarChart3 size={48} />
          <p>Analyzing your financial data...</p>
        </div>
      </div>
    );
  }

  const { monthly, ytd } = analysis;

  // Calculate profit/loss summary
  const profitLossSummary = {
    totalRevenue: ytd.revenue || 0,
    totalCOGS: ytd.cogs || 0,
    grossProfit: ytd.grossProfit || 0,
    totalOperatingExpenses: ytd.expenses || 0,
    totalExpense: ytd.totalExpense || ( (ytd.cogs || 0) + (ytd.expenses || 0) ),
    netProfit: ytd.netProfit || 0,
    netMargin: ytd.netMargin || 0
  };

  return (
    <div className="analysis-view">
      <div className="analysis-header">
        <h2>Detailed Profit & Loss Analysis</h2>
        <p>Comprehensive breakdown of your financial performance</p>
      </div>

      {/* Profit & Loss Summary - UPDATED */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>Profit & Loss Summary</h3>
          <span className="section-subtitle">Year-to-Date Financial Overview</span>
        </div>
        
        {/* Centered Profit/Loss Status */}
        <div className="profit-loss-status-centered">
          <div className={`status-badge-extra-large ${profitLossSummary.netProfit >= 0 ? 'profit' : 'loss'}`}>
            {profitLossSummary.netProfit >= 0 ? (
              <><ArrowUp size={24} /> PROFITABLE</>
            ) : (
              <><ArrowDown size={24} /> LOSS MAKING</>
            )}
          </div>
        </div>

        <div className="profit-loss-summary-simplified">
          <div className="summary-grid-simplified">
            <div className="summary-item-simplified">
              <span className="label">Total Revenue</span>
              <span className="value revenue">{formatINR(profitLossSummary.totalRevenue)}</span>
            </div>
            <div className="summary-item-simplified">
              <span className="label">Net Profit/Loss</span>
              <span className={`value ${profitLossSummary.netProfit >= 0 ? 'profit' : 'loss'}`}>
                {formatINR(profitLossSummary.netProfit)}
              </span>
            </div>
            <div className="summary-item-simplified">
              <span className="label">Net Margin</span>
              <span className={`value ${profitLossSummary.netMargin >= 0 ? 'profit' : 'loss'}`}>
                {formatPercent(profitLossSummary.netMargin)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row - NEW, CLEAN, PROFESSIONAL SETUP */}
      <div className="charts-and-graphs-container">
        <div className="chart-card chart-side">
          <div className="chart-header">
            <h3>Revenue vs Expenses</h3>
            <span className="chart-subtitle">Monthly Trend Comparison</span>
          </div>
          <div className="chart-display-area">
            <RevenueExpenseBarChart data={monthly} formatINR={formatINR} />
          </div>
        </div>

        <div className="chart-card graph-side">
          <div className="chart-header">
            <h3>Profit Trend Analysis</h3>
            <span className="chart-subtitle">Gross vs Net Profit Over Time</span>
          </div>
          <div className="chart-display-area">
            <ProfitTrendLineChart data={monthly} formatINR={formatINR} />
          </div>
        </div>
      </div>

      {/* Revenue Analysis */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>Revenue Analysis</h3>
          <span className="section-subtitle">Income Breakdown by Month</span>
        </div>
        <RevenueTable data={data} formatINR={formatINR} />
      </div>

      {/* COGS Breakdown */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>COGS Breakdown</h3>
          <span className="section-subtitle">Cost of Goods Sold Details</span>
        </div>
        <COGSTable data={data} formatINR={formatINR} />
      </div>

      {/* Operating Expenses */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>Operating Expenses</h3>
          <span className="section-subtitle">Monthly Expense Details</span>
        </div>
        <ExpensesTable data={data} formatINR={formatINR} />
      </div>

      {/* Monthly Profit & Loss Statement */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>Monthly Profit & Loss Statement</h3>
          <span className="section-subtitle">Detailed Monthly Performance</span>
        </div>
        <ProfitLossTable analysis={analysis} formatINR={formatINR} formatPercent={formatPercent} />
      </div>

      {/* Performance Indicators */}
      <div className="analysis-section">
        <div className="section-header">
          <h3>Key Performance Indicators</h3>
          <span className="section-subtitle">Financial Health Metrics</span>
        </div>
        <div className="performance-indicators">
          <div className="indicators-grid">
            <div className="indicator">
              <div className="indicator-value">{formatPercent(profitLossSummary.netMargin)}</div>
              <div className="indicator-label">Net Profit Margin</div>
              <div className={`indicator-trend ${profitLossSummary.netMargin >= 15 ? 'good' : profitLossSummary.netMargin >= 5 ? 'fair' : 'poor'}`}>
                {profitLossSummary.netMargin >= 15 ? 'Excellent' : profitLossSummary.netMargin >= 5 ? 'Fair' : 'Needs Improvement'}
              </div>
            </div>
            <div className="indicator">
              <div className="indicator-value">{analysis.summary.profitableMonths}/{analysis.summary.totalMonths}</div>
              <div className="indicator-label">Profitable Months</div>
              <div className="indicator-trend good">
                {((analysis.summary.profitableMonths / analysis.summary.totalMonths) * 100).toFixed(0)}% Success Rate
              </div>
            </div>
            <div className="indicator">
              <div className="indicator-value">{formatINR(profitLossSummary.grossProfit)}</div>
              <div className="indicator-label">Gross Profit</div>
              <div className={`indicator-trend ${profitLossSummary.grossProfit >= 0 ? 'good' : 'poor'}`}>
                {profitLossSummary.grossProfit >= 0 ? 'Positive' : 'Negative'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Insights View Component (unchanged)
const InsightsView = ({ analysis, data, formatINR, formatPercent, loading, hasData }) => {
  // ... (InsightsView component remains exactly the same)
  if (!hasData) {
    return (
      <div className="insights-view">
        <div className="no-data">
          <TrendingUp size={48} />
          <p>No financial data available</p>
          <p className="no-data-subtext">Add income and expenditure records to get insights</p>
        </div>
      </div>
    );
  }

  if (!analysis || !data) {
    return (
      <div className="insights-view">
        <div className="no-data">
          <TrendingUp size={48} />
          <p>Analyzing your financial data...</p>
        </div>
      </div>
    );
  }

  const { summary, monthly, ytd } = analysis;

  const getRecommendations = () => {
    const recs = [];
    
    // Check overall financial health
    if (ytd.financialHealth === 'CRITICAL' || ytd.financialHealth === 'POOR') {
      recs.push({ type: 'critical', text: "Your overall financial health needs immediate attention. Review major income and expense categories." });
    } else if (ytd.financialHealth === 'FAIR') {
      recs.push({ type: 'warning', text: "Your financial health is fair. Look for opportunities to increase revenue or reduce non-essential expenses." });
    } else {
      recs.push({ type: 'positive', text: "Excellent financial health! Keep up the great work and consider strategic investments." });
    }

    // Margin-based recommendations
    if (summary.averageNetMargin < 10 && ytd.netProfit > 0) {
      recs.push({ type: 'warning', text: "Your average net margin is low. Focus on optimizing operational costs without impacting quality." });
    } else if (ytd.netProfit < 0 && ytd.revenue > 0) {
        recs.push({ type: 'critical', text: `Despite generating ${formatINR(ytd.revenue)} in revenue, you incurred a net loss. This indicates high costs relative to income.` });
    }
    
    // Profitability consistency
    if (summary.lossMonths > 0) {
      recs.push({ type: 'warning', text: `You experienced losses in ${summary.lossMonths} out of ${summary.totalMonths} months. Analyze these months for specific triggers.` });
      // Identify specific months
      const lossMonthNames = monthly.filter(m => m.netProfit < 0).map(m => m.month).join(', ');
      if (lossMonthNames) {
        recs.push({ type: 'info', text: `Specifically, review performance in: ${lossMonthNames}.` });
      }
    } else {
      recs.push({ type: 'positive', text: "Congratulations! You have maintained profitability across all months, indicating strong financial management." });
    }
    
    // Expense management - Dynamic based on actual data
    const totalExpenses = ytd.expenses;
    if (data.expenses && Object.keys(data.expenses).length > 0 && totalExpenses > 0) {
        const expenseCategories = Object.keys(data.expenses);
        const aggregatedExpenses = expenseCategories.map(key => ({
            name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), // Format key to readable name
            total: data.expenses[key].reduce((sum, val) => sum + (val || 0), 0)
        }));

        const topExpenseCategories = aggregatedExpenses
            .sort((a, b) => b.total - a.total)
            .slice(0, 3); // Top 3 expenses

        if (topExpenseCategories.length > 0) {
            recs.push({ type: 'info', text: `Your top 3 expenditure categories are: ${topExpenseCategories.map(e => `${e.name} (${formatINR(e.total)})`).join(', ')}. Consider strategies to manage these costs.` });
        }
    }

    // Revenue growth
    const firstMonthRevenue = monthly[0]?.revenue || 0;
    const lastMonthRevenue = monthly[monthly.length - 1]?.revenue || 0;
    if (lastMonthRevenue < firstMonthRevenue && monthly.length > 1) {
        recs.push({ type: 'warning', text: "Revenue shows a declining trend over the period. Explore new sales channels or marketing efforts." });
    } else if (lastMonthRevenue > firstMonthRevenue * 1.1 && monthly.length > 1) { // 10% growth
        recs.push({ type: 'positive', text: "Impressive revenue growth! Continue to build on successful strategies." });
    }

    // Add a default positive if no specific issues are found
    if (recs.filter(r => r.type !== 'positive').length === 0 && ytd.netProfit >= 0) {
        recs.push({ type: 'positive', text: "Overall, your business is performing very well. Maintain vigilance and continue to seek growth opportunities." });
    }

    return recs;
  };

  const recommendations = getRecommendations();

  return (
    <div className="insights-view">
      <div className="insights-header">
        <h2>Financial Insights & Recommendations</h2>
        <p>Actionable insights based on your financial performance</p>
      </div>

      {/* Charts in Insights View */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Revenue vs Expenses</h3>
            <span className="chart-subtitle">Monthly Performance</span>
          </div>
          <div className="chart-container">
            <RevenueExpenseBarChart data={monthly} formatINR={formatINR} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Profit Trends</h3>
            <span className="chart-subtitle">Gross vs Net Profit</span>
          </div>
          <div className="chart-container">
            <ProfitTrendLineChart data={monthly} formatINR={formatINR} />
          </div>
        </div>
      </div>

      {/* Key Insights - Redesigned */}
      <div className="analysis-section">
        <div className="section-header">
          <h3><Lightbulb size={20} /> Performance Overview</h3>
          <span className="section-subtitle">Business Health Assessment</span>
        </div>
        <div className="insights-grid-new">
          <div className={`insight-card health-status ${ytd.financialHealth.toLowerCase()}`}>
            <div className="icon"><Info size={24} /></div>
            <div className="content">
              <div className="label">Overall Financial Health</div>
              <div className="value">{ytd.financialHealth}</div>
            </div>
          </div>
          <div className="insight-card profitability-rate">
            <div className="icon"><CheckCircle2 size={24} /></div>
            <div className="content">
              <div className="label">Profitability Rate</div>
              <div className="value positive">
                {((summary.profitableMonths / summary.totalMonths) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="insight-card average-margin">
            <div className="icon"><Target size={24} /></div>
            <div className="content">
              <div className="label">Average Net Margin</div>
              <div className={`value ${summary.averageNetMargin >= 15 ? 'positive' : summary.averageNetMargin >= 5 ? 'neutral' : 'negative'}`}>
                {formatPercent(summary.averageNetMargin)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="analysis-section">
        <div className="section-header">
          <h3><TrendingUp size={20} /> Trend Analysis</h3>
          <span className="section-subtitle">Monthly Performance Patterns</span>
        </div>
        <div className="trend-analysis-new">
          <div className="trend-item-new">
            <div className="icon positive"><ArrowUp size={20} /></div>
            <div className="content">
              <div className="label">Best Performing Month</div>
              <div className="value">{summary.bestMonth.month} ({formatINR(summary.bestMonth.netProfit)})</div>
            </div>
          </div>
          <div className="trend-item-new">
            <div className="icon negative"><ArrowDown size={20} /></div>
            <div className="content">
              <div className="label">Most Challenging Month</div>
              <div className="value">{summary.worstMonth.month} ({formatINR(summary.worstMonth.netProfit)})</div>
            </div>
          </div>
          <div className="trend-item-new">
            <div className="icon warning"><AlertCircle size={20} /></div>
            <div className="content">
              <div className="label">Months Incurring Loss</div>
              <div className="value">{summary.lossMonths} of {summary.totalMonths}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations - Redesigned and Dynamic */}
      <div className="analysis-section">
        <div className="section-header">
          <h3><Sparkles size={20} /> AI Recommendations</h3>
          <span className="section-subtitle">Actionable Business Insights for Improvement</span>
        </div>
        <div className="recommendations-list-new">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-item-new ${rec.type}`}>
                {rec.type === 'positive' && <CheckCircle2 size={20} className="rec-icon" />}
                {rec.type === 'warning' && <AlertCircle size={20} className="rec-icon" />}
                {rec.type === 'critical' && <XCircle size={20} className="rec-icon" />}
                {rec.type === 'info' && <Info size={20} className="rec-icon" />}
                <p>{rec.text}</p>
              </div>
            ))
          ) : (
            <div className="no-recommendations">
              <Info size={24} />
              <p>No specific recommendations at this time. Your financial performance appears stable.</p>
            </div>
          )}
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="analysis-section">
        <div className="section-header">
          <h3><Target size={20} /> Financial Ratios</h3>
          <span className="section-subtitle">Key Performance Metrics</span>
        </div>
        <div className="ratios-grid-new">
          <div className="ratio-card">
            <div className="ratio-label">Gross Profit Margin</div>
            <div className="ratio-value positive">
              {formatPercent(ytd.revenue > 0 ? (analysis.ytd.grossProfit / analysis.ytd.revenue * 100) : 0)}
            </div>
            <div className="ratio-description">Indicates efficiency of production/service.</div>
          </div>
          <div className="ratio-card">
            <div className="ratio-label">Expense to Revenue Ratio</div>
            <div className="ratio-value neutral">
              {formatPercent(ytd.revenue > 0 ? ((analysis.ytd.expenses / analysis.ytd.revenue) * 100) : 0)}
            </div>
            <div className="ratio-description">Measures how much revenue is consumed by operating expenses.</div>
          </div>
          <div className="ratio-card">
            <div className="ratio-label">Profit Stability</div>
            <div className={`ratio-value ${summary.lossMonths === 0 ? 'positive' : 'warning'}`}>
              {summary.lossMonths === 0 ? 'Stable' : 'Volatile'}
            </div>
            <div className="ratio-description">Consistency of profitability over time.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Table Components (unchanged - RevenueTable, COGSTable, ExpensesTable, ProfitLossTable)
const RevenueTable = ({ data, formatINR }) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  const revenueCategories = [
    { key: 'salesRevenue', label: 'Sales Revenue' },
    { key: 'otherRevenue', label: 'Other Revenue' },
    { key: 'salesDiscounts', label: 'Sales Discounts', isDeduction: true },
    { key: 'salesReturns', label: 'Sales Returns', isDeduction: true }
  ];

  const getTotal = (categoryKey) => {
    return (data.revenue?.[categoryKey] || []).reduce((sum, val) => sum + (val || 0), 0);
  };

  const getGrandTotal = () => {
    const grossRevenue = getTotal('salesRevenue') + getTotal('otherRevenue');
    const deductions = getTotal('salesDiscounts') + getTotal('salesReturns');
    return Math.max(0, grossRevenue - deductions);
  };

  return (
    <div className="table-container">
      <table className="financial-table">
        <thead>
          <tr>
            <th>Revenue Category</th>
            {months.map(month => (
              <th key={month}>{month}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {revenueCategories.map(category => (
            <tr key={category.key} className={category.isDeduction ? 'deduction' : ''}>
              <td className="category-name">{category.label}</td>
              {months.map((_, index) => (
                <td key={index}>
                  {formatINR(data.revenue?.[category.key]?.[index] || 0)}
                </td>
              ))}
              <td className="total-column">
                {formatINR(getTotal(category.key))}
              </td>
            </tr>
          ))}
          <tr className="total-row">
            <td className="category-name">Net Revenue</td>
            {months.map((_, index) => {
              const gross = (data.revenue?.salesRevenue?.[index] || 0) + (data.revenue?.otherRevenue?.[index] || 0);
              const deductions = (data.revenue?.salesDiscounts?.[index] || 0) + (data.revenue?.salesReturns?.[index] || 0);
              const net = Math.max(0, gross - deductions);
              return <td key={index}>{formatINR(net)}</td>;
            })}
            <td className="total-column">{formatINR(getGrandTotal())}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const COGSTable = ({ data, formatINR }) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  const cogsCategories = [
    { key: 'awsServer', label: 'AWS Server Costs' },
    { key: 'directSalaries', label: 'Direct Salaries' },
    { key: 'internshipSalaries', label: 'Internship Salaries' },
    { key: 'securedFunds', label: 'Secured Funds' },
    { key: 'projectProfitShare', label: 'Project Profit Share' },
    { key: 'internshipProfitShare', label: 'Internship Profit Share' }
  ];

  const getTotal = (categoryKey) => {
    return (data.costOfGoodsSold?.[categoryKey] || []).reduce((sum, val) => sum + (val || 0), 0);
  };

  const getGrandTotal = () => {
    return cogsCategories.reduce((sum, category) => sum + getTotal(category.key), 0);
  };

  return (
    <div className="table-container">
      <table className="financial-table">
        <thead>
          <tr>
            <th>COGS Category</th>
            {months.map(month => (
              <th key={month}>{month}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {cogsCategories.map(category => (
            <tr key={category.key}>
              <td className="category-name">{category.label}</td>
              {months.map((_, index) => (
                <td key={index}>
                  {formatINR(data.costOfGoodsSold?.[category.key]?.[index] || 0)}
                </td>
              ))}
              <td className="total-column">
                {formatINR(getTotal(category.key))}
              </td>
            </tr>
          ))}
          <tr className="total-row">
            <td className="category-name">Total COGS</td>
            {months.map((_, index) => {
              const total = cogsCategories.reduce((sum, category) => 
                sum + (data.costOfGoodsSold?.[category.key]?.[index] || 0), 0);
              return <td key={index}>{formatINR(total)}</td>;
            })}
            <td className="total-column">{formatINR(getGrandTotal())}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const ExpensesTable = ({ data, formatINR }) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  const expenseCategories = [
    { key: 'marketingAdvertising', label: 'Marketing & Advertising' },
    { key: 'chatOpt', label: 'Chat Optimization' },
    { key: 'canva', label: 'Canva Subscriptions' },
    { key: 'legalFees', label: 'Legal & Professional Fees' },
    { key: 'computersRepair', label: 'Computers & Repairs' },
    { key: 'officeExpenses', label: 'Office Expenses' },
    { key: 'deepseekAI', label: 'DeepSeek AI' },
    { key: 'claudeAI', label: 'Claude AI' },
    { key: 'domainSubscription', label: 'Domain Subscription' },
    { key: 'openAI', label: 'OpenAI' },
    { key: 'utilities', label: 'Utilities' },
    { key: 'internetBill', label: 'Internet Bill' },
    { key: 'internshipExpenses', label: 'Internship Expenses' },
    { key: 'googleWorkspace', label: 'Google Workspace' },
    { key: 'biliaryPayment', label: 'Biliary Payments' },
    { key: 'miscellaneous', label: 'Miscellaneous' }
  ];

  const getTotal = (categoryKey) => {
    return (data.expenses?.[categoryKey] || []).reduce((sum, val) => sum + (val || 0), 0);
  };

  const getGrandTotal = () => {
    return expenseCategories.reduce((sum, category) => sum + getTotal(category.key), 0);
  };

  return (
    <div className="table-container">
      <table className="financial-table">
        <thead>
          <tr>
            <th>Expense Category</th>
            {months.map(month => (
              <th key={month}>{month}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {expenseCategories.map(category => (
            <tr key={category.key}>
              <td className="category-name">{category.label}</td>
              {months.map((_, index) => (
                <td key={index}>
                  {formatINR(data.expenses?.[category.key]?.[index] || 0)}
                </td>
              ))}
              <td className="total-column">
                {formatINR(getTotal(category.key))}
              </td>
            </tr>
          ))}
          <tr className="total-row">
            <td className="category-name">Total Expenses</td>
            {months.map((_, index) => {
              const total = expenseCategories.reduce((sum, category) => 
                sum + (data.expenses?.[category.key]?.[index] || 0), 0);
              return <td key={index}>{formatINR(total)}</td>;
            })}
            <td className="total-column">{formatINR(getGrandTotal())}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const ProfitLossTable = ({ analysis, formatINR, formatPercent }) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  return (
    <div className="table-container profit-loss-table-full-width">
      <table className="financial-table profit-loss-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Revenue</th>
            <th>COGS</th>
            <th>Gross Profit</th>
            <th>Gross Margin</th>
            <th>Expenses</th>
            <th>Net Profit</th>
            <th>Net Margin</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {analysis.monthly.map((monthData, index) => (
            <tr key={monthData.month}>
              <td className="month-name">{monthData.month}</td>
              <td>{formatINR(monthData.revenue)}</td>
              <td>{formatINR(monthData.cogs)}</td>
              <td className={monthData.grossProfit >= 0 ? 'profit' : 'loss'}>
                {formatINR(monthData.grossProfit)}
              </td>
              <td>{formatPercent(monthData.grossMargin)}</td>
              <td>{formatINR(monthData.expenses)}</td>
              <td className={monthData.netProfit >= 0 ? 'profit' : 'loss'}>
                {formatINR(monthData.netProfit)}
              </td>
              <td className={monthData.netMargin >= 0 ? 'profit' : 'loss'}>
                {formatPercent(monthData.netMargin)}
              </td>
              <td>
                <span className={`status-badge ${monthData.financialHealth.toLowerCase()}`}>
                  {monthData.financialHealth}
                </span>
              </td>
            </tr>
          ))}
          <tr className="total-row">
            <td className="month-name">YTD TOTAL</td>
            <td>{formatINR(analysis.ytd.revenue)}</td>
            <td>{formatINR(analysis.ytd.cogs)}</td>
            <td className={analysis.ytd.grossProfit >= 0 ? 'profit' : 'loss'}>
              {formatINR(analysis.ytd.grossProfit)}
            </td>
            <td>{formatPercent(analysis.ytd.revenue > 0 ? (analysis.ytd.grossProfit / analysis.ytd.revenue * 100) : 0)}</td>
            <td>{formatINR(analysis.ytd.expenses)}</td>
            <td className={analysis.ytd.netProfit >= 0 ? 'profit' : 'loss'}>
              {formatINR(analysis.ytd.netProfit)}
            </td>
            <td className={analysis.ytd.netMargin >= 0 ? 'profit' : 'loss'}>
              {formatPercent(analysis.ytd.netMargin)}
            </td>
            <td>
              <span className={`status-badge ${analysis.ytd.financialHealth.toLowerCase()}`}>
                {analysis.ytd.financialHealth}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ProfitLossPage;
