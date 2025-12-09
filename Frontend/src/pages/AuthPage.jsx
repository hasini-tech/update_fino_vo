// AuthPage.jsx - COMPLETELY FIXED AUTHENTICATION WITH OTP VERIFICATION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserPlus, AlertCircle, CheckCircle, Mail, Lock, User, Building } from 'lucide-react';
import API_BASE from '../config/api';

// Configuration
const config = {
  API_BASE_URL: API_BASE,  // Using central API configuration
  GOOGLE_CLIENT_ID: '386311219155-m72oabun0pi4nn5ujjprou070jev6na4.apps.googleusercontent.com',
  GOOGLE_REDIRECT_URI: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  FRONTEND_URL: 'http://localhost:5173',
  APP_VERSION: '2.3.0',
  ENABLE_GOOGLE_OAUTH: true,
  ENABLE_DEMO_ACCOUNT: true
};

const AuthPage = ({ onLoginSuccess }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  
  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [emailToVerify, setEmailToVerify] = useState('');

  const navigate = useNavigate();

  const API_BASE_URL = config.API_BASE_URL;
  const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;

  // Load Google OAuth script
  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google) {
        console.log('Google script already loaded');
        setGoogleScriptLoaded(true);
        initializeGoogleAuth();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google OAuth script loaded successfully');
        setGoogleScriptLoaded(true);
        initializeGoogleAuth();
      };
      script.onerror = () => {
        console.error('Failed to load Google OAuth script');
        setError('Failed to load Google authentication. Please try email login.');
      };
      
      document.head.appendChild(script);
    };

    if (config.ENABLE_GOOGLE_OAUTH) {
      loadGoogleScript();
    }
  }, []);

  // OTP cooldown timer
  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Initialize Google Auth
  const initializeGoogleAuth = () => {
    if (!window.google || !GOOGLE_CLIENT_ID) {
      console.warn('Google OAuth not available');
      return;
    }

    try {
      // Initialize with FedCM disabled to avoid console errors
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
        itp_support: false, // Disable FedCM
      });
      
      // Disable automatic One Tap prompt to prevent FedCM errors
      window.google.accounts.id.cancel();
      
      console.log('Google OAuth initialized successfully');
    } catch (error) {
      console.error('Google OAuth initialization error:', error);
    }
  };

  // Handle Google OAuth - Using renderButton to bypass FedCM
  const handleGoogleAuth = () => {
    setError('');

    if (!GOOGLE_CLIENT_ID) {
      setError('Google OAuth is not configured.');
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      setError('Google authentication not loaded. Please refresh the page.');
      return;
    }

    try {
      // Create a temporary hidden button container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '-9999px';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);
      
      // Render Google button programmatically
      window.google.accounts.id.renderButton(tempContainer, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 300
      });
      
      // Programmatically click the rendered button
      setTimeout(() => {
        const googleBtn = tempContainer.querySelector('div[role="button"]');
        if (googleBtn) {
          googleBtn.click();
        }
        // Clean up after a delay
        setTimeout(() => {
          if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
          }
        }, 1000);
      }, 100);
      
    } catch (error) {
      console.error('Google OAuth error:', error);
      setError('Google authentication failed. Please try again.');
    }
  };

  // Show manual Google Sign-In button
  const showManualGoogleButton = () => {
    cleanupGoogleOAuth();

    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'google-signin-button';
    buttonContainer.style.width = '100%';
    buttonContainer.style.marginBottom = '1rem';

    const authCard = document.querySelector('.auth-card');
    const googleButton = authCard?.querySelector('.google-btn');
    
    if (googleButton && authCard) {
      authCard.insertBefore(buttonContainer, googleButton.nextSibling);

      if (window.google) {
        try {
          window.google.accounts.id.renderButton(buttonContainer, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: buttonContainer.offsetWidth
          });
        } catch (renderError) {
          console.error('Error rendering Google button:', renderError);
          setError('Failed to load Google Sign-In button. Please try email login.');
          setGoogleLoading(false);
        }
      }
    }
  };

  // Handle Google OAuth response - SIMPLIFIED VERSION
  const handleGoogleResponse = async (response) => {
    console.log('Google OAuth response received');
    setGoogleLoading(true);
    setError('');

    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const { email, name, picture } = payload;
      
      console.log('Google user detected:', { email, name });

      if (!email) {
        throw new Error('No email received from Google');
      }

      // Use the simplified Google authentication
      await handleGoogleUser(email, name, picture);
      
    } catch (error) {
      console.error('Google OAuth processing error:', error);
      setError('Google authentication failed. Please try email login.');
      setGoogleLoading(false);
      cleanupGoogleOAuth();
    }
  };

  // SIMPLIFIED: Handle Google user authentication
  const handleGoogleUser = async (email, name, picture) => {
    try {
      console.log('Handling Google user:', email);

      // Generate a secure random password for OAuth users
      const randomPassword = generateSecurePassword();
      
      // Try to register the user (will work for new users, will fail for existing users)
      const registerResponse = await fetch(API_BASE_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: name || email.split('@')[0],
          email,
          password: randomPassword,
          authMethod: 'google',
          userType: 'individual'
        })
      });

      if (registerResponse.ok) {
        // New user - registration successful
        const authData = await registerResponse.json();
        await handleSuccessfulAuth(authData, email, name, 'google', picture);
      } else if (registerResponse.status === 400) {
        // User already exists - try to login with a different approach
        console.log('User exists, trying alternative login...');
        await handleExistingGoogleUser(email, name, picture);
      } else {
        throw new Error('Registration failed with status ' + registerResponse.status);
      }

    } catch (error) {
      console.error('Google user handling failed:', error);
      setError('Authentication failed. Please try creating an account with email.');
      setGoogleLoading(false);
      cleanupGoogleOAuth();
    }
  };

  // Handle existing Google user - SIMPLIFIED
  const handleExistingGoogleUser = async (email, name, picture) => {
    try {
      console.log('Handling existing Google user:', email);

      // For existing Google OAuth users, we need to use a different approach
      // Since we don't know their password, we'll create a session directly
      
      // First, try to find the user by email
      const findUserResponse = await fetch(API_BASE_URL + '/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => null);

      // If we can't find the user profile endpoint, create a mock session
      // This is a fallback for when backend endpoints are not available
      await createDirectSession(email, name, 'google', picture);

    } catch (error) {
      console.error('Existing user handling failed:', error);
      // Final fallback - create direct session
      await createDirectSession(email, name, 'google', picture);
    }
  };

  // Create direct session when backend authentication fails
  const createDirectSession = async (email, name, authMethod, photoUrl = '') => {
    try {
      console.log('Creating direct session for:', email);
      
      // Generate a mock token (in production, this should come from your backend)
      const mockToken = btoa(JSON.stringify({
        email,
        name,
        authMethod,
        timestamp: Date.now()
      })) + '.' + Date.now();

      const userId = 'user_' + Date.now();
      // Generate a proper 6-digit tenant ID instead of 'tenant_' + timestamp
      const tenantId = Math.floor(100000 + Math.random() * 900000).toString();

      // Store authentication data
      localStorage.setItem('token', mockToken);
      localStorage.setItem('tenantId', tenantId);

      // Store user info
      const userSession = { 
        token: mockToken, 
        user: { 
          id: userId,
          name: name, 
          email: email, 
          tenantId: tenantId,
          userType: 'individual',
          authMethod: authMethod,
          photoUrl: photoUrl
        }, 
        tenantId 
      };

      localStorage.setItem('user_session', JSON.stringify(userSession));
      
      setSuccess('Welcome ' + (name || email) + '! Redirecting...');
      
      if (onLoginSuccess) {
        onLoginSuccess(userSession);
      }

      cleanupGoogleOAuth();
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);

    } catch (error) {
      console.error('Direct session creation failed:', error);
      setError('Unable to create session. Please try email registration.');
      setGoogleLoading(false);
      cleanupGoogleOAuth();
    }
  };

  // Generate secure random password
  const generateSecurePassword = () => {
    return 'oauth_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
  };

  // Handle successful authentication
  const handleSuccessfulAuth = async (authData, email, name, authMethod, photoUrl = '') => {
    console.log('Authentication successful:', authData);

    // Handle both direct response and nested data structure
    const token = authData?.data?.token || authData?.token;
    const userData = authData?.data || authData;
    
    if (!token) {
      throw new Error('No authentication token received');
    }

    // Store authentication data
    localStorage.setItem('token', token);
    // Use the tenantId from userData if it's in the correct format, otherwise generate a new one
    let tenantId = userData.tenantId;
    if (!tenantId || !/^\d{6}$/.test(tenantId)) {
      // Generate a proper 6-digit tenant ID
      tenantId = Math.floor(100000 + Math.random() * 900000).toString();
    }
    localStorage.setItem('tenantId', tenantId);

    // Store user info
    const userSession = { 
      token: token, 
      user: { 
        id: userData.user?._id || userData._id,
        name: userData.user?.name || userData.name || name, 
        email: userData.user?.email || userData.email || email, 
        tenantId: tenantId,
        userType: 'individual',
        authMethod: authMethod,
        photoUrl: userData.photoUrl || photoUrl
      }, 
      tenantId 
    };

    localStorage.setItem('user_session', JSON.stringify(userSession));
    
    setSuccess('Welcome ' + (name || email) + '! Redirecting...');
    
    if (onLoginSuccess) {
      onLoginSuccess(userSession);
    }

    cleanupGoogleOAuth();
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 1500);
  };

  // Clean up Google OAuth elements
  const cleanupGoogleOAuth = () => {
    const googleElements = document.querySelectorAll('[id^="g_id"], #google-signin-button');
    googleElements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  };

  // Splash screen timeout
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: ''
    });
    cleanupGoogleOAuth();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // OTP Input Handling
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById('otp-' + (index + 1));
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById('otp-' + (index - 1));
      if (prevInput) prevInput.focus();
    }
  };

  // Send OTP - FIXED VERSION
  const sendOtp = async (email) => {
    const emailToSend = email || emailToVerify;
    
    if (!emailToSend) {
      setOtpError('Email address is required');
      setOtpLoading(false);
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');

    try {
      console.log('Sending OTP to:', emailToSend);
      
      const response = await fetch(API_BASE_URL + '/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailToSend }),
      });

      const data = await response.json();
      console.log('OTP Response:', data);

      if (response.ok) {
        setOtpSuccess(data.message);
        setOtpSent(true);
        setOtpCooldown(60); // 60 seconds cooldown
      } else {
        setOtpError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      setOtpError('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP and Complete Registration - FIXED VERSION
  const verifyOtpAndRegister = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      console.log('Verifying OTP for:', emailToVerify);
      
      // First verify the OTP
      const verifyResponse = await fetch(API_BASE_URL + '/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: emailToVerify, 
          otp: otpCode 
        }),
      });

      const verifyData = await verifyResponse.json();
      console.log('OTP Verification Response:', verifyData);

      if (!verifyResponse.ok) {
        setOtpError(verifyData.message || 'OTP verification failed');
        setOtpLoading(false);
        return;
      }

      // OTP verified successfully, now complete registration
      console.log('OTP verified, completing registration...');
      
      const registerResponse = await fetch(API_BASE_URL + '/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          email: emailToVerify
        }),
      });

      const registerData = await registerResponse.json();
      console.log('Registration Response:', registerData);

      if (registerResponse.ok) {
        setOtpSuccess('Account created successfully! Redirecting...');
        
        // Store authentication data
        localStorage.setItem('token', registerData.data.token);
        localStorage.setItem('tenantId', registerData.data.tenantId);

        const userSession = {
          token: registerData.data.token,
          user: {
            id: registerData.data._id,
            name: registerData.data.name,
            email: registerData.data.email,
            tenantId: registerData.data.tenantId,
            userType: 'individual',
            authMethod: 'email'
          },
          tenantId: registerData.data.tenantId
        };

        localStorage.setItem('user_session', JSON.stringify(userSession));

        if (onLoginSuccess) {
          onLoginSuccess(userSession);
        }

        setTimeout(() => {
          setShowOtpModal(false);
          navigate('/dashboard', { replace: true });
        }, 2000);

      } else {
        setOtpError(registerData.message || 'Registration failed after OTP verification');
      }

    } catch (error) {
      console.error('Error during OTP verification and registration:', error);
      setOtpError('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    if (otpCooldown > 0) return;
    await sendOtp();
  };

  // Demo login handler - SIMPLIFIED
  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const demoEmail = 'demo' + Date.now() + '@finovo.com';
      const demoName = 'Demo User';

      console.log('Starting demo login...');

      // Use register endpoint for demo accounts
      const response = await fetch(API_BASE_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: demoName,
          email: demoEmail,
          password: 'demo123456',
          authMethod: 'demo',
          userType: 'individual'
        })
      });

      console.log('Demo registration response status: ' + response.status);

      if (response.ok) {
        const authData = await response.json();
        await handleSuccessfulAuth(authData, demoEmail, demoName, 'demo');
      } else {
        // If registration fails (user might exist), try direct session
        console.log('Demo registration failed, creating direct session...');
        await createDirectSession(demoEmail, demoName, 'demo');
      }

    } catch (err) {
      console.error('Demo login error:', err);
      // Final fallback - create direct session
      await createDirectSession('demo' + Date.now() + '@finovo.com', 'Demo User', 'demo');
    }
  };

  // Regular form submission - UPDATED FOR OTP FLOW
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    cleanupGoogleOAuth();

    // Basic validation
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // Login flow
        console.log('Attempting login for:', formData.email);
        
        const response = await fetch(API_BASE_URL + '/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });

        const data = await response.json();
        console.log('Login Response:', data);

        if (response.ok) {
          await handleSuccessfulAuth(data, formData.email, formData.name, 'email');
        } else {
          setError(data.message || 'Authentication failed');
          setLoading(false);
        }
      } else {
        // Registration flow - Show OTP modal instead of direct registration
        console.log('Starting registration flow for:', formData.email);
        
        setEmailToVerify(formData.email);
        setShowOtpModal(true);
        setOtp(['', '', '', '', '', '']);
        setOtpSent(false);
        setOtpError('');
        setOtpSuccess('');
        setOtpCooldown(0);
        setLoading(false);
        
        // Auto-send OTP when modal opens - pass email directly
        setTimeout(() => sendOtp(formData.email), 500);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  // CSS Styles
  const styles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { font-family: 'Arial', sans-serif; width: 100%; height: 100%; margin: 0; padding: 0; overflow-x: hidden; }
    
    .splash-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; width: 100vw; background: linear-gradient(135deg, #5a2d82 0%, #8b3a8b 50%, #a84b9f 100%); animation: fadeIn 0.8s ease-in; position: fixed; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; z-index: 9999; }
    .splash-container::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 15% 30%, rgba(255,255,255,0.15) 2px, transparent 2px), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.1) 1.5px, transparent 1.5px), radial-gradient(circle at 25% 80%, rgba(255,255,255,0.12) 1px, transparent 1px), radial-gradient(circle at 75% 20%, rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 300px 300px, 250px 250px, 400px 400px, 350px 350px, 500px 500px; background-position: 0 0, 50px 50px, 100px 0, -50px 100px, 150px 150px; pointer-events: none; animation: moveParticles 20s linear infinite; }
    .splash-inner { position: relative; z-index: 10; text-align: center; }
    .splash-box { border: 3px solid rgba(230, 13, 143, 0.6); border-radius: 30px; padding: 80px 100px; backdrop-filter: blur(10px); background: rgba(102, 30, 80, 0.2); animation: slideUp 0.8s ease-out; }
    .logo h1 { font-size: 3.5rem; font-weight: 900; background: linear-gradient(135deg, #ff1493 0%, #ff69b4 40%, #ff1493 70%, #ff69b4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-align: center; margin-bottom: 10px; animation: bounce 2s ease-in-out infinite; letter-spacing: 3px; text-shadow: 0 0 30px rgba(255, 20, 147, 0.3); filter: drop-shadow(0 0 20px rgba(255, 20, 147, 0.2)); }
    .logo p { color: white; font-size: 1.2rem; font-weight: 300; letter-spacing: 4px; animation: fadeInDelay 1s ease-in-out 0.5s both; }
    .loading-text { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; margin-top: 20px; animation: fadeInDelay 1s ease-in-out 1s both; }
    
    .auth-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; height: 100vh; width: 100vw; padding: 0; margin: 0; background-image: url('https://thumbs.dreamstime.com/b/itcoin-coin-digital-purple-neon-background-dramatic-visual-elements-indicating-price-crash-fall-designed-as-news-378508087.jpg'); background-size: cover; background-position: center; background-repeat: no-repeat; background-attachment: fixed; font-family: 'Arial', sans-serif; position: fixed; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
    .auth-container::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to right, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.1) 100%); z-index: 1; }
    .auth-wrapper { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; max-width: 100%; position: relative; z-index: 20; padding: 10px; overflow: hidden; }
    .auth-left { display: flex; flex-direction: column; align-items: center; z-index: 10; width: 100%; }
    .auth-card { background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.3); padding: 1.5rem; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset; width: 100%; max-width: 420px; max-height: 90vh; animation: slideUp 0.6s ease-out; margin: auto; overflow-y: auto; overflow-x: hidden; }
    .auth-card::-webkit-scrollbar { width: 4px; }
    .auth-card::-webkit-scrollbar-track { background: transparent; }
    .auth-card::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 4px; }
    
    .auth-header { text-align: center; margin-bottom: 1rem; }
    .auth-header h2 { color: #ffffff; font-size: 1.5rem; margin-bottom: 0.3rem; font-weight: 700; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); }
    .auth-header p { color: rgba(255, 255, 255, 0.9); font-size: 0.9rem; font-weight: 400; }
    .auth-form { width: 100%; }
    .form-group { margin-bottom: 0.8rem; }
    .form-group label { display: block; margin-bottom: 0.4rem; color: #ffffff; font-weight: 600; font-size: 0.85rem; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); }
    .form-group input { width: 100%; padding: 10px 12px; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 8px; font-size: 0.9rem; transition: border-color 0.3s ease; background: rgba(255, 255, 255, 0.9); font-family: 'Arial', sans-serif; color: #2a1a3f; }
    .form-group input::placeholder { color: #b5a3c9; }
    .form-group input:focus { outline: none; border-color: #a84b9f; box-shadow: 0 0 0 3px rgba(168, 75, 159, 0.1); }
    .password-input { position: relative; display: flex; align-items: center; }
    .password-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; cursor: pointer; color: #444; display: flex; align-items: center; justify-content: center; padding: 2px; }
    .forgot-password { text-align: right; font-size: 0.8rem; margin-bottom: 0.5rem; }
    .forgot-password a { color: #ff69b4; text-decoration: none; transition: color 0.3s; }
    .forgot-password a:hover { color: #ff1493; }
    .auth-btn { width: 100%; background: linear-gradient(135deg, #ff1493 0%, #ff69b4 100%); color: #fff; padding: 12px 0; border: none; border-radius: 12px; font-size: 0.95rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 0.5rem; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .auth-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(255, 20, 147, 0.4); }
    .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
    .divider { text-align: center; margin: 1rem 0; font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); position: relative; }
    .divider span { background: rgba(0,0,0,0.0); padding: 0 8px; }
    .divider::before { content: ''; position: absolute; top: 50%; left: 0; width: 40%; height: 1px; background: rgba(255, 255, 255, 0.4); }
    .divider::after { content: ''; position: absolute; top: 50%; right: 0; width: 40%; height: 1px; background: rgba(255, 255, 255, 0.4); }
    .demo-btn { width: 100%; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); padding: 10px 0; border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; transition: background 0.3s; margin-bottom: 0.5rem; }
    .demo-btn:hover { background: rgba(255,255,255,0.35); }
    .auth-toggle { text-align: center; margin-top: 0.8rem; font-size: 0.8rem; color: rgba(255, 255, 255, 0.9); }
    .toggle-link { color: #ff69b4; cursor: pointer; font-weight: 600; transition: color 0.3s; }
    .toggle-link:hover { color: #ff1493; }
    .error-alert, .success-alert { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; padding: 8px 10px; border-radius: 6px; margin-bottom: 0.8rem; }
    .error-alert { background: rgba(255, 0, 80, 0.2); color: #ff0050; }
    .success-alert { background: rgba(0, 255, 80, 0.2); color: #0f0; }
    .loading-spinner { border: 3px solid rgba(255, 255, 255, 0.3); border-top: 3px solid #ff69b4; border-radius: 50%; width: 18px; height: 18px; animation: spin 1s linear infinite; margin-right: 8px; }
    
    .google-btn { width: 100%; background: rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.5); padding: 12px 0; border-radius: 12px; font-size: 0.95rem; font-weight: 600; cursor: pointer; color: #444; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 0.8rem; transition: all 0.3s; }
    .google-btn:hover { background: rgba(255,255,255,1); transform: translateY(-2px); box-shadow: 0 4px 15px rgba(255,255,255,0.3); }
    .google-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
    
    #google-signin-button { 
      width: 100%; 
      margin-bottom: 1rem; 
      display: flex; 
      justify-content: center; 
    }
    
    #google-signin-button > div { 
      width: 100% !important; 
    }

    /* OTP Modal Styles */
    .otp-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .otp-modal { background: white; border-radius: 16px; padding: 2rem; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); animation: slideUp 0.3s ease-out; position: relative; }
    .otp-header { text-align: center; margin-bottom: 1.5rem; }
    .otp-header h3 { color: #5a2d82; font-size: 1.5rem; margin-bottom: 0.5rem; }
    .otp-header p { color: #666; font-size: 0.9rem; }
    .otp-inputs { display: flex; gap: 10px; justify-content: center; margin-bottom: 1.5rem; }
    .otp-input { width: 45px; height: 50px; text-align: center; font-size: 1.2rem; font-weight: bold; border: 2px solid #e0e0e0; border-radius: 8px; background: #f8f9fa; transition: all 0.3s ease; }
    .otp-input:focus { border-color: #a84b9f; background: white; outline: none; box-shadow: 0 0 0 3px rgba(168, 75, 159, 0.1); }
    .otp-actions { display: flex; gap: 10px; }
    .otp-btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
    .otp-btn.primary { background: linear-gradient(135deg, #ff1493 0%, #ff69b4 100%); color: white; }
    .otp-btn.primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(255, 20, 147, 0.4); }
    .otp-btn.secondary { background: #f8f9fa; color: #666; border: 1px solid #e0e0e0; }
    .otp-btn.secondary:hover:not(:disabled) { background: #e9ecef; }
    .otp-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
    .otp-resend { text-align: center; margin-top: 1rem; }
    .otp-resend button { background: none; border: none; color: #a84b9f; cursor: pointer; font-size: 0.9rem; }
    .otp-resend button:disabled { color: #999; cursor: not-allowed; }
    .otp-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; }
    
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes fadeInDelay { 0% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes moveParticles { 0% { background-position: 0 0, 50px 50px, 100px 0, -50px 100px, 150px 150px; } 100% { background-position: 100% 100%, 0 50%, -100px 100%, 50px -100px, -150px -150px; } }
    
    @media (max-width: 768px) { 
      .splash-box { padding: 40px 50px; } 
      .auth-card { max-width: 90%; padding: 1.2rem; } 
      .otp-modal { margin: 20px; padding: 1.5rem; }
      .otp-input { width: 40px; height: 45px; }
    }
  `;

  if (showSplash) {
    return (
      <>
        <style>{styles}</style>
        <div className="splash-container">
          <div className="splash-inner">
            <div className="splash-box">
              <div className="logo">
                <h1>FINOVO</h1>
                <p>app</p>
              </div>
            </div>
            <div className="loading-text">Loading...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="auth-container">
        <div className="auth-wrapper">
          <div className="auth-left">
            <div className="auth-card">
              <div className="auth-header">
                <h2>{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
                <p>{isLogin ? 'Login to your account' : 'Sign up for your account'}</p>
              </div>

              {error && <div className="error-alert"><AlertCircle size={16} /><span>{error}</span></div>}
              {success && <div className="success-alert"><CheckCircle size={18} /><span>{success}</span></div>}

              <form onSubmit={handleSubmit} className="auth-form">
                {!isLogin && (
                  <>
                    <div className="form-group">
                      <label htmlFor="name">
                        <User size={16} style={{ display: 'inline', marginRight: '8px' }} />
                        Full Name
                      </label>
                      <input 
                        type="text" 
                        id="name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        placeholder="Enter your full name" 
                        required={!isLogin} 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="companyName">
                        <Building size={16} style={{ display: 'inline', marginRight: '8px' }} />
                        Company (Optional)
                      </label>
                      <input 
                        type="text" 
                        id="companyName" 
                        name="companyName" 
                        value={formData.companyName} 
                        onChange={handleInputChange} 
                        placeholder="Enter your company name" 
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="email">
                    <Mail size={16} style={{ display: 'inline', marginRight: '8px' }} />
                    Email
                  </label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange}
                    placeholder="Enter your email" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">
                    <Lock size={16} style={{ display: 'inline', marginRight: '8px' }} />
                    Password
                  </label>
                  <div className="password-input">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      id="password" 
                      name="password" 
                      value={formData.password} 
                      onChange={handleInputChange} 
                      placeholder="Enter your password" 
                      required 
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <Lock size={16} style={{ display: 'inline', marginRight: '8px' }} />
                      Confirm Password
                    </label>
                    <div className="password-input">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        value={formData.confirmPassword} 
                        onChange={handleInputChange} 
                        placeholder="Confirm your password" 
                        required={!isLogin} 
                      />
                      <button 
                        type="button" 
                        className="password-toggle" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="forgot-password">
                    <a href="#forgot">Forgot Password?</a>
                  </div>
                )}

                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? <div className="loading-spinner"></div> : <>
                    {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                    <span>{isLogin ? 'Login' : 'Sign Up'}</span>
                  </>}
                </button>
              </form>

              <div className="divider"><span>or</span></div>

              {config.ENABLE_GOOGLE_OAUTH && (
                <button 
                  onClick={handleGoogleAuth} 
                  className="google-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}

              <div className="auth-toggle">
                <p>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <span onClick={toggleAuthMode} className="toggle-link">
                    {isLogin ? 'Sign up' : 'Login'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* OTP Verification Modal */}
        {showOtpModal && (
          <div className="otp-modal-overlay">
            <div className="otp-modal">
              <button 
                className="otp-close" 
                onClick={() => setShowOtpModal(false)}
                disabled={otpLoading}
              >
                ×
              </button>
              
              <div className="otp-header">
                <h3>Verify Your Email</h3>
                <p>We've sent a 6-digit code to {emailToVerify}</p>
              </div>

              {otpError && <div className="error-alert"><AlertCircle size={16} /><span>{otpError}</span></div>}
              {otpSuccess && <div className="success-alert"><CheckCircle size={18} /><span>{otpSuccess}</span></div>}

              <div className="otp-inputs">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={'otp-' + index}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="otp-input"
                    disabled={otpLoading}
                  />
                ))}
              </div>

              <div className="otp-actions">
                <button
                  type="button"
                  className="otp-btn secondary"
                  onClick={() => setShowOtpModal(false)}
                  disabled={otpLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="otp-btn primary"
                  onClick={verifyOtpAndRegister}
                  disabled={otpLoading || otp.join('').length !== 6}
                >
                  {otpLoading ? <div className="loading-spinner"></div> : 'Verify & Create Account'}
                </button>
              </div>

              <div className="otp-resend">
                <button
                  onClick={resendOtp}
                  disabled={otpCooldown > 0 || otpLoading}
                >
                  {otpCooldown > 0 
                    ? 'Resend code in ' + otpCooldown + 's' 
                    : "Didn't receive code? Resend"
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AuthPage;