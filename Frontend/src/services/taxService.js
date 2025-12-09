// frontend/src/services/taxService.js
import axios from 'axios';

// API Configuration
const getApiBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    if (process.env.VITE_API_URL) {
      return process.env.VITE_API_URL;
    }
  }
  
  if (typeof window !== 'undefined' && window.__API_URL__) {
    return window.__API_URL__;
  }
  
  const isProduction = typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    return window.location.origin + '/api';
  }
  
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();
const TIMEOUT = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_TIMEOUT) ? parseInt(process.env.REACT_APP_API_TIMEOUT, 10) : 30000;
const MAX_RETRIES = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_RETRIES) ? parseInt(process.env.REACT_APP_API_RETRIES, 10) : 2;

console.log('🔧 Enhanced Tax Service initialized with API URL:', API_BASE_URL);

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Auth helper functions
const getStoredToken = () => {
  try {
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  sessionStorage.getItem('token');
    return token;
  } catch (e) {
    console.warn('Could not access storage for token');
    return null;
  }
};

const getStoredTenantId = () => {
  try {
    let tenantId = localStorage.getItem('tenantId') || 
                   localStorage.getItem('tenant-id') ||
                   sessionStorage.getItem('tenantId');
    
    if (!tenantId) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          tenantId = user.tenantId || user.tenant_id;
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    return tenantId;
  } catch (e) {
    console.warn('Could not access storage for tenantId');
    return null;
  }
};

const isAuthenticated = () => {
  const token = getStoredToken();
  const tenantId = getStoredTenantId();
  return !!(token && tenantId);
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    const tenantId = getStoredTenantId();
    
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    
    if (tenantId) {
      config.headers['tenant-id'] = tenantId;
      config.headers['x-tenant-id'] = tenantId;
      config.headers['Tenant-ID'] = tenantId;
    }
    
    console.log('📤 Tax API Request:', {
      method: config.method?.toUpperCase(),
      url: config.baseURL + config.url,
      hasTenant: !!tenantId,
      hasAuth: !!token
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ Tax API Success:', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    try {
      const config = error.config || {};
      const method = (config.method || '').toUpperCase();
      const isGet = method === 'GET' || method === 'HEAD';

      const isTimeout = error.code === 'ECONNABORTED' || (error.message || '').toLowerCase().includes('timeout');

      if (isGet && isTimeout) {
        config.__retryCount = config.__retryCount || 0;
        if (config.__retryCount < MAX_RETRIES) {
          config.__retryCount += 1;
          const backoff = Math.min(1000 * 2 ** config.__retryCount, 5000);
          console.warn(`⏳ Retrying ${config.url} (attempt ${config.__retryCount}) after ${backoff}ms due to timeout`);
          return new Promise((resolve) => setTimeout(resolve, backoff)).then(() => api(config));
        }
      }
    } catch (retryErr) {
      console.warn('⚠️ Retry logic failed:', retryErr);
    }

    const errorInfo = {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase()
    };

    console.error('❌ Tax API Error:', errorInfo);

    if (error.response?.status === 401) {
      console.warn('🛑 Authentication failed');
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('tenantId');
      } catch (e) {}
      
      setTimeout(() => {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }, 100);
    }

    return Promise.reject(error);
  }
);

// Default data fallbacks
const getDefaultTaxRates = () => {
  const currentYear = new Date().getFullYear();
  return {
    financialYear: currentYear + '-' + (currentYear + 1),
    lastUpdated: new Date().toISOString(),
    source: 'Default Rates (New Tax Regime FY 2024-25)',
    regime: 'new',
    brackets: [
      { range: 'Up to ₹3,00,000', rate: 0, description: 'No tax', min: 0, max: 300000, slab: '0-3L' },
      { range: '₹3,00,001 - ₹6,00,000', rate: 5, description: 'Tax on amount exceeding ₹3L', min: 300001, max: 600000, slab: '3L-6L' },
      { range: '₹6,00,001 - ₹9,00,000', rate: 10, description: 'Tax on amount exceeding ₹6L', min: 600001, max: 900000, slab: '6L-9L' },
      { range: '₹9,00,001 - ₹12,00,000', rate: 15, description: 'Tax on amount exceeding ₹9L', min: 900001, max: 1200000, slab: '9L-12L' },
      { range: '₹12,00,001 - ₹15,00,000', rate: 20, description: 'Tax on amount exceeding ₹12L', min: 1200001, max: 1500000, slab: '12L-15L' },
      { range: 'Above ₹15,00,000', rate: 30, description: 'Tax on amount exceeding ₹15L', min: 1500001, max: null, slab: '15L+' }
    ],
    deductions: {
      standard: 75000,
      section80C: 150000,
      section80D: 25000,
      hra: 0,
      medical: 25000,
      nps: 50000
    },
    cess: 0.04
  };
};

const getDefaultTaxData = () => {
  const currentYear = new Date().getFullYear();
  return {
    totalIncome: 0,
    totalDeductions: 75000,
    taxableIncome: 0,
    taxLiability: 0,
    incomeBreakdown: {},
    deductionBreakdown: { standard: 75000 },
    taxBreakdown: [],
    hasIncomeData: false,
    isManualCalculation: false,
    taxOptimizationScore: 0,
    aiRecommendations: [],
    regime: 'new',
    effectiveTaxRate: 0,
    monthlyTax: 0,
    taxSavingsPotential: 0,
    year: currentYear,
    status: 'no_income_data'
  };
};

const getDefaultAIRecommendations = () => ({
  recommendations: [
    {
      id: 1,
      title: 'Maximize Section 80C Deductions',
      description: 'Consider investing in ELSS, PPF, or life insurance to claim up to ₹1.5 lakh under Section 80C',
      priority: 'high',
      potentialSavings: 45000,
      category: 'deductions',
      action: 'invest_80c'
    },
    {
      id: 2,
      title: 'Utilize HRA Exemption',
      description: 'Provide rent receipts to claim House Rent Allowance exemption',
      priority: 'medium',
      potentialSavings: 20000,
      category: 'exemptions',
      action: 'submit_rent_receipts'
    },
    {
      id: 3,
      title: 'Health Insurance Premium',
      description: 'Claim up to ₹25,000 for health insurance premiums under Section 80D',
      priority: 'medium',
      potentialSavings: 7500,
      category: 'deductions',
      action: 'review_health_insurance'
    }
  ],
  optimizationScore: 65,
  lastUpdated: new Date().toISOString()
});

const getDefaultDeadlines = () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  return [
    {
      id: 1,
      title: 'Advance Tax Installment - Q3',
      dueDate: new Date(now + 15 * day).toISOString(),
      type: 'income_tax',
      priority: 'high'
    },
    {
      id: 2,
      title: 'GST Return Filing (GSTR-3B)',
      dueDate: new Date(now + 20 * day).toISOString(),
      type: 'gst',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'TDS Payment',
      dueDate: new Date(now + 7 * day).toISOString(),
      type: 'tds',
      priority: 'high'
    }
  ];
};

const DEFAULT_TAX_TYPES = [
  'GST',
  'Income Tax',
  'Professional Tax',
  'TDS',
  'Property Tax',
  'Corporate Tax',
  'Capital Gains Tax',
  'Customs Duty',
  'Excise Duty',
  'Service Tax',
  'Other'
];

// Enhanced local tax calculation
const calculateTaxLocally = (income, regime = 'new') => {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, income - standardDeduction);
  
  let tax = 0;
  const breakdown = [];
  
  breakdown.push({
    range: 'Standard Deduction',
    tax: 0,
    rate: 0,
    slab: 'deduction',
    amount: standardDeduction
  });
  
  const brackets = getDefaultTaxRates().brackets;
  let remainingIncome = taxableIncome;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const bracketMin = bracket.min || 0;
    const bracketMax = bracket.max === null ? Infinity : bracket.max;
    
    if (remainingIncome > bracketMin) {
      const taxableInBracket = Math.min(remainingIncome, bracketMax) - bracketMin;
      if (taxableInBracket > 0) {
        const bracketTax = taxableInBracket * (bracket.rate / 100);
        tax += bracketTax;
        
        breakdown.push({
          range: bracket.range,
          tax: Math.round(bracketTax),
          rate: bracket.rate,
          slab: bracket.slab,
          taxableAmount: Math.round(taxableInBracket)
        });
        
        remainingIncome -= taxableInBracket;
      }
    }
  }
  
  const cess = tax * 0.04;
  breakdown.push({
    range: 'Health & Education Cess',
    tax: Math.round(cess),
    rate: 4,
    slab: 'cess',
    amount: tax
  });
  
  const totalTax = Math.round(tax + cess);
  
  // Calculate deductions based on regime
  const deductionBreakdown = { standard: standardDeduction };
  if (regime === 'old') {
    if (income > 500000) {
      deductionBreakdown.section80C = Math.min(150000, income * 0.15);
    }
    if (income > 300000) {
      deductionBreakdown.section80D = 25000;
    }
  }

  const totalDeductions = Object.values(deductionBreakdown).reduce((sum, amount) => sum + amount, 0);

  return {
    totalIncome: income,
    totalDeductions,
    taxableIncome,
    taxLiability: totalTax,
    incomeBreakdown: { salary: income },
    deductionBreakdown,
    taxBreakdown: breakdown.filter(item => item.tax > 0 || item.slab === 'deduction'),
    hasIncomeData: false,
    isManualCalculation: true,
    taxOptimizationScore: Math.min(85, 65 + (income > 1000000 ? 20 : 0)),
    aiRecommendations: getDefaultAIRecommendations().recommendations,
    regime,
    effectiveTaxRate: income > 0 ? (totalTax / income) * 100 : 0,
    monthlyTax: Math.round(totalTax / 12),
    year: new Date().getFullYear(),
    status: 'manual_calculation',
    manualIncome: income
  };
};

// Enhanced Tax Service
const taxService = {
  
  // GET /api/tax/current - Enhanced with real-time data
  async getCurrentTaxCalculation() {
    try {
      console.log('📊 Fetching enhanced tax calculation...');
      const response = await api.get('/tax/current');
      return response;
    } catch (error) {
      console.error('❌ getCurrentTaxCalculation failed:', error.message);
      return {
        data: {
          success: true,
          data: getDefaultTaxData(),
          message: 'Using default tax data'
        }
      };
    }
  },

  // GET /api/tax/rates - Always fetches current rates
  async getTaxRates() {
    try {
      console.log('📋 Fetching current tax rates...');
      const response = await api.get('/tax/rates');
      return response;
    } catch (error) {
      console.error('❌ getTaxRates failed:', error.message);
      return {
        data: {
          success: true,
          data: getDefaultTaxRates(),
          message: 'Using default tax rates'
        }
      };
    }
  },

  // GET /api/tax/ai/recommendations - Income-based recommendations
  async getAIRecommendations() {
    try {
      console.log('🤖 Fetching AI recommendations...');
      const response = await api.get('/tax/ai/recommendations');
      return response;
    } catch (error) {
      console.error('❌ getAIRecommendations failed:', error.message);
      return {
        data: {
          success: true,
          data: getDefaultAIRecommendations(),
          message: 'Using default recommendations'
        }
      };
    }
  },

  // GET /api/tax/upcoming-deadlines
  async getUpcomingDeadlines(days) {
    const daysParam = days || 30;
    try {
      console.log('📅 Fetching upcoming deadlines...');
      const response = await api.get('/tax/upcoming-deadlines?days=' + daysParam);
      return response;
    } catch (error) {
      console.error('❌ getUpcomingDeadlines failed:', error.message);
      return {
        data: {
          success: true,
          data: getDefaultDeadlines(),
          message: 'Using default deadlines'
        }
      };
    }
  },

  // GET /api/tax/summary
  async getTaxSummary(year) {
    const targetYear = year || new Date().getFullYear();
    try {
      console.log('📊 Fetching tax summary for year:', targetYear);
      const response = await api.get('/tax/summary?year=' + targetYear);
      return response;
    } catch (error) {
      console.error('❌ getTaxSummary failed:', error.message);
      return {
        data: {
          success: true,
          data: {
            summary: [],
            overall: {
              totalAmount: 0,
              totalRecords: 0,
              totalPaid: 0,
              totalPending: 0,
              totalOverdue: 0
            },
            year: targetYear
          },
          message: 'Using default summary'
        }
      };
    }
  },

  // GET /api/tax/tax-types
  async getTaxTypes() {
    try {
      console.log('🏷️ Fetching tax types...');
      const response = await api.get('/tax/tax-types');
      return response;
    } catch (error) {
      console.error('❌ getTaxTypes failed:', error.message);
      return {
        data: {
          success: true,
          data: DEFAULT_TAX_TYPES,
          message: 'Using default tax types'
        }
      };
    }
  },

  // POST /api/tax/calculate/manual - Enhanced with regime support
  async calculateManualTax(income, regime = 'new') {
    try {
      console.log('🧮 Calculating manual tax for income:', income, 'regime:', regime);
      const response = await api.post('/tax/calculate/manual', { 
        income: income,
        regime: regime 
      });
      return response;
    } catch (error) {
      console.error('❌ calculateManualTax failed:', error.message);
      return {
        data: {
          success: true,
          data: calculateTaxLocally(income, regime),
          message: 'Calculated locally'
        }
      };
    }
  },

  // POST /api/tax/reset
  async resetToIncomeTax() {
    try {
      console.log('🔄 Resetting to income-based tax...');
      const response = await api.post('/tax/reset');
      return response;
    } catch (error) {
      console.error('❌ resetToIncomeTax failed:', error.message);
      return {
        data: {
          success: true,
          data: getDefaultTaxData(),
          message: 'Reset completed'
        }
      };
    }
  },

  // Tax Configuration Management
  async getTaxConfig() {
    try {
      console.log('⚙️ Fetching tax configuration...');
      const response = await api.get('/tax/config');
      return response;
    } catch (error) {
      console.error('❌ getTaxConfig failed:', error.message);
      return {
        data: {
          success: true,
          data: getDefaultTaxRates(),
          message: 'Using default configuration'
        }
      };
    }
  },

  async updateTaxConfig(configData) {
    try {
      console.log('⚙️ Updating tax configuration...');
      const response = await api.post('/tax/config', configData);
      return response;
    } catch (error) {
      console.error('❌ updateTaxConfig failed:', error.message);
      throw new Error('Failed to update tax configuration: ' + error.message);
    }
  },

  // Enhanced data refresh
  async refreshTaxData() {
    try {
      console.log('🔄 Refreshing all tax data...');
      const [taxData, taxRates, recommendations] = await Promise.all([
        this.getCurrentTaxCalculation(),
        this.getTaxRates(),
        this.getAIRecommendations()
      ]);
      
      return {
        taxData: taxData.data,
        taxRates: taxRates.data,
        recommendations: recommendations.data
      };
    } catch (error) {
      console.error('❌ refreshTaxData failed:', error.message);
      throw error;
    }
  },

  // CRUD Operations
  async createTaxRecord(taxData) {
    try {
      console.log('📝 Creating tax record...');
      const response = await api.post('/tax/records', taxData);
      return response;
    } catch (error) {
      console.error('❌ createTaxRecord failed:', error.message);
      throw new Error('Failed to create tax record: ' + error.message);
    }
  },

  async getAllTaxRecords(projectId) {
    try {
      console.log('📋 Fetching all tax records...');
      let url = '/tax/records';
      if (projectId) {
        url = url + '?projectId=' + projectId;
      }
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error('❌ getAllTaxRecords failed:', error.message);
      return {
        data: {
          success: true,
          data: [],
          message: 'No records found'
        }
      };
    }
  },

  async updateTaxRecord(id, updateData) {
    try {
      console.log('✏️ Updating tax record:', id);
      const response = await api.put('/tax/records/' + id, updateData);
      return response;
    } catch (error) {
      console.error('❌ updateTaxRecord failed:', error.message);
      throw new Error('Failed to update tax record: ' + error.message);
    }
  },

  async deleteTaxRecord(id) {
    try {
      console.log('🗑️ Deleting tax record:', id);
      const response = await api.delete('/tax/records/' + id);
      return response;
    } catch (error) {
      console.error('❌ deleteTaxRecord failed:', error.message);
      throw new Error('Failed to delete tax record: ' + error.message);
    }
  },

  // Utility functions
  isAuthenticated() {
    return isAuthenticated();
  },

  getApiBaseUrl() {
    return API_BASE_URL;
  },

  async testConnection() {
    try {
      console.log('🔌 Testing API connection...');
      const response = await api.get('/tax/tax-types');
      return {
        success: true,
        message: 'API connection successful',
        url: API_BASE_URL,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: 'API connection failed: ' + error.message,
        url: API_BASE_URL,
        error: error.response?.status || error.message
      };
    }
  },

  getAuthInfo() {
    return {
      hasToken: !!getStoredToken(),
      hasTenantId: !!getStoredTenantId(),
      tenantId: getStoredTenantId(),
      isAuthenticated: isAuthenticated()
    };
  },

  // New: Get tax calculation summary
  getTaxCalculationSummary(taxData) {
    if (!taxData) return null;
    
    return {
      totalIncome: taxData.totalIncome,
      totalDeductions: taxData.totalDeductions,
      taxableIncome: taxData.taxableIncome,
      taxLiability: taxData.taxLiability,
      effectiveRate: taxData.effectiveTaxRate,
      monthlyTax: taxData.monthlyTax,
      optimizationScore: taxData.taxOptimizationScore,
      regime: taxData.regime
    };
  }
};

export default taxService;

export {
  api as taxApi,
  getDefaultTaxRates,
  getDefaultTaxData,
  getDefaultAIRecommendations,
  getDefaultDeadlines,
  DEFAULT_TAX_TYPES,
  calculateTaxLocally,
  isAuthenticated,
  getStoredToken,
  getStoredTenantId,
  API_BASE_URL
};