// pages/GoogleLoginButton.jsx
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique state

// Inline Google SVG icon for better performance and to avoid broken image links (Fixes 404)
const GoogleIcon = () => (
  <svg 
    version="1.1" 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 48 48" 
    width="24px" 
    height="24px"
    className="mr-2"
  >
    <path 
      fill="#4285F4" 
      d="M45.1,23.3c0-1.7-0.2-3.3-0.5-4.9H24.5v9.3h11.9c-0.5,2.9-2,5.5-4.5,7.2v6h7.7C43.1,38.6,45.1,31.4,45.1,23.3z"
    />
    <path 
      fill="#34A853" 
      d="M24.5,45.1c6.5,0,12.1-2.2,16.1-6v-6h-7.7c-2.1,1.4-4.7,2.3-8.4,2.3c-6.4,0-11.9-4.3-13.9-10.1h-8.1v6C7.5,41.9,15.3,45.1,24.5,45.1z"
    />
    <path 
      fill="#FBBC05" 
      d="M10.6,28.6c-0.5-1.4-0.8-2.9-0.8-4.3c0-1.5,0.3-3,0.8-4.3v-6h-8.1v6C2,20.1,2,26.5,2,26.5L10.6,28.6z"
    />
    <path 
      fill="#EA4335" 
      d="M24.5,8.1c3.5,0,6.6,1.2,9.1,3.4l6.1-6.1c-4.1-3.7-9.5-6-15.2-6c-9.2,0-16.9,3.2-22.5,9.6l8.1,6C12.6,12.4,18.1,8.1,24.5,8.1z"
    />
  </svg>
);

const GoogleLoginButton = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Method 1: Server-side redirect (RECOMMENDED - No origin_mismatch if backend is configured correctly)
  const handleServerSideRedirect = () => {
    setLoading(true);
    setError('');
    
    try {
      // Store current path for redirect after login
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/' && currentPath !== '/auth') {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }

      // Use server-side OAuth flow to avoid origin_mismatch on the frontend
      // The backend will handle constructing the Google OAuth URL with its own redirect_uri
      const redirectUrl = import.meta.env.VITE_API_BASE_URL + '/api/auth/google';
      console.log('Using server-side OAuth redirect to:', redirectUrl);
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Server-side redirect error:', error);
      setError('Failed to start authentication. Please try again.');
      setLoading(false);
    }
  };

  // Method 2: Manual Google OAuth URL (Alternative, more...
  const handleManualRedirect = () => {
    setLoading(true);
    setError('');
    
    try {
      const state = uuidv4();
      localStorage.setItem('googleAuthState', state); // Store state for security
      
      const config = {
        GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        // Ensure this matches the allowed redirect URIs in Google Cloud Console
        FRONTEND_REDIRECT_URI: window.location.origin + '/auth/callback', 
      };

      const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
      const options = {
        redirect_uri: config.FRONTEND_REDIRECT_URI,
        client_id: config.GOOGLE_CLIENT_ID,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        scope: [
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
        state: state,
      };

      const qs = new URLSearchParams(options);
      const authUrl = rootUrl + '?' + qs.toString();
      
      console.log('Using manual OAuth redirect to:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Manual redirect error:', error);
      setError('Failed to start authentication. Please try again.');
      setLoading(false);
    }
  };
  
  // Decide which flow to use (Server-side is preferred)
  const handleClick = handleServerSideRedirect; 
  // const handleClick = handleManualRedirect; // Uncomment this to test the manual flow

  return (
    <div className="google-auth-section">
      <button
        onClick={handleClick}
        disabled={loading}
        className={'google-login-btn ' + (loading ? 'loading' : '')}
      >
        {loading ? (
          'Processing...'
        ) : (
          <>
            <GoogleIcon />
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {error && (
        <p className="error-message mt-2 text-sm text-red-500">{error}</p>
      )}

      {/* Removed the debug section that was likely causing the image request */}
      
      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>

      {/* Terms */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-800 underline font-medium">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline font-medium">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default GoogleLoginButton;