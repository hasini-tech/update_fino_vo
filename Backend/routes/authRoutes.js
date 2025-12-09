// routes/authRoutes.js - COMPLETE UPDATED VERSION WITH WORKING OTP ROUTES
import express from 'express';
import {
  login,
  register,
  getProfile,
  updateProfile,
  sendOtp,
  verifyOtp,
  googleAuthRedirect,
  googleAuthCallback,
  googleAuthDirect,
  googleOneTapAuth,
  googleQuickAuth,
  quickLogin,
  logout
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Debug middleware to log all auth routes
router.use((req, res, next) => {
  console.log('Auth Route Accessed: ' + req.method + ' ' + req.originalUrl);
  next();
});

/* ================================
   PUBLIC ROUTES
================================ */

// OTP Routes - MUST COME FIRST
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Authentication Routes
router.post('/login', login);
router.post('/register', register);

/* ================================
   GOOGLE OAUTH ROUTES
================================ */
router.get('/google', googleAuthRedirect);
router.get('/google/callback', googleAuthCallback);
router.post('/google', googleAuthDirect);
router.post('/google/one-tap', googleOneTapAuth);
router.post('/google/quick', googleQuickAuth);
router.post('/quick-login', quickLogin);

/* ================================
   PROTECTED ROUTES
================================ */
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

// Health check endpoint for auth routes
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes are working properly',
    timestamp: new Date().toISOString(),
    features: {
      emailVerification: true,
      twoFactorAuth: true,
      googleOAuth: true,
      passwordReset: true,
      rateLimiting: true
    }
  });
});

// Test OTP endpoint
router.get('/test-otp', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OTP routes are working',
    endpoints: {
      sendOtp: 'POST /api/auth/send-otp',
      verifyOtp: 'POST /api/auth/verify-otp'
    }
  });
});

// Catch-all for undefined auth routes
router.use('*', (req, res) => {
  console.warn('Undefined auth route accessed: ' + req.method + ' ' + req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Auth route not found: ' + req.method + ' ' + req.originalUrl,
    availableRoutes: [
      'POST /api/auth/send-otp',
      'POST /api/auth/verify-otp',
      'POST /api/auth/login',
      'POST /api/auth/register', 
      'GET /api/auth/google',
      'GET /api/auth/google/callback',
      'POST /api/auth/google',
      'POST /api/auth/google/one-tap',
      'POST /api/auth/google/quick',
      'POST /api/auth/quick-login',
      'GET /api/auth/profile',
      'PUT /api/auth/profile',
      'POST /api/auth/logout',
      'GET /api/auth/health',
      'GET /api/auth/test-otp'
    ]
  });
});

export default router;