import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status - FIXED VERSION
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const tenantId = localStorage.getItem('tenantId');
        
        console.log('🔐 Auth check - Token exists:', !!token, 'Tenant ID:', !!tenantId);
        
        if (!token || !tenantId) {
          console.log('❌ No token or tenant ID found');
          setIsAuthenticated(false);
          setUser(null);
          setAuthChecked(true);
          setLoading(false);
          return;
        }

        // Verify token with backend by fetching user profile
        console.log('🔄 Verifying token with backend...');
        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': tenantId
          }
        });
        
        if (response.ok) {
          const profileData = await response.json();
          console.log('✅ Token valid, user:', profileData.data);
          setIsAuthenticated(true);
          setUser(profileData.data);
        } else {
          console.log('❌ Token invalid, clearing storage');
          // Clear invalid tokens
          localStorage.removeItem('token');
          localStorage.removeItem('tenantId');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('🚨 Auth check failed:', error);
        // On network errors, assume not authenticated to be safe
        localStorage.removeItem('token');
        localStorage.removeItem('tenantId');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setAuthChecked(true);
        setLoading(false);
        console.log('🏁 Auth check completed, authenticated:', isAuthenticated);
      }
    };

    checkAuth();
  }, []); // Empty dependency array - runs only once

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting login...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const { token, user: userData, tenantId } = data;
        
        console.log('✅ Login successful, storing tokens');
        localStorage.setItem('token', token);
        localStorage.setItem('tenantId', tenantId);
        
        setIsAuthenticated(true);
        setUser(userData);
        
        return { success: true };
      } else {
        console.log('❌ Login failed:', data.message);
        // Clear any existing invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('tenantId');
        setIsAuthenticated(false);
        setUser(null);
        return { 
          success: false, 
          error: data.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('🚨 Login error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('tenantId');
      setIsAuthenticated(false);
      setUser(null);
      return { success: false, error: 'Network error during login' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    loading,
    authChecked,
    login,
    logout
  }), [isAuthenticated, user, loading, authChecked, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};