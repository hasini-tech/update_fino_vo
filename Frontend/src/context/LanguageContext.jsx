// src/context/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// Language translations
const translations = {
  en: {
    // Common
    welcome: "Welcome",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    refresh: "Refresh",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    submit: "Submit",
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Information",
    
    // Auth
    login: "Login",
    logout: "Logout",
    register: "Register",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password?",
    signIn: "Sign In",
    signUp: "Sign Up",
    createAccount: "Create Account",
    
    // Navigation
    dashboard: "Dashboard",
    income: "Income",
    expenditure: "Expenditure",
    profitLoss: "Profit & Loss",
    projects: "Projects",
    monthlyBills: "Monthly Bills",
    investment: "Investment",
    smartBorrow: "Smart Borrow",
    tax: "Tax",
    settings: "Settings",
    
    // Income Page
    incomeTitle: "Income Management",
    addIncome: "Add Income",
    incomeHistory: "Income History",
    incomeSource: "Income Source",
    amount: "Amount",
    date: "Date",
    category: "Category",
    description: "Description",
    frequency: "Frequency",
    monthly: "Monthly",
    weekly: "Weekly",
    yearly: "Yearly",
    oneTime: "One Time",
    
    // Categories
    salary: "Salary",
    freelance: "Freelance",
    business: "Business",
    investment: "Investment",
    rental: "Rental",
    dividend: "Dividend",
    interest: "Interest",
    other: "Other",
    
    // Expenditure Page
    expenseTitle: "Expense Management",
    addExpense: "Add Expense",
    expenseHistory: "Expense History",
    expenseCategory: "Expense Category",
    transactionType: "Transaction Type",
    income: "Income",
    expense: "Expense",
    
    // Expense Categories
    food: "Food & Dining",
    transportation: "Transportation",
    utilities: "Utilities",
    entertainment: "Entertainment",
    shopping: "Shopping",
    healthcare: "Healthcare",
    education: "Education",
    travel: "Travel",
    groceries: "Groceries",
    rent: "Rent",
    mortgage: "Mortgage",
    insurance: "Insurance",
    savings: "Savings",
    investment: "Investment",
    
    // Profit & Loss
    profitLossTitle: "Profit & Loss Analysis",
    revenue: "Revenue",
    cogs: "Cost of Goods Sold",
    grossProfit: "Gross Profit",
    operatingExpenses: "Operating Expenses",
    netProfit: "Net Profit",
    profitMargin: "Profit Margin",
    financialHealth: "Financial Health",
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
    critical: "Critical",
    
    // Dashboard
    totalIncome: "Total Income",
    totalExpenses: "Total Expenses",
    netBalance: "Net Balance",
    monthlySummary: "Monthly Summary",
    recentTransactions: "Recent Transactions",
    financialOverview: "Financial Overview",
    
    // Projects
    projectTitle: "Project Management",
    addProject: "Add Project",
    projectName: "Project Name",
    client: "Client",
    status: "Status",
    budget: "Budget",
    deadline: "Deadline",
    progress: "Progress",
    
    // Settings
    profile: "Profile",
    preferences: "Preferences",
    language: "Language",
    currency: "Currency",
    notifications: "Notifications",
    security: "Security",
    
    // Months
    january: "January",
    february: "February",
    march: "March",
    april: "April",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October",
    november: "November",
    december: "December",
    
    // Days
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    
    // Time
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    thisMonth: "This Month",
    thisYear: "This Year",
    lastMonth: "Last Month",
    lastYear: "Last Year",
    
    // Messages
    noData: "No data available",
    loadingData: "Loading data...",
    saveSuccess: "Saved successfully",
    deleteSuccess: "Deleted successfully",
    updateSuccess: "Updated successfully",
    confirmDelete: "Are you sure you want to delete this item?",
    somethingWentWrong: "Something went wrong",
    tryAgain: "Please try again",
    requiredField: "This field is required",
    invalidEmail: "Invalid email address",
    invalidAmount: "Invalid amount",
    
    // Financial Terms
    balance: "Balance",
    transaction: "Transaction",
    budget: "Budget",
    savings: "Savings",
    debt: "Debt",
    credit: "Credit",
    debit: "Debit",
    cashflow: "Cash Flow",
    assets: "Assets",
    liabilities: "Liabilities",
    equity: "Equity",
    
    // Actions
    view: "View",
    create: "Create",
    update: "Update",
    remove: "Remove",
    download: "Download",
    upload: "Upload",
    export: "Export",
    import: "Import",
    print: "Print",
    share: "Share"
  },
  hi: {
    // Common
    welcome: "स्वागत है",
    loading: "लोड हो रहा है...",
    save: "सेव करें",
    cancel: "कैंसल करें",
    delete: "डिलीट करें",
    edit: "एडिट करें",
    add: "जोड़ें",
    search: "खोजें",
    filter: "फिल्टर करें",
    refresh: "रिफ्रेश करें",
    confirm: "कन्फर्म करें",
    back: "वापस जाएं",
    next: "अगला",
    submit: "सबमिट करें",
    success: "सफल",
    error: "त्रुटि",
    warning: "चेतावनी",
    info: "जानकारी",
    
    // Auth
    login: "लॉगिन",
    logout: "लॉगआउट",
    register: "रजिस्टर करें",
    email: "ईमेल",
    password: "पासवर्ड",
    confirmPassword: "पासवर्ड कन्फर्म करें",
    forgotPassword: "पासवर्ड भूल गए?",
    signIn: "साइन इन",
    signUp: "साइन अप",
    createAccount: "अकाउंट बनाएं",
    
    // Navigation
    dashboard: "डैशबोर्ड",
    income: "आय",
    expenditure: "व्यय",
    profitLoss: "लाभ और हानि",
    projects: "प्रोजेक्ट्स",
    monthlyBills: "मासिक बिल",
    investment: "निवेश",
    smartBorrow: "स्मार्ट उधार",
    tax: "टैक्स",
    settings: "सेटिंग्स",
    
    // Income Page
    incomeTitle: "आय प्रबंधन",
    addIncome: "आय जोड़ें",
    incomeHistory: "आय इतिहास",
    incomeSource: "आय स्रोत",
    amount: "राशि",
    date: "तारीख",
    category: "श्रेणी",
    description: "विवरण",
    frequency: "आवृत्ति",
    monthly: "मासिक",
    weekly: "साप्ताहिक",
    yearly: "वार्षिक",
    oneTime: "एक बार",
    
    // Categories
    salary: "वेतन",
    freelance: "फ्रीलांस",
    business: "व्यवसाय",
    investment: "निवेश",
    rental: "किराया",
    dividend: "लाभांश",
    interest: "ब्याज",
    other: "अन्य",
    
    // Expenditure Page
    expenseTitle: "व्यय प्रबंधन",
    addExpense: "व्यय जोड़ें",
    expenseHistory: "व्यय इतिहास",
    expenseCategory: "व्यय श्रेणी",
    transactionType: "लेनदेन प्रकार",
    income: "आय",
    expense: "व्यय",
    
    // Expense Categories
    food: "भोजन और डाइनिंग",
    transportation: "परिवहन",
    utilities: "उपयोगिताएं",
    entertainment: "मनोरंजन",
    shopping: "शॉपिंग",
    healthcare: "स्वास्थ्य देखभाल",
    education: "शिक्षा",
    travel: "यात्रा",
    groceries: "किराने का सामान",
    rent: "किराया",
    mortgage: "मॉर्गेज",
    insurance: "बीमा",
    savings: "बचत",
    investment: "निवेश",
    
    // Profit & Loss
    profitLossTitle: "लाभ और हानि विश्लेषण",
    revenue: "रेवेन्यू",
    cogs: "माल की लागत",
    grossProfit: "सकल लाभ",
    operatingExpenses: "परिचालन व्यय",
    netProfit: "शुद्ध लाभ",
    profitMargin: "लाभ मार्जिन",
    financialHealth: "वित्तीय स्वास्थ्य",
    excellent: "उत्कृष्ट",
    good: "अच्छा",
    fair: "सामान्य",
    poor: "खराब",
    critical: "गंभीर",
    
    // Dashboard
    totalIncome: "कुल आय",
    totalExpenses: "कुल व्यय",
    netBalance: "शुद्ध शेष",
    monthlySummary: "मासिक सारांश",
    recentTransactions: "हाल के लेनदेन",
    financialOverview: "वित्तीय अवलोकन",
    
    // Projects
    projectTitle: "प्रोजेक्ट प्रबंधन",
    addProject: "प्रोजेक्ट जोड़ें",
    projectName: "प्रोजेक्ट नाम",
    client: "क्लाइंट",
    status: "स्थिति",
    budget: "बजट",
    deadline: "अंतिम तिथि",
    progress: "प्रगति",
    
    // Settings
    profile: "प्रोफाइल",
    preferences: "प्राथमिकताएं",
    language: "भाषा",
    currency: "मुद्रा",
    notifications: "नोटिफिकेशन",
    security: "सुरक्षा",
    
    // Months
    january: "जनवरी",
    february: "फरवरी",
    march: "मार्च",
    april: "अप्रैल",
    may: "मई",
    june: "जून",
    july: "जुलाई",
    august: "अगस्त",
    september: "सितंबर",
    october: "अक्टूबर",
    november: "नवंबर",
    december: "दिसंबर",
    
    // Days
    monday: "सोमवार",
    tuesday: "मंगलवार",
    wednesday: "बुधवार",
    thursday: "गुरुवार",
    friday: "शुक्रवार",
    saturday: "शनिवार",
    sunday: "रविवार",
    
    // Time
    today: "आज",
    yesterday: "कल",
    thisWeek: "इस सप्ताह",
    thisMonth: "इस महीने",
    thisYear: "इस साल",
    lastMonth: "पिछला महीना",
    lastYear: "पिछला साल",
    
    // Messages
    noData: "कोई डेटा उपलब्ध नहीं",
    loadingData: "डेटा लोड हो रहा है...",
    saveSuccess: "सफलतापूर्वक सेव किया गया",
    deleteSuccess: "सफलतापूर्वक डिलीट किया गया",
    updateSuccess: "सफलतापूर्वक अपडेट किया गया",
    confirmDelete: "क्या आप वाकई इस आइटम को डिलीट करना चाहते हैं?",
    somethingWentWrong: "कुछ गलत हो गया",
    tryAgain: "कृपया पुनः प्रयास करें",
    requiredField: "यह फ़ील्ड आवश्यक है",
    invalidEmail: "अमान्य ईमेल पता",
    invalidAmount: "अमान्य राशि",
    
    // Financial Terms
    balance: "बैलेंस",
    transaction: "लेनदेन",
    budget: "बजट",
    savings: "बचत",
    debt: "कर्ज",
    credit: "क्रेडिट",
    debit: "डेबिट",
    cashflow: "कैश फ्लो",
    assets: "संपत्ति",
    liabilities: "देयताएं",
    equity: "इक्विटी",
    
    // Actions
    view: "देखें",
    create: "बनाएं",
    update: "अपडेट करें",
    remove: "हटाएं",
    download: "डाउनलोड करें",
    upload: "अपलोड करें",
    export: "एक्सपोर्ट करें",
    import: "इम्पोर्ट करें",
    print: "प्रिंट करें",
    share: "शेयर करें"
  }
};

// Create context
const LanguageContext = createContext();

// Language provider component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState({});

  // Initialize language from localStorage or default to 'en'
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';
    setLanguage(savedLanguage);
  }, []);

  // Get translation function
  const t = (key, params = {}) => {
    const translation = translations[language]?.[key] || translations['en'][key] || key;
    
    // Replace parameters in translation string
    return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
      return params[param] || match;
    });
  };

  // Change language
  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
  };

  // Available languages
  const availableLanguages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
  ];

  const value = {
    language,
    t,
    changeLanguage,
    availableLanguages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;