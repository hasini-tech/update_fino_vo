import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Calendar, DollarSign, Edit, Trash2, PlusCircle, Filter, TrendingUp,
  RefreshCw, Printer, Download, Search, Upload, Check, CheckSquare, Square,
  GitCompare, History, Eye, EyeOff, BarChart3, AlertCircle, X, IndianRupee,
  Ban, Undo2, FileSpreadsheet, FileText, Image, File, FileUp, Play
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import API_BASE from '../config/api';
import authService from '../services/authService';

const API_HOST = API_BASE.replace(/\/$/, '');

// Simple UUID-like generator for client-side use
const generateUniqueId = () => {
  // Generate a proper 6-digit tenant ID instead of UUID
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Enhanced Sub-Categories Mapping with detailed keywords
const initialSubCategories = {
  'Operating Expenses': [
    { name: 'Employee Salaries & Wages', keywords: ['salary', 'wage', 'employee', 'staff', 'payroll', 'compensation'] },
    { name: 'Marketing & Advertising Costs', keywords: ['marketing', 'advertising', 'promotion', 'ad', 'campaign', 'social media'] },
    { name: 'Office Rent & Lease', keywords: ['rent', 'lease', 'office space', 'premises'] },
    { name: 'Utilities', keywords: ['electricity', 'water', 'gas', 'utility', 'power', 'internet', 'broadband'] },
    { name: 'Office Supplies', keywords: ['stationery', 'supplies', 'office', 'paper', 'printer', 'toner'] },
    { name: 'Legal & Professional Charges', keywords: ['legal', 'lawyer', 'professional', 'consultant', 'audit', 'accounting'] },
    { name: 'IT & Software', keywords: ['software', 'it', 'computer', 'hardware', 'license', 'subscription', 'cloud'] },
    { name: 'Fuel / Transportation Costs', keywords: ['fuel', 'petrol', 'diesel', 'transport', 'vehicle', 'mileage'] },
    { name: 'Research & Development (R&D)', keywords: ['research', 'development', 'r&d', 'innovation', 'prototype'] },
    { name: 'Insurance & Loan Payments', keywords: ['insurance', 'premium', 'loan', 'emi', 'repayment'] },
    { name: 'Maintenance & Repairs', keywords: ['maintenance', 'repair', 'service', 'fix', 'upkeep'] },
    { name: 'Security Services', keywords: ['security', 'guard', 'surveillance', 'cctv', 'alarm'] },
    { name: 'Subscriptions & Membership Fees', keywords: ['subscription', 'membership', 'fee', 'renewal'] }
  ],
  'Travel & Commuting': [
    { name: 'Public Transport', keywords: ['bus', 'train', 'metro', 'public transport', 'transit', 'commute'] },
    { name: 'Parking Fees', keywords: ['parking', 'toll', 'fee', 'garage'] },
    { name: 'Vehicle / Automobile Costs', keywords: ['vehicle', 'automobile', 'car', 'maintenance', 'service', 'insurance'] },
    { name: 'Business Travel (Flights, Hotels, Car Rentals)', keywords: ['flight', 'hotel', 'car rental', 'travel', 'accommodation', 'lodging'] }
  ],
  'Cost of Goods Sold': [
    { name: 'Raw Material Costs', keywords: ['raw material', 'inventory', 'supplies', 'stock', 'purchase'] },
    { name: 'Labor / Worker Costs', keywords: ['labor', 'worker', 'contractor', 'wage', 'staff'] },
    { name: 'Manufacturing & Production Costs', keywords: ['manufacturing', 'production', 'factory', 'assembly', 'fabrication'] },
    { name: 'Freight & Shipping Charges', keywords: ['freight', 'shipping', 'delivery', 'courier', 'logistics'] },
    { name: 'Other COGS Costs', keywords: ['cogs', 'cost of goods', 'direct cost'] }
  ],
  'Non-Operating Expenses': [
    { name: 'Loan Interest Payments', keywords: ['interest', 'loan', 'finance charge', 'borrowing cost'] },
    { name: 'Taxes', keywords: ['tax', 'gst', 'vat', 'income tax', 'corporate tax'] },
    { name: 'Losses', keywords: ['loss', 'write-off', 'bad debt', 'impairment'] },
    { name: 'Other Non-Operating Costs', keywords: ['non-operating', 'extraordinary', 'exceptional'] }
  ],
  'Food': [
    { name: 'Groceries', keywords: ['grocery', 'supermarket', 'vegetable', 'fruit', 'food store'] },
    { name: 'Restaurant', keywords: ['restaurant', 'dining', 'eat out', 'meal', 'food court'] },
    { name: 'Coffee Shops', keywords: ['coffee', 'cafe', 'starbucks', 'beverage', 'drink'] },
    { name: 'Snacks', keywords: ['snack', 'fast food', 'quick bite', 'refreshment'] }
  ],
  'Clothing': [
    { name: 'Saree', keywords: ['saree', 'sari', 'traditional', 'ethnic wear'] },
    { name: 'Chudidar', keywords: ['chudidar', 'churidar', 'traditional', 'ethnic'] },
    { name: 'Jeans', keywords: ['jeans', 'denim', 'pants', 'trousers'] },
    { name: 'T-shirt', keywords: ['t-shirt', 'tshirt', 'tee', 'casual wear'] }
  ],
  'Miscellaneous Expenses': [
    { name: 'General Expenses', keywords: ['miscellaneous', 'general', 'other', 'various'] }
  ],
  'POS': [
    { name: 'Point of Sale Transactions', keywords: ['pos', 'point of sale', 'card payment', 'swipe', 'terminal'] }
  ]
};

// Convert the enhanced structure to the old format for compatibility
const convertSubCategoriesToOldFormat = (enhancedSubCategories) => {
  const oldFormat = {};
  Object.keys(enhancedSubCategories).forEach(category => {
    oldFormat[category] = enhancedSubCategories[category].map(item => item.name);
  });
  return oldFormat;
};

const oldFormatSubCategories = convertSubCategoriesToOldFormat(initialSubCategories);

// UPDATED: Styles with increased font sizes and better readability
const styles = {
  inputField: "w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-200 ease-in-out text-gray-800 bg-white hover:border-gray-300 shadow-sm text-base",
  inputFieldTable: "w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-purple-300 text-sm bg-white",
  btnPrimary: "flex items-center justify-center px-4 sm:px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 text-sm",
  btnSecondary: "flex items-center justify-center px-3 sm:px-4 py-2 bg-white text-gray-700 font-medium rounded-xl shadow-md hover:shadow-lg border-2 border-gray-200 hover:border-purple-300 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 text-sm",
  btnImport: "flex items-center justify-center px-4 sm:px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 text-sm",
  btnCompare: "flex items-center justify-center px-4 sm:px-5 py-2 bg-white text-gray-700 font-medium rounded-xl shadow-md hover:shadow-lg border-2 border-gray-200 hover:border-purple-300 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 text-sm",
  errorAlert: "mt-4 p-3 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 rounded-xl flex items-center mb-4 shadow-md text-sm",
  successAlert: "mt-4 p-3 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 text-green-700 rounded-xl flex items-center mb-4 shadow-md text-sm",
  warningAlert: "mt-4 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-xl flex items-center mb-4 shadow-md text-sm",
  loadingSpinner: "animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500",
  chartBarFill: "#8B5CF6",
  card: "bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100",
  statsCard: "bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100 transform hover:-translate-y-1",
  modal: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
  modalContent: "bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl transform transition-all max-h-[90vh] overflow-hidden",
  dropdownOption: "px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0 text-sm",
  dropdownContainer: "absolute z-10 w-full bg-white border-2 border-purple-200 rounded-xl shadow-xl max-h-48 overflow-auto mt-1 text-sm",
};

const Expenditure = ({ userSession }) => {
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [deletedHistory, setDeletedHistory] = useState([]);
  const [formData, setFormData] = useState({
    date: getTodayDate(),
    type: 'expense',
    category: '',
    subCategory: '',
    description: '',
    amount: '',
    paymentMode: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [categories] = useState(Object.keys(initialSubCategories));
  const [subCategories] = useState(oldFormatSubCategories);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [undoVisible, setUndoVisible] = useState(false);
  const [lastDeleted, setLastDeleted] = useState(null);
  const undoTimerRef = useRef(null);

  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    category: '',
    subCategory: '',
    paymentMode: '',
    remark: ''
  });

  const [showDeleteHistory, setShowDeleteHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState('category');

  // Compare feature states
  const [compareData, setCompareData] = useState({
    matches: [],
    mismatches: [],
    summary: {
      totalImported: 0,
      matches: 0,
      mismatches: 0,
      validRecords: 0
    }
  });
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareFile, setCompareFile] = useState(null);

  // Import feature states
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // Sync feature states
  const [showSync, setShowSync] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Date input refs for calendar opening
  const dateInputRef = useRef(null);
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const importFileInputRef = useRef(null);
  const compareFileInputRef = useRef(null);
  const syncFileInputRef = useRef(null);

  // NEW: Period filter state
  const [periodFilter, setPeriodFilter] = useState('all');
  const [periodExpenses, setPeriodExpenses] = useState(0);

  const apiFetch = useCallback(async (endpoint, options = {}) => {
  try {
    // Build the correct URL
    let url = `${API_HOST}/api/transactions`;
    if (endpoint && endpoint !== '' && endpoint !== '/') {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
      url = `${API_HOST}/api/transactions/${cleanEndpoint}`;
    }
    
    // Get tenant ID with proper validation
    let tenantId = null;
    
    try {
      tenantId = authService.getTenantId();
      
      // Validate and clean tenant ID
      if (tenantId) {
        tenantId = String(tenantId).trim();
        
        // Check if it's a valid format
        const isValid6Digit = /^\d{6}$/.test(tenantId);
        const isValidFallback = tenantId.startsWith('fallback-');
        
        if (!isValid6Digit && !isValidFallback) {
          console.warn('⚠️ Tenant ID format invalid:', tenantId);
          // Generate a valid fallback
          tenantId = 'fallback-' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('tenantId', tenantId);
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to get tenant ID:', e.message);
    }
    
    // If no valid tenant ID, generate fallback
    if (!tenantId) {
      tenantId = 'fallback-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('tenantId', tenantId);
      console.log('📦 Generated fallback tenant ID:', tenantId);
    }
    
    // Get token
    const token = authService.getToken();
    
    // Build headers - use simple string values, no objects
    const headers = {
      'Content-Type': 'application/json',
      'tenant-id': tenantId,        // lowercase (Express normalizes headers)
      'x-tenant-id': tenantId,      // also lowercase
    };
    
    // Add authorization if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add body headers if needed
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    
    const fetchOptions = {
      method: options.method || 'GET',
      headers: headers,
      mode: 'cors',
    };
    
    // Only add body for non-GET requests
    if (options.body && options.method !== 'GET') {
      fetchOptions.body = options.body;
    }

    console.log('🌐 MongoDB API Request:', {
      method: fetchOptions.method,
      url: url,
      tenantId: tenantId,
      hasToken: !!token,
      headers: {
        'tenant-id': headers['tenant-id'],
        'x-tenant-id': headers['x-tenant-id'],
      }
    });

    const response = await fetch(url, fetchOptions);
    
    console.log('📥 MongoDB Response Status:', response.status, 'from', url);
    
    if (response.status === 401) {
      // Clear invalid tokens
      try {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      } catch (e) {
        console.warn('Could not clear tokens:', e);
      }
      throw new Error('Authentication failed. Please login again.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ MongoDB API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('✅ MongoDB API Response Data:', responseData);
    return responseData;
    
  } catch (err) {
    console.error('❌ MongoDB API Request failed:', err);
    throw err;
  }
}, []);

  const showMessage = useCallback((setter, message, duration = 3000) => {
    setter(message);
    setTimeout(() => setter(''), duration);
  }, []);

  // Sync Feature Functions
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setSyncResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProcessing(true);
      
      // Get auth headers with fallback
      let authHeaders;
      try {
        authHeaders = authService.getAuthHeaders();
      } catch (e) {
        console.warn('⚠️ Failed to get auth headers, using fallback:', e.message);
        const fallbackTenantId = 'fallback-' + Math.random().toString(36).substr(2, 9);
        const token = authService.getToken();
        authHeaders = {
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Tenant-ID': fallbackTenantId,
          'x-tenant-id': fallbackTenantId,
          'Tenant-Id': fallbackTenantId,
          'tenant-id': fallbackTenantId
        };
        localStorage.setItem('tenantId', fallbackTenantId);
      }
      
      const response = await fetch(`${API_HOST}/api/sync/upload`, {
        method: 'POST',
        body: formData,
        headers: authHeaders
      });

      const result = await response.json();
      
      if (result.success) {
        setSyncResult({ 
          type: 'upload_success', 
          message: 'File uploaded successfully! Click Process to import transactions.',
          data: result.data 
        });
      } else {
        setSyncResult({ 
          type: 'error', 
          message: result.message || 'Upload failed' 
        });
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setSyncResult({ 
        type: 'error', 
        message: 'Upload failed: ' + error.message 
      });
      setSelectedFile(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || !syncResult?.data) {
      setSyncResult({ 
        type: 'error', 
        message: 'No file uploaded or file data missing' 
      });
      return;
    }

    try {
      setProcessing(true);
      
      // Get auth headers and tenant ID with fallback
      let authHeaders;
      let tenantId = authService.getTenantId();
      
      try {
        authHeaders = authService.getAuthHeaders();
      } catch (e) {
        console.warn('⚠️ Failed to get auth headers, using fallback:', e.message);
        const fallbackTenantId = 'fallback-' + Math.random().toString(36).substr(2, 9);
        tenantId = fallbackTenantId;
        const token = authService.getToken();
        authHeaders = {
          'Authorization': token ? `Bearer ${token}` : '',
          'X-Tenant-ID': fallbackTenantId,
          'x-tenant-id': fallbackTenantId,
          'Tenant-Id': fallbackTenantId,
          'tenant-id': fallbackTenantId,
          'Content-Type': 'application/json'
        };
        localStorage.setItem('tenantId', fallbackTenantId);
      }
      
      const response = await fetch(`${API_HOST}/api/sync/process`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          filename: syncResult.data.filename,
          tenantId: tenantId
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSyncResult({ 
          type: 'process_success', 
          message: result.message,
          data: result.data 
        });
        showMessage(setSuccessMessage, `Successfully imported ${result.data.saved} transactions!`);
        
        // Refresh transactions list
        await fetchTransactions();
        
        // Reset after successful processing
        setTimeout(() => {
          setShowSync(false);
          setSelectedFile(null);
          setSyncResult(null);
        }, 2000);
      } else {
        setSyncResult({ 
          type: 'error', 
          message: result.message || 'Processing failed' 
        });
      }
    } catch (error) {
      console.error('Process error:', error);
      setSyncResult({ 
        type: 'error', 
        message: 'Processing failed: ' + error.message 
      });
    } finally {
      setProcessing(false);
    }
  };

  // Optimized fetch with lazy loading and caching
  const fetchTransactions = useCallback(async (forceRefresh = false) => {
  setLoading(true);
  setError('');
  
  try {
    console.log('🔄 [FETCH START] Fetching transactions from MongoDB...');
    
    // CRITICAL: Get tenant ID - this MUST match what backend expects
    const tenantId = authService.getTenantId();
    console.log('🏢 [TENANT ID] Using Tenant ID:', tenantId, '| Type:', typeof tenantId, '| Length:', tenantId?.length);
    
    if (!tenantId) {
      console.warn('⚠️ [WARNING] No tenant ID found! Cannot fetch transactions.');
      setError('Tenant ID not found. Please refresh the page.');
      setTransactions([]);
      setFilteredTransactions([]);
      return;
    }
    
    // Fetch fresh data from MongoDB with proper headers
    console.log('📡 [REQUEST] Calling GET /api/transactions/expenses with headers:', {
      'Tenant-Id': tenantId,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json'
    });
    
    const response = await apiFetch('expenses', {
      method: 'GET'
    });

    console.log('📥 [RESPONSE] Raw API Response:', response);
    console.log('📥 [RESPONSE] Response keys:', Object.keys(response || {}));
    console.log('📥 [RESPONSE] Response.success:', response?.success);
    console.log('📥 [RESPONSE] Response.count:', response?.count);
    console.log('📥 [RESPONSE] Response.data type:', Array.isArray(response?.data) ? 'array' : typeof response?.data);
    console.log('📥 [RESPONSE] Response.data length:', response?.data?.length);

    // Handle different response structures from backend
    let transactionsData = [];
    
    if (response && response.success) {
      // Backend returns: { success: true, data: [...] }
      if (Array.isArray(response.data)) {
        transactionsData = response.data;
        console.log('✅ [PARSE 1] Extracted data from response.data (array)');
      } else if (response.data && Array.isArray(response.data.data)) {
        transactionsData = response.data.data;
        console.log('✅ [PARSE 2] Extracted data from response.data.data (nested array)');
      }
    } else if (Array.isArray(response)) {
      // Backend returns array directly
      transactionsData = response;
      console.log('✅ [PARSE 3] Response is array directly');
    } else if (response && response.data) {
      // Backend returns: { data: [...] }
      if (Array.isArray(response.data)) {
        transactionsData = response.data;
        console.log('✅ [PARSE 4] Extracted data from response.data (no success flag)');
      } else if (response.data.data && Array.isArray(response.data.data)) {
        transactionsData = response.data.data;
        console.log('✅ [PARSE 5] Extracted data from response.data.data (nested, no success flag)');
      }
    }
    
    console.log('✅ [FINAL] Parsed transactions from MongoDB:', transactionsData.length, 'records');
    if (transactionsData.length > 0) {
      console.log('📋 [SAMPLE] First transaction:', JSON.stringify(transactionsData[0], null, 2));
    } else {
      console.log('⚠️ [WARNING] No transactions returned from backend!');
    }
    
    // Filter for expense type only (should already be expenses from backend, but filter anyway)
    const expenseTransactions = transactionsData.filter(t => t.type === 'expense' || !t.type);
    console.log('💰 [FILTERED] Expense transactions after filtering:', expenseTransactions.length);
    
    // Update state with MongoDB data
    setTransactions(expenseTransactions);
    setFilteredTransactions(expenseTransactions);
    
    console.log('✅ [SUCCESS] Transactions updated in state');
    
  } catch (err) {
    console.error('❌ [ERROR] Fetch transactions error:', err);
    console.error('❌ [ERROR] Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    setError(`Failed to load transactions from MongoDB: ${err.message}`);
    // Set empty arrays to prevent loading state from persisting
    setTransactions([]);
    setFilteredTransactions([]);
  } finally {
    setLoading(false);
  }
}, [apiFetch, showMessage, authService]);

  // Load data on component mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // NEW: Calculate period expenses when period filter or transactions change
  useEffect(() => {
    const calculatePeriodExpenses = () => {
      const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
      
      if (periodFilter === 'all') {
        setPeriodExpenses(expenseTransactions.reduce((sum, t) => sum + t.amount, 0));
        return;
      }

      const now = new Date();
      let startDate = new Date();

      switch (periodFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }

      const periodTransactions = expenseTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate;
      });

      setPeriodExpenses(periodTransactions.reduce((sum, t) => sum + t.amount, 0));
    };

    calculatePeriodExpenses();
  }, [periodFilter, filteredTransactions]);

  // Memoized calculations for better performance
  const { totalExpenses, totalExpenseEntries, sortedTopCostData } = useMemo(() => {
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    const totalExpenseEntries = expenseTransactions.length;

    const topCostData = expenseTransactions.reduce((acc, curr) => {
      const cat = curr.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + curr.amount;
      return acc;
    }, {});
    
    const sortedTopCostData = Object.entries(topCostData)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { totalExpenses, totalExpenseEntries, sortedTopCostData };
  }, [filteredTransactions]);

  // FIXED: Properly ordered transactions - sorted by date (newest first) and then by creation time
  const displayedTransactions = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const fields = [
          new Date(t.date).toLocaleDateString('en-IN'),
          t.type,
          t.category,
          t.subCategory,
          t.description,
          t.paymentMode,
          t.remark,
          String(t.amount)
        ];
        return fields.some(f => f && f.toString().toLowerCase().includes(q));
      })
      .sort((a, b) => {
        // First sort by date (newest first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        // If same date, sort by creation time (newest first)
        const timeA = new Date(a.createdAt || a._id).getTime();
        const timeB = new Date(b.createdAt || b._id).getTime();
        return timeB - timeA;
      });
  }, [filteredTransactions, searchQuery]);

  // Enhanced CSV Parser - More flexible and robust
  const parseCSV = useCallback((csvText) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has only headers');
      }

      // More robust delimiter detection
      const firstLine = lines[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;
      
      let delimiter = ',';
      if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
      if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

      // Parse headers with more flexible mapping
      const headers = firstLine.split(delimiter).map(h => 
        h.trim().replace(/"/g, '').toLowerCase()
      );

      console.log('Detected headers:', headers);
      console.log('Using delimiter:', delimiter);

      // More comprehensive header mapping
      const headerMap = {
        // Date variations
        'date': 'date',
        'transaction date': 'date',
        'transaction_date': 'date',
        'txn date': 'date',
        'txn_date': 'date',
        'expense date': 'date',
        'expense_date': 'date',
        
        // Amount variations
        'amount': 'amount',
        'transaction amount': 'amount',
        'transaction_amount': 'amount',
        'txn amount': 'amount',
        'txn_amount': 'amount',
        'expense amount': 'amount',
        'expense_amount': 'amount',
        'debit': 'amount',
        'credit': 'amount',
        
        // Category variations
        'category': 'category',
        'transaction category': 'category',
        'transaction_category': 'category',
        'expense category': 'category',
        'expense_category': 'category',
        'type': 'category',
        
        // Description variations
        'description': 'description',
        'transaction description': 'description',
        'transaction_description': 'description',
        'details': 'description',
        'narration': 'description',
        'remark': 'description',
        'remarks': 'description',
        'note': 'description',
        'notes': 'description',
        
        // Payment mode variations
        'payment mode': 'paymentmode',
        'payment_mode': 'paymentmode',
        'payment method': 'paymentmode',
        'payment_method': 'paymentmode',
        'mode': 'paymentmode',
        'payment': 'paymentmode',
        
        // Sub-category variations
        'subcategory': 'subcategory',
        'sub category': 'subcategory',
        'sub_category': 'subcategory',
        'sub type': 'subcategory',
        'sub_type': 'subcategory',

        // Remarks variations
        'remark': 'remark',
        'remarks': 'remark',
        'note': 'remark',
        'notes': 'remark',
        'comment': 'remark',
        'comments': 'remark'
      };

      const normalizedHeaders = headers.map(header => {
        // Try exact match first
        if (headerMap[header]) return headerMap[header];
        
        // Try partial matches
        for (const [key, value] of Object.entries(headerMap)) {
          if (header.includes(key)) return value;
        }
        
        return header; // Return original if no match found
      });

      console.log('Normalized headers:', normalizedHeaders);

      // Parse data rows with better error handling
      const parsedData = [];
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const line = lines[i].trim();
          if (!line) continue;

          // Handle quoted fields and special characters more robustly
          let values = [];
          let inQuotes = false;
          let currentValue = '';
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              values.push(currentValue.trim().replace(/^"|"$/g, ''));
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim().replace(/^"|"$/g, ''));

          const row = {};
          normalizedHeaders.forEach((header, colIndex) => {
            if (values[colIndex] !== undefined && values[colIndex] !== '') {
              row[header] = values[colIndex];
            }
          });
          
          // Only add row if it has at least date and amount
          if (row.date && row.amount) {
            parsedData.push(row);
          } else {
            console.warn(`Skipping row ${i + 1}: Missing date or amount`, row);
          }
        } catch (rowError) {
          console.warn(`Error parsing row ${i + 1}:`, rowError);
          continue;
        }
      }

      console.log(`Successfully parsed ${parsedData.length} rows from CSV`);
      return parsedData;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw new Error(`Failed to parse CSV file: ${error.message}`);
    }
  }, []);

  // Enhanced date parser - handles more formats
  const parseDate = useCallback((dateString) => {
    if (!dateString) return null;
    
    try {
      // Remove any time portion if present and clean the string
      dateString = dateString.toString().split(' ')[0].trim().replace(/"/g, '');
      
      // Try different date formats in order of commonality
      const formats = [
        /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, // DD/MM/YYYY or DD-MM-YYYY
        /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, // YYYY/MM/DD or YYYY-MM-DD
        /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, // DD/MM/YY or DD-MM-YY
        /^(\d{4})(\d{2})(\d{2})$/, // YYYYMMDD
      ];

      for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
          let year, month, day;
          
          if (format === formats[0]) {
            // DD/MM/YYYY or DD-MM-YYYY
            day = match[1].padStart(2, '0');
            month = match[2].padStart(2, '0');
            year = match[3];
          } else if (format === formats[1]) {
            // YYYY/MM/DD or YYYY-MM-DD
            year = match[1];
            month = match[2].padStart(2, '0');
            day = match[3].padStart(2, '0');
          } else if (format === formats[2]) {
            // DD/MM/YY or DD-MM-YY
            day = match[1].padStart(2, '0');
            month = match[2].padStart(2, '0');
            year = '20' + match[3]; // Assuming 21st century
          } else if (format === formats[3]) {
            // YYYYMMDD
            year = match[1];
            month = match[2];
            day = match[3];
          }
          
          // Validate date
          const date = new Date(`${year}-${month}-${day}`);
          if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
            return `${year}-${month}-${day}`;
          }
        }
      }
      
      // Fallback to native Date parsing
      const date = new Date(dateString);
      if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
        return date.toISOString().split('T')[0];
      }
      
      console.warn(`Unable to parse date: "${dateString}"`);
      return null;
    } catch (error) {
      console.warn(`Error parsing date "${dateString}":`, error);
      return null;
    }
  }, []);

  // Enhanced amount parser - handles more currency formats
  const parseAmount = useCallback((amountString) => {
    if (!amountString) return 0;
    
    try {
      // Convert to string and clean
      let cleaned = amountString.toString()
        .replace(/[₹$,€£]/g, '') // Remove currency symbols
        .replace(/,/g, '') // Remove thousands separators
        .replace(/\s/g, '') // Remove spaces
        .trim();

      // Handle negative amounts in parentheses or with minus sign
      if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        cleaned = '-' + cleaned.slice(1, -1);
      }
      
      if (cleaned.startsWith('-') || cleaned.endsWith('-')) {
        cleaned = '-' + cleaned.replace(/-/g, '');
      }

      // Parse as float
      const amount = parseFloat(cleaned);
      
      if (isNaN(amount)) {
        console.warn(`Unable to parse amount: "${amountString}" -> "${cleaned}"`);
        return 0;
      }
      
      return Math.abs(amount); // Always return positive for expenses
    } catch (error) {
      console.warn(`Error parsing amount "${amountString}":`, error);
      return 0;
    }
  }, []);

  // Helper function to read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file: ' + e.target.error));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // Helper function to read file as ArrayBuffer for Excel files
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file: ' + e.target.error));
      reader.readAsArrayBuffer(file);
    });
  };

  // FIXED: Import CSV functionality - More robust and flexible
  const handleImport = useCallback(async (file) => {
    try {
      setImportLoading(true);
      setError('');
      
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let parsedData = [];

      console.log('Processing file for import:', file.name, 'Type:', file.type, 'Extension:', fileExtension);

      // Handle different file types
      if (fileExtension === 'csv' || file.type === 'text/csv') {
        // Process CSV files
        const csvText = await readFileAsText(file);
        parsedData = parseCSV(csvText);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls' || file.type.includes('spreadsheet')) {
        // Process Excel files - Load XLSX library dynamically
        try {
          const XLSX = await import('xlsx');
          const arrayBuffer = await readFileAsArrayBuffer(file);
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          // Get the first worksheet
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          
          // Convert to JSON with header: 1 to get proper headers
          const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log('Excel raw data:', excelData);
          
          if (excelData.length < 2) {
            throw new Error('Excel file is empty or has only headers');
          }

          // Extract headers from first row
          const headers = excelData[0].map(h => h.toString().toLowerCase().trim());
          console.log('Excel headers:', headers);

          // Convert to array of objects
          parsedData = excelData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              if (row[index] !== undefined) {
                obj[header] = row[index];
              }
            });
            return obj;
          });

          console.log('Processed Excel data:', parsedData);
        } catch (excelError) {
          console.error('Error processing Excel file:', excelError);
          throw new Error('Failed to process Excel file. Please ensure it is a valid Excel file.');
        }
      } else if (fileExtension === 'pdf' || file.type === 'application/pdf') {
        // For PDF files, we can't extract data automatically
        throw new Error('PDF files cannot be automatically imported. Please export your data as CSV or Excel first.');
      } else if (fileExtension.match(/(jpg|jpeg|png|gif|bmp|webp)/) || file.type.includes('image')) {
        // For image files, we can't extract data automatically
        throw new Error('Image files cannot be automatically imported. Please export your data as CSV or Excel first.');
      } else {
        throw new Error(`Unsupported file format: ${fileExtension}. Please use CSV or Excel files.`);
      }

      if (!parsedData || parsedData.length === 0) {
        throw new Error('No valid data found in the file. Please check the file format.');
      }

      console.log('Parsed data for import:', parsedData);

      // Process and validate each record
      const processedRecords = [];
      const errors = [];

      for (const [index, record] of parsedData.entries()) {
        try {
          const normalizedDate = parseDate(record.date);
          const normalizedAmount = parseAmount(record.amount);
          
          if (!normalizedDate) {
            errors.push(`Row ${index + 2}: Invalid date format - "${record.date}"`);
            continue;
          }
          
          if (normalizedAmount <= 0) {
            errors.push(`Row ${index + 2}: Invalid amount - "${record.amount}"`);
            continue;
          }

          // Auto-detect category based on description if not provided
          let category = record.category || 'Miscellaneous Expenses';
          if (!record.category && record.description) {
            // Simple category detection from description
            const desc = record.description.toLowerCase();
            if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery')) {
              category = 'Food';
            } else if (desc.includes('travel') || desc.includes('fuel') || desc.includes('transport')) {
              category = 'Travel & Commuting';
            } else if (desc.includes('shopping') || desc.includes('clothing')) {
              category = 'Clothing';
            } else if (desc.includes('salary') || desc.includes('employee') || desc.includes('wage')) {
              category = 'Operating Expenses';
            } else if (desc.includes('rent') || desc.includes('lease')) {
              category = 'Operating Expenses';
            } else if (desc.includes('utility') || desc.includes('electricity') || desc.includes('water')) {
              category = 'Operating Expenses';
            }
          }

          processedRecords.push({
            date: normalizedDate,
            type: 'expense',
            category: category,
            subCategory: record.subcategory || record.subCategory || '',
            description: record.description || `Imported expense ${normalizedDate}`,
            amount: normalizedAmount,
            paymentMode: record.paymentmode || record.paymentMode || 'Cash',
            remark: record.remark || record.remarks || '',
            tenantId: authService.getTenantId(),
            imported: true
          });
        } catch (recordError) {
          errors.push(`Row ${index + 2}: ${recordError.message}`);
        }
      }

      if (processedRecords.length === 0) {
        throw new Error('No valid records found to import. ' + errors.join('; '));
      }

      // Import records with progress
      let importedCount = 0;
      const importErrors = [];

      for (const record of processedRecords) {
        try {
          await apiFetch('', {
            method: 'POST',
            body: JSON.stringify(record),
          });
          importedCount++;
        } catch (error) {
          importErrors.push(`Failed to import record: ${error.message}`);
        }
      }

      if (importedCount > 0) {
        const successMsg = `Successfully imported ${importedCount} expense records!`;
        
        if (errors.length > 0 || importErrors.length > 0) {
          const warningMsg = `${errors.length + importErrors.length} records had issues.`;
          showMessage(setWarningMessage, warningMsg);
          console.warn('Import warnings:', [...errors, ...importErrors]);
        }
        
        showMessage(setSuccessMessage, successMsg);
        await fetchTransactions();
        setShowImportModal(false);
        setImportFile(null);
      } else {
        throw new Error('No records were imported successfully. ' + importErrors.join('; '));
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import file: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  }, [parseCSV, apiFetch, fetchTransactions, showMessage, parseDate, parseAmount]);

  // FIXED: Enhanced data extraction from imported records
  const extractTransactionData = useCallback((record) => {
    try {
      // Extract date with multiple fallbacks - handle different field names
      const date = parseDate(
        record.date || 
        record['transaction-date'] || 
        record.transaction_date || 
        record['transaction date'] ||
        record.Date ||
        record.DATE
      );

      // Extract amount with multiple fallbacks
      const amount = parseAmount(
        record.amount || 
        record.amounts || 
        record.debit || 
        record.credit || 
        record['transaction amount'] ||
        record.transaction_amount ||
        record.Amount ||
        record.AMOUNT
      );

      // Extract category with multiple fallbacks
      const category = 
        record.category || 
        record.categories || 
        record.type || 
        record['transaction category'] ||
        record.transaction_category ||
        record.Category ||
        record.CATEGORY ||
        'Miscellaneous Expenses';

      // Extract description with multiple fallbacks
      const description = 
        record.description || 
        record.desc || 
        record.narration || 
        record.remark || 
        record.remarks || 
        record.note ||
        record.notes ||
        record.details ||
        record['transaction description'] ||
        record.transaction_description ||
        record.Description ||
        record.DESCRIPTION ||
        'No description';

      // Extract payment mode with multiple fallbacks
      const paymentMode = 
        record.paymentmode || 
        record.paymentMode || 
        record['payment mode'] || 
        record.payment_mode || 
        record.mode || 
        record.payment ||
        record['payment method'] ||
        record.payment_method ||
        'Cash';

      // Extract sub-category
      const subCategory = 
        record.subcategory || 
        record.subCategory || 
        record['sub category'] || 
        record.sub_category || 
        record['sub type'] ||
        record.sub_type ||
        '';

      // Extract remarks
      const remark = 
        record.remark || 
        record.remarks || 
        record.note ||
        record.notes ||
        record.comment ||
        record.comments ||
        '';

      return {
        date,
        amount,
        category,
        description,
        paymentMode,
        subCategory,
        remark,
        originalData: record // Keep original data for debugging
      };
    } catch (error) {
      console.error('Error extracting transaction data:', error, record);
      return {
        date: null,
        amount: 0,
        category: 'Miscellaneous Expenses',
        description: 'Error processing record',
        paymentMode: 'Cash',
        subCategory: '',
        remark: '',
        originalData: record
      };
    }
  }, [parseDate, parseAmount]);

  // FIXED: Enhanced comparison logic - Better matching with tolerance and proper data extraction
  const compareDataWithCurrent = useCallback((currentData, importedData) => {
    const matches = [];
    const mismatches = [];

    // Get only expense transactions from current data
    const currentExpenses = currentData.filter(t => t.type === 'expense');

    // Process imported data
    importedData.forEach((importedItem, index) => {
      try {
        // Extract all data from the imported record
        const extractedData = extractTransactionData(importedItem);
        
        const {
          date: importedDate,
          amount: importedAmount,
          category: importedCategory,
          description: importedDescription,
          paymentMode: importedPaymentMode,
          subCategory: importedSubCategory,
          remark: importedRemark
        } = extractedData;

        // Skip invalid entries
        if (!importedDate || importedAmount <= 0) {
          mismatches.push({
            imported: {
              date: importedDate || 'N/A',
              amount: importedAmount,
              category: importedCategory,
              description: importedDescription,
              paymentMode: importedPaymentMode,
              subCategory: importedSubCategory,
              remark: importedRemark,
              status: 'invalid',
              reason: 'Invalid date or amount'
            },
            status: 'invalid'
          });
          return;
        }

        // Try to find a match in current data with multiple strategies
        let foundMatch = null;
        let matchStrategy = '';

        // Strategy 1: Exact match on date and amount
        foundMatch = currentExpenses.find(currentItem => {
          const currentDate = parseDate(currentItem.date);
          const currentAmount = parseAmount(currentItem.amount);
          
          return currentDate === importedDate && currentAmount === importedAmount;
        });
        if (foundMatch) matchStrategy = 'exact_amount_date';

        // Strategy 2: Date match with amount tolerance (for rounding differences)
        if (!foundMatch) {
          foundMatch = currentExpenses.find(currentItem => {
            const currentDate = parseDate(currentItem.date);
            const currentAmount = parseAmount(currentItem.amount);
            const amountDiff = Math.abs(currentAmount - importedAmount);
            const amountTolerance = 0.01; // 1 paisa tolerance
            
            return currentDate === importedDate && amountDiff <= amountTolerance;
          });
          if (foundMatch) matchStrategy = 'date_amount_tolerance';
        }

        // Strategy 3: Date and description similarity
        if (!foundMatch && importedDescription) {
          foundMatch = currentExpenses.find(currentItem => {
            const currentDate = parseDate(currentItem.date);
            const currentDescription = (currentItem.description || '').toLowerCase().trim();
            const currentAmount = parseAmount(currentItem.amount);
            
            // Check if descriptions are similar (contain common words)
            const currentWords = currentDescription.split(/\s+/).filter(w => w.length > 3);
            const importedWords = importedDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const commonWords = currentWords.filter(word => importedWords.includes(word));
            
            const similarity = commonWords.length / Math.max(currentWords.length, importedWords.length);
            
            return currentDate === importedDate && similarity > 0.3 && Math.abs(currentAmount - importedAmount) <= 1;
          });
          if (foundMatch) matchStrategy = 'date_description_similarity';
        }

        if (foundMatch) {
          matches.push({
            imported: {
              date: importedDate,
              amount: importedAmount,
              category: importedCategory,
              description: importedDescription,
              paymentMode: importedPaymentMode,
              subCategory: importedSubCategory,
              remark: importedRemark
            },
            current: foundMatch,
            status: 'match',
            matchStrategy: matchStrategy
          });
        } else {
          mismatches.push({
            imported: {
              date: importedDate,
              amount: importedAmount,
              category: importedCategory,
              description: importedDescription,
              paymentMode: importedPaymentMode,
              subCategory: importedSubCategory,
              remark: importedRemark
            },
            status: 'mismatch',
            reason: 'No matching transaction found'
          });
        }
      } catch (error) {
        console.error(`Error processing imported item ${index}:`, error);
        mismatches.push({
          imported: {
            date: 'N/A',
            amount: 0,
            category: 'N/A',
            description: 'Error processing record',
            paymentMode: 'N/A',
            subCategory: 'N/A',
            remark: 'N/A'
          },
          status: 'error',
          reason: error.message
        });
      }
    });

    return {
      matches,
      mismatches,
      summary: {
        totalImported: importedData.length,
        matches: matches.length,
        mismatches: mismatches.length,
        validRecords: matches.length + mismatches.length
      }
    };
  }, [extractTransactionData, parseDate, parseAmount]);

  // FIXED: Enhanced Compare functionality - Proper data extraction and display
  const handleCompare = useCallback(async (file) => {
    try {
      setCompareLoading(true);
      setError('');
      
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let comparisonData = [];

      console.log('Processing file for comparison:', file.name, 'Type:', file.type, 'Extension:', fileExtension);

      // Handle different file types
      if (fileExtension === 'csv' || file.type === 'text/csv') {
        // Process CSV files
        const csvText = await readFileAsText(file);
        comparisonData = parseCSV(csvText);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls' || file.type.includes('spreadsheet')) {
        // Process Excel files - Load XLSX library dynamically
        try {
          const XLSX = await import('xlsx');
          const arrayBuffer = await readFileAsArrayBuffer(file);
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          // Get the first worksheet
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          
          // Convert to JSON with header: 1 to get proper headers
          const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log('Excel raw data:', excelData);
          
          if (excelData.length < 2) {
            throw new Error('Excel file is empty or has only headers');
          }

          // Extract headers from first row
          const headers = excelData[0].map(h => h.toString().toLowerCase().trim());
          console.log('Excel headers:', headers);

          // Convert to array of objects
          comparisonData = excelData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              if (row[index] !== undefined) {
                obj[header] = row[index];
              }
            });
            return obj;
          });

          console.log('Processed Excel data:', comparisonData);
        } catch (excelError) {
          console.error('Error processing Excel file:', excelError);
          throw new Error('Failed to process Excel file. Please ensure it is a valid Excel file.');
        }
      } else if (fileExtension === 'pdf' || file.type === 'application/pdf') {
        // For PDF files, show a message that we can't extract data automatically
        showMessage(setWarningMessage, 'PDF files cannot be automatically compared. Please export your data as CSV or Excel for comparison.');
        setCompareLoading(false);
        return;
      } else if (fileExtension.match(/(jpg|jpeg|png|gif|bmp|webp)/) || file.type.includes('image')) {
        // For image files, show a message
        showMessage(setWarningMessage, 'Image files cannot be automatically compared. Please export your data as CSV or Excel for comparison.');
        setCompareLoading(false);
        return;
      } else {
        throw new Error(`Unsupported file format: ${fileExtension}. Please use CSV or Excel files.`);
      }

      if (!comparisonData || comparisonData.length === 0) {
        throw new Error('No valid data found in the file. Please check the file format.');
      }

      console.log('Final data for comparison:', comparisonData);
      
      // Perform client-side comparison
      const comparisonResult = compareDataWithCurrent(transactions, comparisonData);
      setCompareData(comparisonResult);
      setShowCompareModal(true);
      
      const summary = comparisonResult.summary;
      showMessage(
        setSuccessMessage, 
        `Comparison completed! Found ${summary.matches} matches and ${summary.mismatches} mismatches.`
      );
    } catch (err) {
      console.error('Error comparing file:', err);
      setError('Failed to compare file: ' + err.message);
    } finally {
      setCompareLoading(false);
    }
  }, [transactions, showMessage, parseCSV, compareDataWithCurrent]);

  // Function to import mismatched transactions
  const handleImportMismatches = async () => {
    try {
      setImportLoading(true);
      setError('');
      
      const mismatchesToImport = compareData.mismatches
        .filter(m => m.status !== 'invalid' && m.status !== 'error')
        .map(m => ({
          date: m.imported.date,
          type: 'expense',
          category: m.imported.category || 'Miscellaneous Expenses',
          subCategory: m.imported.subCategory || '',
          description: m.imported.description || `Imported expense ${m.imported.date}`,
          amount: m.imported.amount,
          paymentMode: m.imported.paymentMode || 'Cash',
          remark: m.imported.remark || '',
          tenantId: authService.getTenantId(),
          imported: true
        }));

      if (mismatchesToImport.length === 0) {
        setError('No valid mismatches to import.');
        return;
      }

      let importedCount = 0;
      const importErrors = [];

      for (const record of mismatchesToImport) {
        try {
          await apiFetch('', {
            method: 'POST',
            body: JSON.stringify(record),
          });
          importedCount++;
        } catch (error) {
          importErrors.push(`Failed to import record: ${error.message}`);
        }
      }

      if (importedCount > 0) {
        const successMsg = `Successfully imported ${importedCount} mismatched transactions!`;
        showMessage(setSuccessMessage, successMsg);
        await fetchTransactions();
        handleCloseCompareModal();
      } else {
        throw new Error('No mismatches were imported successfully. ' + importErrors.join('; '));
      }
    } catch (err) {
      console.error('Import mismatches error:', err);
      setError('Failed to import mismatches: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseCompareModal = () => {
    setShowCompareModal(false);
    setCompareData({
      matches: [],
      mismatches: [],
      summary: {
        totalImported: 0,
        matches: 0,
        mismatches: 0,
        validRecords: 0
      }
    });
    setCompareFile(null);
  };

  // Handle Compare Button Click
  const handleCompareButtonClick = () => {
    setShowCompareModal(true);
  };

  // Handle File Upload for Compare
  const handleCompareFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCompareFile(file);
      handleCompare(file);
    }
  };

  // Handle file drop for compare
  const handleCompareFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setCompareFile(file);
      handleCompare(file);
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileName) => {
    if (!fileName) return <File size={48} className="text-gray-400" />;
    
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'csv':
        return <FileSpreadsheet size={48} className="text-green-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText size={48} className="text-green-600" />;
      case 'pdf':
        return <FileText size={48} className="text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image size={48} className="text-purple-500" />;
      default:
        return <File size={48} className="text-gray-400" />;
    }
  };

  // Get file type description
  const getFileTypeDescription = (fileName) => {
    if (!fileName) return 'Unknown file type';
    
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'csv':
        return 'CSV Spreadsheet';
      case 'xlsx':
        return 'Excel Workbook';
      case 'xls':
        return 'Excel Spreadsheet';
      case 'pdf':
        return 'PDF Document';
      case 'jpg':
      case 'jpeg':
        return 'JPEG Image';
      case 'png':
        return 'PNG Image';
      case 'gif':
        return 'GIF Image';
      case 'webp':
        return 'WebP Image';
      default:
        return `${extension.toUpperCase()} File`;
    }
  };

  // Bulk Edit functionality
  const handleBulkEdit = () => {
    if (selectedTransactions.length === 0) {
      setError('Please select at least one transaction to edit.');
      return;
    }
    setShowBulkEditModal(true);
  };

  const handleBulkUpdate = async () => {
    try {
      const updatePromises = selectedTransactions.map(id => {
        const updateData = {};
        if (bulkEditData.category) updateData.category = bulkEditData.category;
        if (bulkEditData.subCategory) updateData.subCategory = bulkEditData.subCategory;
        if (bulkEditData.paymentMode) updateData.paymentMode = bulkEditData.paymentMode;
        if (bulkEditData.remark) updateData.remark = bulkEditData.remark;
        
        return apiFetch(id, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
      });

      await Promise.all(updatePromises);
      
      await fetchTransactions();
      
      setShowBulkEditModal(false);
      setBulkEditData({ category: '', subCategory: '', paymentMode: '', remark: '' });
      setSelectedTransactions([]);
      setIsSelectMode(false);
      showMessage(setSuccessMessage, `${selectedTransactions.length} expense transaction(s) updated successfully!`);
    } catch (err) {
      setError(`Failed to update transactions: ${err.message}`);
    }
  };

  // Date field handlers to open calendar
  const handleDateFieldClick = (ref) => {
    if (ref.current) {
      ref.current.showPicker();
    }
  };

  const handleSelectTransaction = (id) => {
    setSelectedTransactions(prev => 
      prev.includes(id) 
        ? prev.filter(transactionId => transactionId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === displayedTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(displayedTransactions.map(t => t._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Only delete first 10 at a time to prevent timeout
      const transactionsToDelete = selectedTransactions.slice(0, 10);
      await Promise.all(
        transactionsToDelete.map(id => 
          apiFetch(id, { method: 'DELETE' })
        )
      );
      
      const updatedTransactions = transactions.filter(t => !selectedTransactions.includes(t._id));
      setTransactions(updatedTransactions);
      setFilteredTransactions(updatedTransactions);
      
      const itemsToDelete = transactions.filter(t => selectedTransactions.includes(t._id));
      setDeletedHistory(prev => [...itemsToDelete.slice(0, 50), ...prev.slice(0, 50)]);
      
      // Clear cache
      try {
        const cacheKey = `expenditure_cache_${authService.getTenantId()}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}_timestamp`);
      } catch (e) {
        console.warn('Could not clear cache:', e);
      }
      
      showMessage(setSuccessMessage, `Successfully deleted ${selectedTransactions.length} transactions!`);
      setSelectedTransactions([]);
      setIsSelectMode(false);
      
    } catch (err) {
      setError(`Failed to delete transactions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, category: value, subCategory: '' }));
    const filtered = categories.filter(cat => cat.toLowerCase().includes(value.toLowerCase()));
    setFilteredCategories(filtered);
    setShowCategoryDropdown(true);
    setShowSubCategoryDropdown(false);
    setFilteredSubCategories(subCategories[value] || []);
  };

  const handleSubCategoryChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, subCategory: value }));
    const relatedSubs = subCategories[formData.category] || [];
    const filtered = relatedSubs.filter(sub => sub.toLowerCase().includes(value.toLowerCase()));
    setFilteredSubCategories(filtered);
    setShowSubCategoryDropdown(true);
  };

  const selectCategory = (category) => {
    setFormData(prev => ({ ...prev, category, subCategory: '' }));
    setShowCategoryDropdown(false);
    setFilteredSubCategories(subCategories[category] || []);
  };

  const selectSubCategory = (sub) => {
    setFormData(prev => ({ ...prev, subCategory: sub }));
    setShowSubCategoryDropdown(false);
  };

  // FIXED: Payment mode mapping to match backend requirements
  const getBackendPaymentMode = (frontendPaymentMode) => {
    const paymentModeMap = {
      'Cash': 'Cash',
      'Bank Transfer': 'BankTransfer',
      'GPay': 'GPay',
      'Credit Card': 'Card',
      'Debit Card': 'Card',
      'Cheque': 'Other',
      'Other': 'Other'
    };
    
    return paymentModeMap[frontendPaymentMode] || frontendPaymentMode;
  };

  // FIXED: Get frontend display value for payment mode
  const getFrontendPaymentMode = (backendPaymentMode) => {
    const paymentModeMap = {
      'Cash': 'Cash',
      'BankTransfer': 'Bank Transfer',
      'GPay': 'GPay',
      'Card': 'Card',
      'Other': 'Other'
    };
    
    return paymentModeMap[backendPaymentMode] || backendPaymentMode;
  };

  // FIXED: Handle Add Transaction - Proper payment mode formatting for backend
  const handleAddTransaction = async () => {
    if (!formData.date || !formData.amount || !formData.category || !formData.paymentMode) {
      setError('Please fill in Date, Amount, Category, and Payment Mode.');
      return;
    }

    const newTransaction = {
      date: formData.date,
      type: 'expense',
      category: formData.category,
      subCategory: formData.subCategory || '',
      description: formData.description || '',
      amount: parseFloat(formData.amount),
      paymentMode: getBackendPaymentMode(formData.paymentMode)
    };

    console.log('Sending transaction:', newTransaction); // Debug log

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('', {
        method: 'POST',
        body: JSON.stringify(newTransaction),
      });
      
      // Backend returns { success: true, data: transaction, message: '...' }
      const savedTransaction = response.data || response;
      
      setTransactions(prev => [savedTransaction, ...prev]);
      setFilteredTransactions(prev => [savedTransaction, ...prev]);
      setFormData({
        date: getTodayDate(),
        type: 'expense',
        category: '',
        subCategory: '',
        description: '',
        amount: '',
        paymentMode: ''
      });
      
      // Clear cache
      try {
        const cacheKey = `expenditure_cache_${authService.getTenantId()}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}_timestamp`);
      } catch (e) {
        console.warn('Could not clear cache:', e);
      }
      
      showMessage(setSuccessMessage, 'Transaction added successfully!');
    } catch (err) {
      console.error('Add transaction error:', err);
      setError(`Failed to add transaction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    setLoading(true);
    setError('');
    const itemToDelete = transactions.find(t => t._id === id);
    
    try {
      await apiFetch(id, { method: 'DELETE' });
      
      const updatedTransactions = transactions.filter(t => t._id !== id);
      setTransactions(updatedTransactions);
      setFilteredTransactions(updatedTransactions);

      // Clear cache
      try {
        const cacheKey = `expenditure_cache_${authService.getTenantId()}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}_timestamp`);
      } catch (e) {
        console.warn('Could not clear cache:', e);
      }

      if (itemToDelete) {
        setDeletedHistory(prev => [itemToDelete, ...prev.slice(0, 49)]);
        setLastDeleted(itemToDelete);
        setUndoVisible(true);

        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
          setUndoVisible(false);
          setLastDeleted(null);
          undoTimerRef.current = null;
        }, 6000);
      }
      
      showMessage(setSuccessMessage, 'Transaction deleted successfully!');
    } catch (err) {
      setError(`Failed to delete transaction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!lastDeleted) return;

    setLoading(true);
    setError('');
    
    try {
      const { _id, ...rest } = lastDeleted;
      
      const savedTransaction = await apiFetch('', {
        method: 'POST',
        body: JSON.stringify(rest),
      });
      
      setTransactions(prev => [savedTransaction, ...prev]);
      setFilteredTransactions(prev => [savedTransaction, ...prev]);
      setDeletedHistory(prev => prev.filter(d => d._id !== lastDeleted._id));
      setLastDeleted(null);
      setUndoVisible(false);
      
      // Clear cache
      try {
        const cacheKey = `expenditure_cache_${authService.getTenantId()}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}_timestamp`);
      } catch (e) {
        console.warn('Could not clear cache:', e);
      }
      
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      
      showMessage(setSuccessMessage, 'Transaction restored successfully!');
    } catch (err) {
      setError(`Failed to restore transaction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromHistory = useCallback(async (item) => {
    setLoading(true);
    setError('');
    
    try {
      const { _id, ...rest } = item;
      
      const savedTransaction = await apiFetch('', {
        method: 'POST',
        body: JSON.stringify(rest)
      });
      
      setTransactions(prev => [savedTransaction, ...prev]);
      setFilteredTransactions(prev => [savedTransaction, ...prev]);
      setDeletedHistory(prev => prev.filter(d => d._id !== item._id));
      
      // Clear cache
      try {
        const cacheKey = `expenditure_cache_${authService.getTenantId()}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}_timestamp`);
      } catch (e) {
        console.warn('Could not clear cache:', e);
      }
      
      showMessage(setSuccessMessage, 'Transaction restored successfully!');
    } catch (err) {
      setError(`Failed to restore transaction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showMessage, authService]);

  const handlePermanentDeleteAll = () => {
    setDeletedHistory([]);
    showMessage(setSuccessMessage, 'Deleted history cleared!');
  };

  const handleEditTransaction = (transaction) => {
    setEditingId(transaction._id);
    setEditFormData({ 
      ...transaction, 
      date: new Date(transaction.date).toISOString().split('T')[0],
      // Convert backend payment mode to frontend display format for editing
      paymentMode: Object.entries({
        'Cash': 'Cash',
        'BankTransfer': 'Bank Transfer',
        'GPay': 'GPay',
        'Card': 'Card',
        'Other': 'Other'
      }).find(([backend, frontend]) => backend === transaction.paymentMode)?.[1] || transaction.paymentMode
    });
  };

  // FIXED: Handle Save Edit - Proper payment mode formatting for backend
  const handleSaveEdit = async (id) => {
    if (!editFormData.date || !editFormData.amount || !editFormData.category || !editFormData.paymentMode) {
      setError('Please fill in Date, Amount, Category, and Payment Mode.');
      return;
    }
    
    const updatedTransaction = {
      date: editFormData.date,
      type: editFormData.type || 'expense',
      category: editFormData.category,
      subCategory: editFormData.subCategory || '',
      description: editFormData.description || '',
      amount: parseFloat(editFormData.amount),
      paymentMode: getBackendPaymentMode(editFormData.paymentMode)
    };

    console.log('Updating transaction:', updatedTransaction); // Debug log
    
    setLoading(true);
    setError('');
    
    try {
      const savedTransaction = await apiFetch(id, {
        method: 'PUT',
        body: JSON.stringify(updatedTransaction),
      });
      
      const updatedTransactions = transactions.map(t => t._id === id ? savedTransaction : t);
      setTransactions(updatedTransactions);
      setFilteredTransactions(updatedTransactions);
      setEditingId(null);
      setEditFormData({});
      
      // Clear cache
      try {
        const cacheKey = `expenditure_cache_${authService.getTenantId()}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}_timestamp`);
      } catch (e) {
        console.warn('Could not clear cache:', e);
      }
      
      showMessage(setSuccessMessage, 'Transaction updated successfully!');
    } catch (err) {
      console.error('Update transaction error:', err);
      setError(`Failed to update transaction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewCategory = (e) => {
    e.preventDefault();
    if (formData.category && !categories.includes(formData.category)) {
      showMessage(setSuccessMessage, `Category "${formData.category}" would be added in a real implementation`);
    }
  };

  const handleAddNewSubCategory = (e) => {
    e.preventDefault();
    if (formData.subCategory && formData.category) {
      showMessage(setSuccessMessage, `Sub-category "${formData.subCategory}" would be added in a real implementation`);
    }
  };

  const applyDateFilter = () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setError('Start date cannot be after end date.');
      return;
    }
    const filtered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const endPlusOne = new Date(end);
      endPlusOne.setDate(endPlusOne.getDate() + 1);
      return transactionDate >= start && transactionDate <= endPlusOne;
    });
    setFilteredTransactions(filtered);
    setError('');
  };

  const handlePrint = () => {
    const printContent = document.getElementById('transactionTable')?.outerHTML;
    if (!printContent) {
      setError('Nothing to print');
      return;
    }
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const handleDownload = async (format) => {
    const rows = filteredTransactions;
    if (format === 'xlsx') {
      // Lazy load XLSX only when needed
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expense Records');
      XLSX.writeFile(workbook, 'expense_transactions.xlsx');
    } else if (format === 'csv') {
      // Lazy load Papa Parse only when needed
      const Papa = await import('papaparse');
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'expense_transactions.csv';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Format date to dd/mm/yyyy
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  // Chart data for expenses by category
  const getCategoryChartData = () => {
    const catSum = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        if (Number(t.amount) && t.category) {
          acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        }
        return acc;
      }, {});
    
    const chartData = Object.keys(catSum).map(cat => ({ 
      category: cat, 
      amount: parseFloat(catSum[cat].toFixed(2))
    }));
    
    return chartData.sort((a, b) => b.amount - a.amount);
  };

  // Chart data for expense trend (monthly) - UPDATED to match image format
  const getTrendChartData = () => {
    const monthlyData = {};
    
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const date = new Date(t.date);
        // Format as "Oct 2023" to match the image
        const monthYear = `${date.toLocaleString('en', { month: 'short' })} ${date.getFullYear()}`;
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = 0;
        }
        monthlyData[monthYear] += Number(t.amount);
      });
    
    const chartData = Object.keys(monthlyData)
      .map(key => ({
        month: key,
        amount: parseFloat(monthlyData[key].toFixed(2))
      }))
      .sort((a, b) => {
        // Sort by actual date for proper chronological order
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA - dateB;
      });
    
    return chartData;
  };

  // Handle file drop for import and compare
  const handleFileDrop = (e, type) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (type === 'import') {
        setImportFile(file);
      } else {
        setCompareFile(file);
        handleCompare(file);
      }
    }
  };

  // Color palette for charts
  const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#25a874ff'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-3 sm:p-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center mb-5 sm:mb-7">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
            Expenditures Module
          </h1>
          <p className="text-base text-gray-600 max-w-3xl mx-auto">
            Track and manage your expenses with detailed categorization and analytics
          </p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle className="mr-3 flex-shrink-0" size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.successAlert}>
            <Check className="mr-3 flex-shrink-0" size={18} />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}

        {warningMessage && (
          <div className={styles.warningAlert}>
            <AlertCircle className="mr-3 flex-shrink-0" size={18} />
            <span className="text-sm">{warningMessage}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && transactions.length === 0 && (
          <div className="text-center py-10">
            <div className={`${styles.loadingSpinner} mx-auto mb-4`}></div>
            <p className="text-gray-600 text-base">Loading expenditure data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Add New Expense Form */}
            <div className={`${styles.card} p-5 mb-5`}>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <PlusCircle className="mr-3 text-purple-600" size={22} />
                Add New Expense
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      ref={dateInputRef}
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      onClick={() => handleDateFieldClick(dateInputRef)}
                      className={`${styles.inputField} pl-10 cursor-pointer`}
                      required
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2 relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleCategoryChange}
                      onFocus={() => setShowCategoryDropdown(true)}
                      placeholder="Search or add category"
                      className={styles.inputField}
                      required
                    />
                    {showCategoryDropdown && (
                      <div className={styles.dropdownContainer}>
                        {filteredCategories.map((cat) => (
                          <div
                            key={cat}
                            className={styles.dropdownOption}
                            onClick={() => selectCategory(cat)}
                          >
                            {cat}
                          </div>
                        ))}
                        <div
                          className={`${styles.dropdownOption} bg-purple-50 text-purple-700 font-medium hover:bg-purple-100`}
                          onClick={handleAddNewCategory}
                        >
                          <PlusCircle size={16} className="inline mr-2" />
                          Add New Category
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-Category */}
                <div className="space-y-2 relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Sub-Category
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleSubCategoryChange}
                      onFocus={() => formData.category && setShowSubCategoryDropdown(true)}
                      placeholder="Search or add sub-category"
                      className={styles.inputField}
                      disabled={!formData.category}
                    />
                    {showSubCategoryDropdown && formData.category && (
                      <div className={styles.dropdownContainer}>
                        {filteredSubCategories.map((sub) => (
                          <div
                            key={sub}
                            className={styles.dropdownOption}
                            onClick={() => selectSubCategory(sub)}
                          >
                            {sub}
                          </div>
                        ))}
                        <div
                          className={`${styles.dropdownOption} bg-purple-50 text-purple-700 font-medium hover:bg-purple-100`}
                          onClick={handleAddNewSubCategory}
                        >
                          <PlusCircle size={16} className="inline mr-2" />
                          Add New Sub-Category
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Second Row: Amount, Payment Mode, Description */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`${styles.inputField} pl-10`}
                      required
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className={styles.inputField}
                    required
                  >
                    <option value="">Select payment mode</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="GPay">GPay</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Optional description"
                    className={styles.inputField}
                  />
                </div>
              </div>

              {/* Add Expense Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleAddTransaction}
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  <PlusCircle className="mr-2" size={18} />
                  Add Expense
                </button>
              </div>
            </div>

            {/* Stats Cards - UPDATED: Added Period Expense Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
              <div className={styles.statsCard}>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Expenses Amount</p>
                      <p className="text-xl font-bold text-gray-800 mt-2">₹{totalExpenses.toLocaleString('en-IN')}</p>
                      <p className="text-sm text-gray-500 mt-2">{totalExpenseEntries} expense entries</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg">
                      <DollarSign className="text-white" size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.statsCard}>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Number of Records</p>
                      <p className="text-xl font-bold text-gray-800 mt-2">{totalExpenseEntries}</p>
                      <p className="text-sm text-gray-500 mt-2">Filtered records</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
                      <BarChart3 className="text-white" size={22} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.statsCard}>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Highest Category</p>
                      <p className="text-base font-bold text-gray-800 mt-2 truncate">
                        {sortedTopCostData.length > 0 ? sortedTopCostData[0].category : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Based on filtered data</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg">
                      <TrendingUp className="text-white" size={22} />
                    </div>
                  </div>
                </div>
              </div>

              {/* NEW: Period Expense Card */}
              <div className={styles.statsCard}>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Period Expenses</p>
                      <p className="text-xl font-bold text-gray-800 mt-2">₹{periodExpenses.toLocaleString('en-IN')}</p>
                      <div className="mt-2">
                        <select
                          value={periodFilter}
                          onChange={(e) => setPeriodFilter(e.target.value)}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-400 focus:border-purple-400"
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="month">This Month</option>
                          <option value="year">This Year</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg">
                      <Calendar className="text-white" size={22} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* UPDATED: Transaction Actions Section - All buttons in straight horizontal layout */}
            <div className={`${styles.card} p-5 mb-5`}>
              <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
                <BarChart3 className="mr-2 text-purple-600" size={18} />
                Transaction Actions
              </h3>
              
              {/* UPDATED: All buttons in a single straight horizontal line */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Range Section */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Date Range:</span>
                  <div className="flex gap-2">
                    <input
                      ref={startDateInputRef}
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      onClick={() => handleDateFieldClick(startDateInputRef)}
                      className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-400 focus:border-purple-400 text-sm cursor-pointer"
                    />
                    <span className="text-gray-500 flex items-center">to</span>
                    <input
                      ref={endDateInputRef}
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      onClick={() => handleDateFieldClick(endDateInputRef)}
                      className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-400 focus:border-purple-400 text-sm cursor-pointer"
                    />
                  </div>
                </div>

                {/* Action Buttons - All in one straight line */}
                <button
                  onClick={applyDateFilter}
                  className="flex items-center justify-center px-3 py-2 bg-purple-600 text-white font-medium rounded-lg shadow-md hover:bg-purple-700 transition-all duration-200 text-xs whitespace-nowrap"
                >
                  Apply Filter
                </button>

                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setFilteredTransactions(transactions);
                  }}
                  className="flex items-center justify-center px-3 py-2 bg-white text-gray-700 font-medium rounded-lg shadow-md hover:shadow-lg border border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 text-xs whitespace-nowrap"
                >
                  Clear
                </button>

                <button
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    if (isSelectMode) setSelectedTransactions([]);
                  }}
                  className={`${isSelectMode ? 'bg-purple-600 text-white' : styles.btnSecondary} px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center text-xs whitespace-nowrap`}
                >
                  {isSelectMode ? (
                    <>
                      <X className="mr-1" size={14} />
                      Cancel Select
                    </>
                  ) : (
                    <>
                      <CheckSquare className="mr-1" size={14} />
                      Select Multiple
                    </>
                  )}
                </button>

                <button
                  onClick={handleCompareButtonClick}
                  className="flex items-center justify-center px-3 py-2 bg-white text-gray-700 font-medium rounded-lg shadow-md hover:shadow-lg border border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 text-xs whitespace-nowrap"
                >
                  <GitCompare className="mr-1" size={14} />
                  Compare
                </button>

                <button
                  onClick={() => handleDownload(exportFormat)}
                  className="flex items-center justify-center px-3 py-2 bg-white text-gray-700 font-medium rounded-lg shadow-md hover:shadow-lg border border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 text-xs whitespace-nowrap"
                >
                  <Download className="mr-1" size={14} />
                  Export
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center px-3 py-2 bg-white text-gray-700 font-medium rounded-lg shadow-md hover:shadow-lg border border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 text-xs whitespace-nowrap"
                >
                  <Printer className="mr-1" size={14} />
                  Print
                </button>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 text-xs whitespace-nowrap"
                >
                  <Upload className="mr-1" size={14} />
                  Import
                </button>

                <button
                  onClick={() => setShowSync(!showSync)}
                  className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 text-xs whitespace-nowrap"
                >
                  <RefreshCw className="mr-1" size={14} />
                  Sync Account
                </button>

                {/* SHOW CHART BUTTON - NOW IN THE SAME ROW */}
                <button
                  onClick={() => setShowChart(!showChart)}
                  className="flex items-center justify-center px-3 py-2 bg-white text-gray-700 font-medium rounded-lg shadow-md hover:shadow-lg border border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 text-xs whitespace-nowrap"
                >
                  <BarChart3 className="mr-1" size={14} />
                  {showChart ? 'Hide Chart' : 'Show Chart'}
                </button>
              </div>

              {/* Bulk Actions - Visible in Select Mode */}
              {isSelectMode && selectedTransactions.length > 0 && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-purple-700">
                      {selectedTransactions.length} transaction(s) selected
                    </span>
                    <button
                      onClick={handleBulkEdit}
                      className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-colors text-xs"
                    >
                      <Edit className="mr-2" size={12} />
                      Bulk Edit
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center justify-center px-3 py-2 bg-red-600 text-white font-medium rounded-lg shadow-md hover:bg-red-700 transition-colors text-xs"
                    >
                      <Trash2 className="mr-2" size={12} />
                      Bulk Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Sync Panel - Now appears below the action buttons when toggled */}
              {showSync && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Upload Transaction File</h4>
                  
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4 hover:border-green-400 transition-colors duration-200">
                    {selectedFile ? (
                      <div className="text-center">
                        <FileUp className="mx-auto mb-2 text-green-500" size={32} />
                        <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(2)} KB • {selectedFile.type || 'Unknown type'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <FileUp className="mx-auto mb-3 text-gray-400" size={32} />
                        <p className="text-sm text-gray-600 mb-3">
                          Drag and drop your file here or click to browse
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          Supported formats: CSV, Excel, JSON
                        </p>
                      </>
                    )}
                    
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".csv,.xlsx,.xls,.json"
                      className="hidden"
                      id="sync-file-input"
                    />
                    <button
                      onClick={() => document.getElementById('sync-file-input').click()}
                      className="flex items-center justify-center px-4 py-2 bg-white text-gray-700 font-medium rounded-lg shadow-md hover:shadow-lg border border-gray-200 hover:border-green-300 hover:text-green-700 transition-all duration-200 text-sm mx-auto"
                      disabled={processing}
                    >
                      <FileUp className="mr-2" size={14} />
                      {selectedFile ? 'Change File' : 'Choose File'}
                    </button>
                  </div>

                  {/* Process Button */}
                  {selectedFile && syncResult?.type === 'upload_success' && (
                    <div className="text-center">
                      <button
                        onClick={handleProcess}
                        disabled={processing}
                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 text-sm mx-auto"
                      >
                        {processing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2" size={14} />
                            Process Transactions
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Sync Results */}
                  {syncResult && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${
                      syncResult.type === 'error' 
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : syncResult.type === 'upload_success'
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'bg-green-50 border border-green-200 text-green-700'
                    }`}>
                      <div className="flex items-center">
                        {syncResult.type === 'error' && <AlertCircle className="mr-2 flex-shrink-0" size={16} />}
                        {syncResult.type === 'upload_success' && <FileUp className="mr-2 flex-shrink-0" size={16} />}
                        {syncResult.type === 'process_success' && <Check className="mr-2 flex-shrink-0" size={16} />}
                        <span>{syncResult.message}</span>
                      </div>
                      
                      {syncResult.data && syncResult.type === 'process_success' && (
                        <div className="mt-2 text-xs grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <div className="font-semibold">{syncResult.data.total}</div>
                            <div className="text-gray-600">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-green-600">{syncResult.data.saved}</div>
                            <div className="text-gray-600">Imported</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-orange-600">{syncResult.data.duplicates}</div>
                            <div className="text-gray-600">Duplicates</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chart Section */}
            {showChart && (
              <div className={`${styles.card} p-5 mb-5`}>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-base font-semibold text-gray-800 flex items-center">
                    <BarChart3 className="mr-2 text-purple-600" size={18} />
                    Expense Analytics
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setChartType('category')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        chartType === 'category' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      By Category
                    </button>
                    <button
                      onClick={() => setChartType('trend')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        chartType === 'trend' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Expense Trend
                    </button>
                  </div>
                </div>

                <div className="h-72">
                  {chartType === 'category' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getCategoryChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9e4e4ff" />
                        <XAxis 
                          dataKey="category" 
                          angle={-45} 
                          textAnchor="end" 
                          height={70}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `₹${value}`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value) => [`₹${value}`, 'Amount']}
                          labelFormatter={(label) => `Category: ${label}`}
                        />
                        <Bar 
                          dataKey="amount" 
                          fill={styles.chartBarFill}
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getTrendChartData()}>
                        <defs>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f6f3f3ff" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `₹${value}`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value) => [`₹${value}`, 'Amount']}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#8B5CF6"
                          fillOpacity={1}
                          fill="url(#colorExpense)"
                          strokeWidth={2}
                          dot={{ fill: "#8B5CF6", r: 4 }}
                          activeDot={{ r: 6, fill: "#8B5CF6" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* Expense Transactions Table */}
            <div className={`${styles.card} p-5 mb-5 overflow-hidden`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
                <div className="flex items-center">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <DollarSign className="mr-3 text-red-600" size={22} />
                    Expense Transactions
                    <span className="ml-3 bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                      {displayedTransactions.length} records
                    </span>
                  </h3>
                </div>
                
                {/* Search Transaction */}
                <div className="relative flex-1 sm:flex-none sm:min-w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 w-full transition-all duration-200 bg-white shadow-sm text-sm"
                  />
                </div>
              </div>

              {displayedTransactions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <DollarSign className="mx-auto mb-3 text-gray-400" size={36} />
                  <p className="text-base">No expense transactions found.</p>
                  <p className="text-sm mt-2">Add your first expense using the form above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto" id="transactionTable">
                  <table className="w-full min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        {isSelectMode && (
                          <th className="p-3 w-10">
                            <button
                              onClick={handleSelectAll}
                              className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center hover:border-purple-500 transition-colors duration-200"
                            >
                              {selectedTransactions.length > 0 && (
                                <CheckSquare size={14} className="text-purple-600" />
                              )}
                            </button>
                          </th>
                        )}
                        <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap text-sm">Date</th>
                        <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap text-sm">Type</th>
                        <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap text-sm">Category</th>
                        <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap text-sm">Sub-Category</th>
                        <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap text-sm min-w-[140px]">Description</th>
                        <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap text-sm">Amount</th>
                        <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap text-sm">Payment Mode</th>
                        <th className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedTransactions.map((transaction) => (
                        <tr key={transaction._id} className="border-b border-gray-100 hover:bg-gray-50">
                          {isSelectMode && (
                            <td className="p-3">
                              <button
                                onClick={() => handleSelectTransaction(transaction._id)}
                                className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors duration-200 ${
                                  selectedTransactions.includes(transaction._id)
                                    ? 'border-purple-500 bg-purple-500'
                                    : 'border-gray-300 hover:border-purple-500'
                                }`}
                              >
                                {selectedTransactions.includes(transaction._id) && (
                                  <CheckSquare size={14} className="text-white" />
                                )}
                              </button>
                            </td>
                          )}
                          {/* Date Column */}
                          <td className="p-3 text-gray-600 whitespace-nowrap text-sm">
                            {editingId === transaction._id ? (
                              <input
                                type="date"
                                name="date"
                                value={editFormData.date}
                                onChange={handleEditChange}
                                className={styles.inputFieldTable}
                              />
                            ) : (
                              formatDateToDDMMYYYY(transaction.date)
                            )}
                          </td>
                          
                          {/* Type Column - Always shows "Expense" */}
                          <td className="p-3 whitespace-nowrap text-sm">
                            {editingId === transaction._id ? (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                                Expense
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                                Expense
                              </span>
                            )}
                          </td>
                          
                          {/* Category Column */}
                          <td className="p-3 whitespace-nowrap text-sm">
                            {editingId === transaction._id ? (
                              <input
                                type="text"
                                name="category"
                                value={editFormData.category}
                                onChange={handleEditChange}
                                className={styles.inputFieldTable}
                              />
                            ) : (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                                {transaction.category}
                              </span>
                            )}
                          </td>
                          
                          {/* Sub-Category Column */}
                          <td className="p-3 text-gray-600 whitespace-nowrap text-sm">
                            {editingId === transaction._id ? (
                              <input
                                type="text"
                                name="subCategory"
                                value={editFormData.subCategory}
                                onChange={handleEditChange}
                                className={styles.inputFieldTable}
                              />
                            ) : (
                              transaction.subCategory || (
                                <span className="text-gray-400 italic text-sm">-</span>
                              )
                            )}
                          </td>
                          
                          {/* Description Column */}
                          <td className="p-3 text-gray-600 max-w-[140px] break-words text-sm">
                            {editingId === transaction._id ? (
                              <input
                                type="text"
                                name="description"
                                value={editFormData.description}
                                onChange={handleEditChange}
                                className={styles.inputFieldTable}
                              />
                            ) : (
                              transaction.description || (
                                <span className="text-gray-400 italic text-sm">-</span>
                              )
                            )}
                          </td>
                          
                          {/* Amount Column */}
                          <td className="p-3 text-red-600 font-semibold whitespace-nowrap text-sm">
                            {editingId === transaction._id ? (
                              <input
                                type="number"
                                name="amount"
                                value={editFormData.amount}
                                onChange={handleEditChange}
                                className={styles.inputFieldTable}
                                step="0.01"
                                min="0"
                              />
                            ) : (
                              `₹${transaction.amount}`
                            )}
                          </td>
                          
                          {/* Payment Mode Column */}
                          <td className="p-3 whitespace-nowrap text-sm">
                            {editingId === transaction._id ? (
                              <select
                                name="paymentMode"
                                value={editFormData.paymentMode}
                                onChange={handleEditChange}
                                className={styles.inputFieldTable}
                              >
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="GPay">GPay</option>
                                <option value="Card">Card</option>
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                                {getFrontendPaymentMode(transaction.paymentMode)}
                              </span>
                            )}
                          </td>
                          
                          {/* Actions Column */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              {editingId === transaction._id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(transaction._id)}
                                    className="flex items-center justify-center p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                                    title="Save"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="flex items-center justify-center p-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditTransaction(transaction)}
                                    className="flex items-center justify-center p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                    title="Edit"
                                    disabled={isSelectMode}
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(transaction._id)}
                                    className="flex items-center justify-center p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                                    title="Delete"
                                    disabled={isSelectMode}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Delete History Section */}
            <div className={`${styles.card} p-5`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                  <History className="mr-3 text-red-600" size={22} />
                  Deleted Expense History
                  <span className="ml-3 bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full">
                    {deletedHistory.length} records
                  </span>
                </h3>
                <div className="flex gap-3">
                  {deletedHistory.length > 0 && (
                    <button
                      onClick={handlePermanentDeleteAll}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all duration-200 shadow-md text-sm"
                    >
                      <Trash2 className="mr-2" size={14} />
                      Delete All History
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteHistory(!showDeleteHistory)}
                    className={`${showDeleteHistory ? 'bg-red-600 text-white' : styles.btnSecondary} px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center text-sm`}
                  >
                    {showDeleteHistory ? (
                      <>
                        <EyeOff className="mr-2" size={14} />
                        Hide History
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2" size={14} />
                        View History
                      </>
                    )}
                  </button>
                </div>
              </div>

              {showDeleteHistory && (
                <>
                  {deletedHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Ban className="mx-auto mb-3 text-gray-400" size={36} />
                      <p className="text-base">No deleted expense records found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-full">
                        <thead>
                          <tr className="bg-red-50 border-b-2 border-red-200">
                            <th className="text-left p-3 font-semibold text-red-700 whitespace-nowrap text-sm">Date</th>
                            <th className="text-left p-3 font-semibold text-red-700 whitespace-nowrap text-sm">Category</th>
                            <th className="text-left p-3 font-semibold text-red-700 whitespace-nowrap text-sm">Description</th>
                            <th className="text-left p-3 font-semibold text-red-700 whitespace-nowrap text-sm">Amount</th>
                            <th className="text-left p-3 font-semibold text-red-700 whitespace-nowrap text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletedHistory.slice(0, 10).map((transaction) => (
                            <tr key={transaction._id} className="border-b border-red-100 hover:bg-red-50">
                              <td className="p-3 text-gray-600 whitespace-nowrap text-sm">{formatDateToDDMMYYYY(transaction.date)}</td>
                              <td className="p-3 text-gray-600 whitespace-nowrap text-sm">{transaction.category}</td>
                              <td className="p-3 text-gray-600 max-w-[140px] break-words text-sm">{transaction.description || '-'}</td>
                              <td className="p-3 text-red-600 font-semibold whitespace-nowrap text-sm">₹{transaction.amount}</td>
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRestoreFromHistory(transaction)}
                                    className="flex items-center justify-center p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                                    title="Restore"
                                  >
                                    <Undo2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletedHistory(prev => prev.filter(t => t._id !== transaction._id));
                                      showMessage(setSuccessMessage, 'Transaction permanently deleted!');
                                    }}
                                    className="flex items-center justify-center p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                                    title="Permanently Delete"
                                  >
                                    <Ban size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <Upload className="mr-3 text-blue-600" size={24} />
                  Import Expense Data
                </h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-gray-600 mb-5 text-base">
                Upload a CSV or Excel file containing your expense data. The file should have columns for Date, Amount, Category, and optionally Description, Payment Mode, and Sub-Category.
              </p>
              
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center mb-5 hover:border-purple-400 transition-colors duration-200"
                onDrop={(e) => handleFileDrop(e, 'import')}
                onDragOver={(e) => e.preventDefault()}
              >
                {importFile ? (
                  <div className="text-center">
                    {getFileIcon(importFile.name)}
                    <p className="text-gray-600 mb-2 text-base font-medium">{importFile.name}</p>
                    <p className="text-gray-500 text-sm">{getFileTypeDescription(importFile.name)}</p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="mx-auto mb-3 text-gray-400" size={40} />
                    <p className="text-gray-600 mb-3 text-base">
                      Drag and drop your CSV or Excel file here or click to browse
                    </p>
                  </>
                )}
                <input
                  type="file"
                  ref={importFileInputRef}
                  onChange={(e) => setImportFile(e.target.files[0])}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => importFileInputRef.current?.click()}
                  className={styles.btnSecondary}
                >
                  Choose File
                </button>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  onClick={() => importFile && handleImport(importFile)}
                  disabled={!importFile || importLoading}
                  className={styles.btnPrimary}
                >
                  {importLoading ? 'Importing...' : 'Import Data'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare Modal */}
        {showCompareModal && (
          <div className={styles.modal}>
            <div className={`${styles.modalContent} max-w-4xl`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <GitCompare className="mr-3 text-green-600" size={24} />
                  Compare Transactions
                </h3>
                <button
                  onClick={handleCloseCompareModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {compareLoading ? (
                <div className="text-center py-10">
                  <div className={`${styles.loadingSpinner} mx-auto mb-4`}></div>
                  <p className="text-gray-600 text-base">Comparing transactions...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* File Upload Section */}
                  {compareData.matches.length === 0 && compareData.mismatches.length === 0 && (
                    <div className="text-center py-8">
                      <div className="mb-5">
                        <FileSpreadsheet className="mx-auto mb-4 text-gray-400" size={56} />
                        <h4 className="text-xl font-semibold text-gray-800 mb-3">Upload File to Compare</h4>
                        <p className="text-gray-600 text-base mb-5">
                          Upload any file (CSV, Excel, PDF, Images) to compare with your existing expense transactions
                        </p>
                      </div>
                      
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-5 hover:border-green-400 transition-colors duration-200 cursor-pointer"
                        onClick={() => compareFileInputRef.current?.click()}
                        onDrop={handleCompareFileDrop}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {compareFile ? (
                          <div className="text-center">
                            {getFileIcon(compareFile.name)}
                            <p className="text-gray-600 mb-2 text-base font-medium">{compareFile.name}</p>
                            <p className="text-gray-500 text-sm">{getFileTypeDescription(compareFile.name)}</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="mx-auto mb-4 text-gray-400" size={40} />
                            <p className="text-gray-600 mb-3 text-base">
                              Click to choose a file or drag and drop here
                            </p>
                            <p className="text-gray-500 text-sm">
                              Supported formats: CSV, Excel, PDF, Images
                            </p>
                          </>
                        )}
                      </div>
                      
                      <input
                        type="file"
                        ref={compareFileInputRef}
                        onChange={handleCompareFileUpload}
                        accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp"
                        className="hidden"
                      />
                      
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => compareFileInputRef.current?.click()}
                          className={styles.btnPrimary}
                        >
                          <Upload className="mr-3" size={18} />
                          Choose File
                        </button>
                        {compareFile && (
                          <button
                            onClick={() => {
                              setCompareFile(null);
                              setCompareData({
                                matches: [],
                                mismatches: [],
                                summary: {
                                  totalImported: 0,
                                  matches: 0,
                                  mismatches: 0,
                                  validRecords: 0
                                }
                              });
                            }}
                            className={styles.btnSecondary}
                          >
                            <X className="mr-3" size={18} />
                            Clear File
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Results Section */}
                  {(compareData.matches.length > 0 || compareData.mismatches.length > 0) && (
                    <>
                      {/* Summary Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-700">Uploaded Transactions</p>
                          <p className="text-xl font-bold text-blue-800">{compareData.summary?.totalImported || 0}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm font-medium text-green-700">Matches</p>
                          <p className="text-xl font-bold text-green-800">{compareData.summary?.matches || 0}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <p className="text-sm font-medium text-orange-700">Mismatches</p>
                          <p className="text-xl font-bold text-orange-800">{compareData.summary?.mismatches || 0}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-sm font-medium text-purple-700">Valid Records</p>
                          <p className="text-xl font-bold text-purple-800">{compareData.summary?.validRecords || 0}</p>
                        </div>
                      </div>

                      {/* Matches Section */}
                      {compareData.matches.length > 0 && (
                        <div>
                          <h4 className="text-base font-semibold text-green-700 flex items-center mb-4">
                            <Check className="mr-2" size={18} />
                            Matches ({compareData.matches.length})
                            <span className="ml-3 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                              These transactions match your existing records
                            </span>
                          </h4>
                          <div className="max-h-56 overflow-y-auto border border-green-200 rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-green-50 sticky top-0">
                                <tr>
                                  <th className="p-3 text-left font-semibold">Date</th>
                                  <th className="p-3 text-left font-semibold">Category</th>
                                  <th className="p-3 text-left font-semibold">Description</th>
                                  <th className="p-3 text-left font-semibold">Amount</th>
                                  <th className="p-3 text-left font-semibold">Payment Mode</th>
                                  <th className="p-3 text-left font-semibold">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {compareData.matches.slice(0, 10).map((match, index) => (
                                  <tr key={index} className="border-b border-green-100 hover:bg-green-50">
                                    <td className="p-3 whitespace-nowrap">
                                      {match.imported.date && match.imported.date !== 'N/A' 
                                        ? formatDateToDDMMYYYY(match.imported.date) 
                                        : 'N/A'}
                                    </td>
                                    <td className="p-3">
                                      {match.imported.category && match.imported.category !== 'N/A' ? (
                                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                          {match.imported.category}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 italic">N/A</span>
                                      )}
                                    </td>
                                    <td className="p-3 max-w-[140px] break-words">
                                      {match.imported.description && match.imported.description !== 'No description' ? (
                                        match.imported.description
                                      ) : (
                                        <span className="text-gray-400 italic">No description</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-green-600 font-semibold whitespace-nowrap">
                                      ₹{match.imported.amount > 0 ? match.imported.amount.toFixed(2) : '0.00'}
                                    </td>
                                    <td className="p-3">
                                      {match.imported.paymentMode && match.imported.paymentMode !== 'N/A' ? (
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                          {match.imported.paymentMode}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 italic">N/A</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                        ✓ Match
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {compareData.matches.length > 10 && (
                            <p className="text-sm text-gray-500 mt-3 text-center">
                              Showing 10 of {compareData.matches.length} matches. Scroll to see more.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Mismatches Section */}
                      {compareData.mismatches.length > 0 && (
                        <div>
                          <h4 className="text-base font-semibold text-orange-700 flex items-center mb-4">
                            <AlertCircle className="mr-2" size={18} />
                            Mismatches ({compareData.mismatches.length})
                            <span className="ml-3 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                              These transactions don't match your existing records
                            </span>
                          </h4>
                          <div className="max-h-72 overflow-y-auto border border-orange-200 rounded-lg">
                            <table className="w-full text-sm">
                              <thead className="bg-orange-50 sticky top-0">
                                <tr>
                                  <th className="p-3 text-left font-semibold">Date</th>
                                  <th className="p-3 text-left font-semibold">Category</th>
                                  <th className="p-3 text-left font-semibold">Description</th>
                                  <th className="p-3 text-left font-semibold">Amount</th>
                                  <th className="p-3 text-left font-semibold">Payment Mode</th>
                                  <th className="p-3 text-left font-semibold">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {compareData.mismatches.map((mismatch, index) => (
                                  <tr key={index} className="border-b border-orange-100 hover:bg-orange-50">
                                    <td className="p-3 whitespace-nowrap">
                                      {mismatch.imported.date && mismatch.imported.date !== 'N/A' 
                                        ? formatDateToDDMMYYYY(mismatch.imported.date) 
                                        : 'N/A'}
                                    </td>
                                    <td className="p-3">
                                      {mismatch.imported.category && mismatch.imported.category !== 'N/A' ? (
                                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                          {mismatch.imported.category}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 italic">N/A</span>
                                      )}
                                    </td>
                                    <td className="p-3 max-w-[140px] break-words">
                                      {mismatch.imported.description && mismatch.imported.description !== 'No description' ? (
                                        mismatch.imported.description
                                      ) : (
                                        <span className="text-gray-400 italic">No description</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-red-600 font-semibold whitespace-nowrap">
                                      ₹{mismatch.imported.amount > 0 ? mismatch.imported.amount.toFixed(2) : '0.00'}
                                    </td>
                                    <td className="p-3">
                                      {mismatch.imported.paymentMode && mismatch.imported.paymentMode !== 'N/A' ? (
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                          {mismatch.imported.paymentMode}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 italic">N/A</span>
                                      )}
                                    </td>
                                    <td className="p-3">
                                      <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                                        ✗ Mismatch
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {compareData.mismatches.length > 10 && (
                            <p className="text-sm text-gray-500 mt-3 text-center">
                              Showing {Math.min(10, compareData.mismatches.length)} of {compareData.mismatches.length} mismatches. Scroll to see more.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bulk Edit Modal */}
        {showBulkEditModal && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <Edit className="mr-3 text-blue-600" size={24} />
                  Bulk Edit Transactions
                </h3>
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-gray-600 mb-5 text-base">
                Update {selectedTransactions.length} selected transactions. Leave fields blank to keep existing values.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={bulkEditData.category}
                    onChange={(e) => setBulkEditData({...bulkEditData, category: e.target.value})}
                    className={styles.inputField}
                  >
                    <option value="">Keep existing</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-Category
                  </label>
                  <input
                    type="text"
                    value={bulkEditData.subCategory}
                    onChange={(e) => setBulkEditData({...bulkEditData, subCategory: e.target.value})}
                    placeholder="Keep existing"
                    className={styles.inputField}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode
                  </label>
                  <select
                    value={bulkEditData.paymentMode}
                    onChange={(e) => setBulkEditData({...bulkEditData, paymentMode: e.target.value})}
                    className={styles.inputField}
                  >
                    <option value="">Keep existing</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="GPay">GPay</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={bulkEditData.remark}
                    onChange={(e) => setBulkEditData({...bulkEditData, remark: e.target.value})}
                    placeholder="Keep existing"
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpdate}
                  className={styles.btnPrimary}
                >
                  Update {selectedTransactions.length} Transaction(s)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Undo Notification */}
        {undoVisible && lastDeleted && (
          <div className="fixed right-5 bottom-5 bg-white border rounded-lg shadow-lg p-4 flex items-center space-x-4 z-50 max-w-sm">
            <div>
              <div className="font-medium text-base">Transaction deleted</div>
              <div className="text-sm text-gray-500">You can undo this action</div>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleUndo} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">Undo</button>
              <button onClick={() => { setUndoVisible(false); setLastDeleted(null); if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; } }} className="text-sm px-3 py-1.5 border rounded">Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenditure;
