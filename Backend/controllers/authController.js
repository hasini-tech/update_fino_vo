// controllers/authController.js - COMPLETE UPDATED VERSION WITH WORKING OTP VERIFICATION
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendOtpEmail, sendWelcomeEmail } from '../services/emailService.js';
import crypto from 'crypto';

// Helper function to generate JWT with tenant ID
const generateToken = (id, tenantId = null) => {
  const payload = { userId: id };
  if (tenantId) {
    payload.tenantId = tenantId;
  }
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// Helper function to generate OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Format name from email
const formatNameFromEmail = (email) => {
  const namePart = email.split('@')[0];
  return namePart
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

// @desc    Send OTP to email for verification
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res) => {
  const { email } = req.body;
  try {

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email. Please login instead.' 
      });
    }

    // Check if user can request OTP (rate limiting)
    const recentOtp = await Otp.findOne({ 
      email, 
      createdAt: { $gte: new Date(Date.now() - 1 * 60 * 1000) } // 1 minute ago
    });

    if (recentOtp) {
      return res.status(429).json({ 
        success: false, 
        message: 'Please wait before requesting another OTP' 
      });
    }

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete previous OTPs for this email
    await Otp.deleteMany({ email });
    
    // Create new OTP
    await Otp.create({ 
      email, 
      otp: otpCode, 
      expiresAt,
      used: false
    });

    console.log('Generated OTP for ' + email + ': ' + otpCode);

    // Always try to send email to the user's actual email address
    try {
      await sendOtpEmail(email, otpCode);
      console.log('OTP email sent successfully to ' + email);
      
      res.status(200).json({
        success: true,
        message: 'OTP sent to your email',
        data: { email }
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
      console.log('[FALLBACK] OTP for ' + email + ': ' + otpCode);
      
      // In development, return OTP in response as fallback
      // In production, show error message
      if (process.env.NODE_ENV === 'development') {
        res.status(200).json({
          success: true,
          message: 'OTP (email failed): ' + otpCode,
          data: { email, otp: otpCode },
          warning: 'Email service unavailable - OTP shown for development'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send OTP email. Please try again later.',
          error: 'Email service temporarily unavailable'
        });
      }
    }

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    console.log('Verifying OTP for email:', email);

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    const otpRecord = await Otp.findOne({ 
      email, 
      expiresAt: { $gt: new Date() },
      used: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found, expired, or already used' 
      });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    console.log('OTP verified for ' + email);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        email,
        verified: true
      }
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Register a new user (with email verification)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { name, email, password, companyName, userType = 'individual', authMethod = 'email' } = req.body;

  try {
    console.log('Registration attempt for:', email, 'Method:', authMethod);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // For email registration, verify that OTP was used
    if (authMethod === 'email') {
      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check if there's a used OTP for this email (verification was completed)
      const usedOtp = await Otp.findOne({ 
        email, 
        used: true,
        createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Within 30 minutes
      });

      if (!usedOtp) {
        return res.status(400).json({
          success: false,
          message: 'Email verification required. Please verify your email first.'
        });
      }
    }

    const user = await User.create({
      name,
      email,
      password: authMethod === 'email' ? password : crypto.randomBytes(16).toString('hex'),
      companyName: companyName || undefined,
      userType,
      authMethod,
      emailVerified: authMethod !== 'email' // Auto-verify for non-email methods
    });

    console.log('User created:', user.email, 'Auth method:', user.authMethod);

    // Refresh user to ensure tenantId is populated from post-save hook
    const userWithTenantId = await User.findById(user._id);
    const token = generateToken(user._id, userWithTenantId.tenantId);

    // Send welcome email for email verification users
    if (authMethod === 'email') {
      try {
        await sendWelcomeEmail(email, name);
        console.log('Welcome email sent to ' + email);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail registration if welcome email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tenantId: userWithTenantId.tenantId,
        userType: user.userType,
        authMethod: user.authMethod,
        emailVerified: user.emailVerified,
        token
      }
    });

  } catch (error) {
    console.error('Error during registration:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already in use' 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    if (user.authMethod !== 'email') {
      return res.status(400).json({
        success: false,
        message: 'Please use ' + user.authMethod + ' authentication for this account'
      });
    }

    const isPasswordMatch = await user.matchPassword(password);
    console.log('Password match result:', isPasswordMatch);

    if (!isPasswordMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const token = generateToken(user._id, user.tenantId);
    await user.updateLastLogin();

    console.log('Login successful for:', email, 'Tenant ID:', user.tenantId);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        userType: user.userType,
        authMethod: user.authMethod,
        emailVerified: user.emailVerified,
        token
      }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        userType: user.userType,
        authMethod: user.authMethod,
        photoUrl: user.photoUrl,
        companyName: user.companyName,
        emailVerified: user.emailVerified,
        isDemoAccount: user.isDemoAccount,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching profile' 
    });
  }
};

// @desc    Google One-Tap Authentication
// @route   POST /api/auth/google/one-tap
// @access  Public
const googleOneTapAuth = async (req, res) => {
  const { credential } = req.body;

  try {
    console.log('Google One-Tap authentication attempt');

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Decode the JWT token from Google
    const decoded = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
    const { email, name, picture, sub: googleId } = decoded;

    console.log('Google One-Tap user: ' + email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'No email received from Google'
      });
    }

    // Find or create user
    let user = await User.findOne({
      $or: [
        { email },
        { googleId }
      ]
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = await User.create({
        name: name || formatNameFromEmail(email),
        email,
        password: crypto.randomBytes(16).toString('hex'),
        authMethod: 'google',
        emailVerified: true,
        photoUrl: picture,
        googleId
      });
      console.log('New Google user created: ' + email);
    } else {
      // Update existing user with Google info
      if (!user.googleId) user.googleId = googleId;
      if (!user.photoUrl && picture) user.photoUrl = picture;
      if (user.authMethod !== 'google') user.authMethod = 'google';
      if (!user.emailVerified) user.emailVerified = true;
      
      await user.save({ validateBeforeSave: false });
      console.log('Existing user updated with Google: ' + email);
    }

    // Ensure user has a valid tenant ID
    if (!user.tenantId) {
      // Generate tenant ID for existing users that don't have one
      let tenantId;
      let isUnique = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (!isUnique && attempts < MAX_ATTEMPTS) {
        tenantId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingUser = await User.findOne({ tenantId });
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        tenantId = 'fallback-' + user._id.toString().substring(0,6);
      }
      
      user.tenantId = tenantId;
      await user.save({ validateBeforeSave: false });
    }

    // Generate JWT token with tenantId
    const token = generateToken(user._id, user.tenantId);
    await user.updateLastLogin();

    console.log('Google One-Tap authentication successful for: ' + email, 'Tenant ID:', user.tenantId);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        token,
        _id: user._id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        authMethod: user.authMethod,
        photoUrl: user.photoUrl,
        isNewUser,
        autoLogin: true
      }
    });

  } catch (error) {
    console.error('Error during Google One-Tap authentication:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Quick Google authentication for existing users
// @route   POST /api/auth/google/quick
// @access  Public
const googleQuickAuth = async (req, res) => {
  const { email } = req.body;

  try {
    console.log('Quick Google auth attempt for:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email, authMethod: 'google' });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No Google account found with this email'
      });
    }

    // Ensure user has a valid tenant ID
    if (!user.tenantId) {
      // Generate tenant ID for existing users that don't have one
      let tenantId;
      let isUnique = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (!isUnique && attempts < MAX_ATTEMPTS) {
        tenantId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingUser = await User.findOne({ tenantId });
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        tenantId = 'fallback-' + user._id.toString().substring(0,6);
      }
      
      user.tenantId = tenantId;
      await user.save({ validateBeforeSave: false });
    }

    // Generate JWT token with tenantId
    const token = generateToken(user._id, user.tenantId);
    await user.updateLastLogin();

    console.log('Quick Google auth successful for: ' + email, 'Tenant ID:', user.tenantId);

    res.status(200).json({
      success: true,
      message: 'Quick authentication successful',
      data: {
        token,
        _id: user._id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        authMethod: user.authMethod,
        photoUrl: user.photoUrl,
        autoLogin: true
      }
    });

  } catch (error) {
    console.error('Error during quick Google auth:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during quick authentication'
    });
  }
};

// @desc    Google OAuth redirect (server-side initiated)
// @route   GET /api/auth/google
// @access  Public
const googleAuthRedirect = async (req, res) => {
  try {
    console.log('Starting Google OAuth redirect flow from server...');
    
    const { state, redirect_uri } = req.query;
    const frontendRedirectUri = redirect_uri || (process.env.CLIENT_URL + '/auth/callback');
    
    console.log('Using frontend callback URL:', frontendRedirectUri);
    
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: (process.env.API_BASE_URL || 'http://localhost:5000/') + '/api/auth/google/callback',
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
      ].join(' '),
      state: state || crypto.randomBytes(16).toString('hex')
    };

    // Store the frontend redirect URI in the state parameter
    const fullState = JSON.stringify({
      state: options.state,
      redirect_uri: frontendRedirectUri
    });

    options.state = Buffer.from(fullState).toString('base64');

    const qs = new URLSearchParams(options);
    const authUrl = rootUrl + '?' + qs.toString();

    console.log('Redirecting to Google OAuth:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error);
    res.redirect((process.env.CLIENT_URL || 'http://localhost:5173') + '/auth?error=oauth_failed');
  }
};

// @desc    Google OAuth callback (handles token exchange)
// @route   GET /api/auth/google/callback
// @access  Public
const googleAuthCallback = async (req, res) => {
  try {
    console.log('Google OAuth callback received by backend');
    const { code, error, state } = req.query;

    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect((process.env.CLIENT_URL || 'http://localhost:5173') + '/auth?error=' + error);
    }

    if (!code) {
      console.error('No authorization code received');
      return res.redirect((process.env.CLIENT_URL || 'http://localhost:5173') + '/auth?error=no_code');
    }

    // Decode state to get frontend redirect URI
    let frontendRedirectUri = (process.env.CLIENT_URL || 'http://localhost:5173') + '/auth/callback';
    let originalState = state;
    
    try {
      if (state) {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        frontendRedirectUri = decodedState.redirect_uri || frontendRedirectUri;
        originalState = decodedState.state || state;
      }
    } catch (stateError) {
      console.warn('Error decoding state, using default redirect URI');
    }

    const backendRedirectUri = (process.env.API_BASE_URL || 'http://localhost:5000/') + '/api/auth/google/callback';

    // Exchange code for tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenParams = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: backendRedirectUri
    };

    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenParams),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange code for tokens');
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: 'Bearer ' + tokenData.access_token,
      },
    });

    const userInfo = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      console.error('User info error:', userInfo);
      throw new Error('Failed to fetch user info from Google');
    }

    const { email, name, picture, id: googleId } = userInfo;

    console.log('Google OAuth successful for: ' + email);

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    if (!user) {
      user = await User.create({
        name: name || formatNameFromEmail(email),
        email,
        password: crypto.randomBytes(16).toString('hex'),
        authMethod: 'google',
        emailVerified: true,
        photoUrl: picture,
        googleId
      });
      console.log('New Google OAuth user created: ' + email);
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.photoUrl && picture) user.photoUrl = picture;
      if (user.authMethod !== 'google') user.authMethod = 'google';
      if (!user.emailVerified) user.emailVerified = true;
      
      await user.save({ validateBeforeSave: false });
      console.log('Existing user updated with Google OAuth: ' + email);
    }

    // Ensure user has a valid tenant ID
    if (!user.tenantId) {
      // Generate tenant ID for existing users that don't have one
      let tenantId;
      let isUnique = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (!isUnique && attempts < MAX_ATTEMPTS) {
        tenantId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingUser = await User.findOne({ tenantId });
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      }
      if (!isUnique) {
        tenantId = 'fallback-' + user._id.toString().substring(0,6);
      }
      
      user.tenantId = tenantId;
      await user.save({ validateBeforeSave: false });
    }

    // Generate JWT token for our application with tenantId
    const appToken = generateToken(user._id, user.tenantId);
    await user.updateLastLogin();

    // Prepare user data for frontend redirect
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      tenantId: user.tenantId,
      authMethod: user.authMethod,
      photoUrl: user.photoUrl
    };

    // Redirect to frontend with our app's token and user data
    const redirectUrl = frontendRedirectUri + '?token=' + appToken + '&user=' + encodeURIComponent(JSON.stringify(userData)) + '&state=' + originalState;
    console.log('Redirecting to frontend: ' + redirectUrl);
    
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(frontendUrl + '/auth?error=auth_failed&details=' + encodeURIComponent(error.message));
  }
};

// @desc    Direct Google OAuth authentication
// @route   POST /api/auth/google
// @access  Public
const googleAuthDirect = async (req, res) => {
  const { token: googleToken, code, redirect_uri } = req.body;

  try {
    console.log('Direct Google OAuth attempt (POST request)');

    let userInfo;

    // Handle authorization code flow
    if (code) {
      console.log('Handling authorization code exchange...');
      
      const backendRedirectUri = (process.env.API_BASE_URL || 'http://localhost:5000/') + '/api/auth/google/callback';
      const actualRedirectUri = redirect_uri || (process.env.CLIENT_URL + '/auth/callback');
      
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const tokenParams = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: backendRedirectUri
      };

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenParams),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange code for tokens');
      }

      // Get user info with the access token
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: 'Bearer ' + tokenData.access_token,
        },
      });

      userInfo = await userInfoResponse.json();

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
      }
    } 
    // Handle direct token flow (Google One Tap)
    else if (googleToken) {
      console.log('Handling direct Google token...');
      
      // Decode the JWT token to get user info
      try {
        const payload = JSON.parse(atob(googleToken.split('.')[1]));
        userInfo = {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          id: payload.sub
        };
        console.log('Decoded Google token for:', userInfo.email);
      } catch (decodeError) {
        console.error('Error decoding Google token:', decodeError);
        throw new Error('Invalid Google token');
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Google access token or authorization code is required' 
      });
    }

    const { email, name, picture, id: googleId } = userInfo;

    if (!email) {
      throw new Error('No email received from Google');
    }

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    const isNewUser = !user;

    if (!user) {
      user = await User.create({
        name: name || formatNameFromEmail(email),
        email,
        password: crypto.randomBytes(16).toString('hex'),
        authMethod: 'google',
        emailVerified: true,
        photoUrl: picture,
        googleId
      });
      console.log('New Google OAuth user created: ' + email);
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.photoUrl && picture) user.photoUrl = picture;
      if (user.authMethod !== 'google') user.authMethod = 'google';
      if (!user.emailVerified) user.emailVerified = true;
      
      await user.save({ validateBeforeSave: false });
      console.log('Existing user updated with Google OAuth: ' + email);
    }

    // Ensure user has a valid tenant ID
    if (!user.tenantId) {
      // Generate tenant ID for existing users that don't have one
      let tenantId;
      let isUnique = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (!isUnique && attempts < MAX_ATTEMPTS) {
        tenantId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingUser = await User.findOne({ tenantId });
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        tenantId = 'fallback-' + user._id.toString().substring(0,6);
      }
      
      user.tenantId = tenantId;
      await user.save({ validateBeforeSave: false });
    }

    const token = generateToken(user._id, user.tenantId);
    await user.updateLastLogin();

    console.log('Google OAuth successful for: ' + email, 'Tenant ID:', user.tenantId);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        token,
        _id: user._id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        authMethod: user.authMethod,
        photoUrl: user.photoUrl,
        isNewUser
      }
    });

  } catch (error) {
    console.error('Error during direct Google OAuth:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during Google authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Quick login for demo accounts
// @route   POST /api/auth/quick-login
// @access  Public
const quickLogin = async (req, res) => {
  const { email, name, authMethod = 'demo' } = req.body;

  try {
    console.log('Quick login attempt for:', email, 'Method:', authMethod);

    let user;

    if (authMethod === 'demo') {
      // Create demo user with random email if not provided
      const demoEmail = email || 'demo-' + Date.now() + '@finovo.app';
      const demoName = name || 'Demo User';
      
      user = await User.findOne({ email: demoEmail });

      if (!user) {
        user = await User.create({
          name: demoName,
          email: demoEmail,
          password: crypto.randomBytes(16).toString('hex'),
          authMethod: 'demo',
          emailVerified: true,
          isDemoAccount: true
        });
        console.log('New demo user created: ' + demoEmail);
      }
    } else if (email) {
      user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          name: name || formatNameFromEmail(email),
          email: email,
          password: crypto.randomBytes(16).toString('hex'),
          authMethod: authMethod,
          emailVerified: true
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required for quick login' 
      });
    }

    // Ensure user has a valid tenant ID
    if (!user.tenantId) {
      // Generate tenant ID for existing users that don't have one
      let tenantId;
      let isUnique = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (!isUnique && attempts < MAX_ATTEMPTS) {
        tenantId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingUser = await User.findOne({ tenantId });
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      }
      if (!isUnique) {
        tenantId = 'fallback-' + user._id.toString().substring(0,6);
      }
      
      user.tenantId = tenantId;
      await user.save({ validateBeforeSave: false });
    }

    const token = generateToken(user._id, user.tenantId);
    await user.updateLastLogin();

    console.log('Quick login successful for: ' + user.email, 'Tenant ID:', user.tenantId);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        token,
        _id: user._id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        authMethod: user.authMethod,
        isDemoAccount: user.isDemoAccount || false
      }
    });

  } catch (error) {
    console.error('Error during quick login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during logout' 
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, companyName, userType } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ensure user has a valid tenant ID
    if (!user.tenantId) {
      // Generate tenant ID for existing users that don't have one
      let tenantId;
      let isUnique = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (!isUnique && attempts < MAX_ATTEMPTS) {
        tenantId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingUser = await User.findOne({ tenantId });
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        tenantId = 'fallback-' + user._id.toString().substring(0,6);
      }
      
      user.tenantId = tenantId;
      await user.save({ validateBeforeSave: false });
    }

    if (name) user.name = name;
    if (companyName) user.companyName = companyName;
    if (userType) user.userType = userType;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        userType: user.userType,
        companyName: user.companyName,
        authMethod: user.authMethod,
        photoUrl: user.photoUrl
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + messages.join(', ')
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

export {
  register,
  login,
  getProfile,
  updateProfile,
  sendOtp,
  verifyOtp,
  googleAuthDirect,
  googleAuthRedirect,
  googleAuthCallback,
  googleOneTapAuth,
  googleQuickAuth,
  quickLogin,
  logout
};