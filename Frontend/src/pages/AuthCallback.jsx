// pages/AuthCallback.jsx - UPDATED VERSION
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthCallback = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressInterval;

    const startProgressAnimation = () => {
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + (100 - prev) * 0.1;
        });
      }, 200);
    };

    const handleCallback = async () => {
      try {
        console.log('AuthCallback: Processing callback...');
        startProgressAnimation();
        
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        const userParam = urlParams.get('user');
        const error = urlParams.get('error');

        console.log('Callback parameters:', { 
          hasToken: !!token, 
          hasUser: !!userParam, 
          hasError: !!error
        });

        // Handle errors first
        if (error) {
          console.error('OAuth error:', error);
          setStatus('error');
          setErrorMessage(getErrorMessage(error));
          setProgress(100);
          clearInterval(progressInterval);
          setTimeout(() => {
            navigate('/auth?error=' + error, { replace: true });
          }, 4000);
          return;
        }

        // Handle successful server-side OAuth (token + user)
        if (token && userParam) {
          try {
            const user = JSON.parse(decodeURIComponent(userParam));
            
            const userData = {
              token,
              user: {
                id: user._id,
                name: user.name,
                email: user.email,
                tenantId: user.tenantId,
                authMethod: user.authMethod,
                photoUrl: user.photoUrl
              },
              expiresAt: Date.now() + (24 * 60 * 60 * 1000)
            };

            console.log('User authenticated:', user.email);

            // Store the email for future auto-login
            localStorage.setItem('lastGoogleEmail', user.email);

            // Save session
            localStorage.setItem('userSession', JSON.stringify(userData));
            localStorage.setItem('token', token);
            localStorage.setItem('userId', user._id);
            localStorage.setItem('tenantId', user.tenantId);

            // Call success callback
            if (onLoginSuccess) {
              onLoginSuccess(userData);
            }

            setStatus('success');
            setProgress(100);
            clearInterval(progressInterval);

            // Redirect to dashboard
            setTimeout(() => {
              const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
              localStorage.removeItem('redirectAfterLogin');
              console.log('Redirecting to:', redirectPath);
              navigate(redirectPath, { replace: true });
            }, 2000);

          } catch (parseError) {
            console.error('Error parsing user data:', parseError);
            setStatus('error');
            setErrorMessage('Invalid authentication data received.');
            setProgress(100);
            clearInterval(progressInterval);
            setTimeout(() => {
              navigate('/auth?error=invalid_data', { replace: true });
            }, 3000);
          }
          return;
        }

        // No valid parameters
        console.error('No valid authentication parameters found');
        setStatus('error');
        setErrorMessage('Invalid callback. No authentication data received.');
        setProgress(100);
        clearInterval(progressInterval);
        setTimeout(() => {
          navigate('/auth?error=invalid_callback', { replace: true });
        }, 3000);

      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setErrorMessage('Authentication process failed.');
        setProgress(100);
        clearInterval(progressInterval);
        setTimeout(() => {
          navigate('/auth?error=process_failed', { replace: true });
        }, 3000);
      }
    };

    handleCallback();

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [location, navigate, onLoginSuccess]);

  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'access_denied': 'Access was denied. Please try again.',
      'origin_mismatch': 'Domain configuration error. Please contact support.',
      'invalid_request': 'Invalid authentication request.',
      'unauthorized_client': 'Application not authorized.',
      'invalid_callback': 'Invalid callback parameters.',
      'default': 'An unexpected error occurred. Please try again.'
    };

    return errorMessages[errorCode] || errorMessages.default;
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          title: 'Completing Authentication...',
          message: 'Securely processing your login information.',
          icon: '🔄',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
      case 'success':
        return {
          title: 'Success! 🎉',
          message: 'You have been successfully authenticated.',
          icon: '✅',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      case 'error':
        return {
          title: 'Authentication Failed',
          message: errorMessage,
          icon: '❌',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        };
      default:
        return {
          title: 'Processing...',
          message: 'Please wait.',
          icon: '⏳',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-2 border-gray-200">
        
        {/* Animated Icon */}
        <div className={'w-24 h-24 ' + statusConfig.bgColor + ' rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500'}>
          <span className="text-4xl">{statusConfig.icon}</span>
        </div>
        
        {/* Title */}
        <h1 className={'text-3xl font-bold mb-4 ' + statusConfig.color}>
          {statusConfig.title}
        </h1>
        
        {/* Message */}
        <p className="text-gray-600 mb-8 text-lg">
          {statusConfig.message}
        </p>

        {/* Progress Bar */}
        {status === 'processing' && (
          <div className="w-full bg-gray-200 rounded-full h-3 mb-8 overflow-hidden">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: progress + '%' }}
            ></div>
          </div>
        )}

        {/* Loading Animation */}
        {status === 'processing' && (
          <div className="flex flex-col items-center space-y-4 mb-6">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-sm text-gray-500">
              This may take a few moments...
            </p>
          </div>
        )}

        {/* Error Actions */}
        {status === 'error' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/auth')}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Back to Login
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Security Badge */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className="text-green-500">🔒</span>
            <span>Secure Authentication • Encrypted Connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;