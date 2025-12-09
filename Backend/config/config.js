// src/config.js - Frontend Configuration
const config = {
  // API Configuration
  API_BASE_URL: import.meta.env?.VITE_API_BASE_URL || 'https://finovo.techvaseeegrah.com/',
  
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: import.meta.env?.VITE_GOOGLE_CLIENT_ID || '386311219155-m72oabun0pi4nn5ujjprou070jev6na4.apps.googleusercontent.com',
  
  // Frontend Configuration
  FRONTEND_URL: import.meta.env?.VITE_FRONTEND_URL || 'https://finovo.techvaseeegrah.com',
  
  // API Endpoints
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    GOOGLE_OAUTH: '/api/auth/google',
    QUICK_LOGIN: '/api/auth/quick-login',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    SEND_OTP: '/api/auth/send-otp',
    VERIFY_OTP: '/api/auth/verify-otp',
    
    // Application Endpoints
    INCOME: '/api/income',
    BILLS: '/api/bills',
    MONEY: '/api/money',
    TRANSACTIONS: '/api/transactions',
    SETTINGS: '/api/settings',
    
    // Notification Endpoints
    NOTIFICATIONS_CHECK: '/api/notifications/check',
    NOTIFICATIONS_UPCOMING: '/api/notifications/upcoming',
    MONEY_NOTIFICATIONS: '/api/money/notifications/check',
    
    // System Endpoints
    HEALTH_CHECK: '/api/health'
  },
  
  // App Settings
  APP_VERSION: import.meta.env?.VITE_APP_VERSION || '2.3.0',
  DEFAULT_CURRENCY: import.meta.env?.VITE_DEFAULT_CURRENCY || 'INR',
  ENABLE_GOOGLE_OAUTH: import.meta.env?.VITE_ENABLE_GOOGLE_OAUTH === 'true',
  ENABLE_DEMO_ACCOUNT: import.meta.env?.VITE_ENABLE_DEMO_ACCOUNT === 'true'
};

export default config;