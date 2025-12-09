// authService.js - COMPLETE FIXED VERSION
class AuthService {
  constructor() {
    this.token = null;
    this.tenantId = null;
    this.userId = null;
    this.initializeFromStorage();
  }

  initializeFromStorage() {
    try {
      // Get token from localStorage first
      this.token = localStorage.getItem('token') || 
                   localStorage.getItem('sessionToken') ||
                   localStorage.getItem('auth_token');
      
      this.userId = localStorage.getItem('userId') || 
                    localStorage.getItem('user_id');

      // Fallback to sessionStorage for token
      if (!this.token) {
        this.token = sessionStorage.getItem('token') || 
                     sessionStorage.getItem('sessionToken');
      }
      if (!this.userId) {
        this.userId = sessionStorage.getItem('userId') || 
                      sessionStorage.getItem('user_id');
      }

      // CRITICAL FIX: Extract tenant ID from JWT token
      if (this.token) {
        const tokenTenantId = this.extractTenantIdFromToken(this.token);
        if (tokenTenantId) {
          // Clean and normalize the tenant ID
          this.tenantId = this.cleanTenantId(tokenTenantId);
          localStorage.setItem('tenantId', this.tenantId);
          console.log('✅ Tenant ID synced from JWT token:', this.tenantId);
        }
      }

      // Fallback to stored tenant ID only if token extraction failed
      if (!this.tenantId) {
        const storedTenantId = localStorage.getItem('tenantId') || 
                               localStorage.getItem('tenant_id') ||
                               sessionStorage.getItem('tenantId') || 
                               sessionStorage.getItem('tenant_id');
        if (storedTenantId) {
          this.tenantId = this.cleanTenantId(storedTenantId);
        }
      }

      // Check userSession object as last resort
      if (!this.token || !this.tenantId) {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          try {
            const session = JSON.parse(userSession);
            if (session.token && !this.token) {
              this.token = session.token;
              const sessionTokenTenantId = this.extractTenantIdFromToken(session.token);
              if (sessionTokenTenantId) {
                this.tenantId = this.cleanTenantId(sessionTokenTenantId);
                localStorage.setItem('tenantId', this.tenantId);
              }
            }
            if (session.user?.id && !this.userId) this.userId = session.user.id;
            if (!this.tenantId && session.tenantId) {
              this.tenantId = this.cleanTenantId(session.tenantId);
            }
            if (!this.tenantId && session.user?.tenantId) {
              this.tenantId = this.cleanTenantId(session.user.tenantId);
            }
          } catch (e) {
            console.warn('Failed to parse userSession:', e);
          }
        }
      }

      console.log('🔐 Auth Service Initialized:', {
        token: this.token ? '***' + this.token.slice(-10) : 'none',
        tenantId: this.tenantId || 'none',
        userId: this.userId || 'none'
      });

    } catch (error) {
      console.error('❌ Error initializing auth service:', error);
    }
  }

  // CRITICAL: Clean tenant ID - remove hidden characters, ensure proper format
  cleanTenantId(tenantId) {
    if (!tenantId) return null;
    
    // Handle object tenant IDs
    if (typeof tenantId === 'object') {
      tenantId = tenantId._id || tenantId.id || tenantId.toString();
    }
    
    // Convert to string and trim
    let cleaned = String(tenantId).trim();
    
    // Remove any non-printable/hidden characters (keep only ASCII 32-126)
    cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');
    
    // Remove quotes
    cleaned = cleaned.replace(/['"]/g, '');
    
    // Remove any whitespace
    cleaned = cleaned.replace(/\s/g, '');
    
    console.log('🧹 Cleaned tenant ID:', `"${tenantId}" -> "${cleaned}" (length: ${cleaned.length})`);
    
    return cleaned;
  }

  // Extract tenant ID from JWT token
  extractTenantIdFromToken(token) {
    if (!token) return null;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid JWT token format');
        return null;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      let tenantId = payload.tenantId || 
                     payload.tenant_id || 
                     payload.TenantId || 
                     payload.tenant ||
                     payload.tId;
      
      // Handle case where tenantId is an object
      if (tenantId && typeof tenantId === 'object') {
        tenantId = tenantId._id || tenantId.id || tenantId.toString();
      }
      
      if (tenantId) {
        const cleaned = this.cleanTenantId(tenantId);
        console.log('🔐 Extracted tenant ID from token:', cleaned);
        return cleaned;
      }
      
      return null;
    } catch (e) {
      console.warn('Could not decode JWT token:', e.message);
      return null;
    }
  }

  // Validate tenant ID - accepts 6-digit, MongoDB ObjectId, fallback, and UUID formats
  isValidTenantId(tenantId) {
    if (!tenantId) return false;
    
    const cleaned = this.cleanTenantId(tenantId);
    if (!cleaned) return false;
    
    // Accept 6-digit format
    if (/^\d{6}$/.test(cleaned)) return true;
    
    // Accept MongoDB ObjectId format (24 hex characters)
    if (/^[a-fA-F0-9]{24}$/.test(cleaned)) return true;
    
    // Accept fallback format
    if (cleaned.startsWith('fallback-')) return true;
    
    // Accept UUID format
    if (/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(cleaned)) return true;
    
    // Accept any alphanumeric string of reasonable length (for flexibility)
    if (/^[a-zA-Z0-9_-]{6,36}$/.test(cleaned)) return true;
    
    return false;
  }

  // Get token from memory or storage
  getToken() {
    if (!this.token) {
      this.initializeFromStorage();
    }
    
    const token = this.token || 
                  localStorage.getItem('token') || 
                  sessionStorage.getItem('token');
    
    return token;
  }

  // FIXED: Get tenant ID - always clean before returning
  getTenantId() {
    // First, try to get from token (most reliable source)
    const token = this.getToken();
    if (token) {
      const tokenTenantId = this.extractTenantIdFromToken(token);
      if (tokenTenantId && this.isValidTenantId(tokenTenantId)) {
        if (this.tenantId !== tokenTenantId) {
          console.log('🔄 Updating tenant ID from token:', tokenTenantId);
          this.tenantId = tokenTenantId;
          localStorage.setItem('tenantId', tokenTenantId);
        }
        return tokenTenantId;
      }
    }
    
    // Fallback to stored tenant ID
    if (!this.tenantId) {
      const storedTenantId = localStorage.getItem('tenantId') || 
                             sessionStorage.getItem('tenantId');
      if (storedTenantId) {
        this.tenantId = this.cleanTenantId(storedTenantId);
      }
    }
    
    // Clean before returning
    const cleanedTenantId = this.tenantId ? this.cleanTenantId(this.tenantId) : null;
    
    console.log('🔐 Retrieved tenant ID:', cleanedTenantId || 'none');
    
    return cleanedTenantId;
  }

  // Get user ID from memory or storage
  getUserId() {
    if (!this.userId) {
      this.initializeFromStorage();
    }
    return this.userId || localStorage.getItem('userId') || sessionStorage.getItem('userId');
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    const tenantId = this.getTenantId();
    return !!(token && tenantId);
  }

  // Save auth data consistently
  saveAuthData(token, tenantId, userId) {
    console.log('💾 Saving auth data');
    
    // If token provided, extract tenant ID from it (most reliable)
    if (token) {
      const tokenTenantId = this.extractTenantIdFromToken(token);
      if (tokenTenantId) {
        tenantId = tokenTenantId;
        console.log('🔐 Using tenant ID from token:', tenantId);
      }
    }
    
    // Clean tenant ID before saving
    if (tenantId) {
      tenantId = this.cleanTenantId(tenantId);
    }
    
    // Update memory
    this.token = token;
    this.tenantId = tenantId;
    this.userId = userId;
    
    // Save to localStorage
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('sessionToken', token);
    }
    if (tenantId) {
      localStorage.setItem('tenantId', tenantId);
    }
    if (userId) {
      localStorage.setItem('userId', userId);
    }
    
    console.log('✅ Auth data saved');
    return true;
  }

  // Update session data
  updateSession(sessionData) {
    if (sessionData?.token) {
      const tokenTenantId = this.extractTenantIdFromToken(sessionData.token);
      const tenantId = tokenTenantId || sessionData.tenantId;
      this.saveAuthData(sessionData.token, tenantId, sessionData.user?.id);
      return true;
    }
    return false;
  }

  // FIXED: Get headers for API requests - ensure clean tenant ID
  getAuthHeaders() {
    const token = this.getToken();
    let tenantId = this.getTenantId();
    
    // Final cleaning of tenant ID
    if (tenantId) {
      tenantId = this.cleanTenantId(tenantId);
    }
    
    if (!token) {
      console.error('❌ No token available for auth headers');
      const error = new Error('Authentication required - missing token');
      error.code = 'AUTH_REQUIRED';
      throw error;
    }
    
    if (!tenantId) {
      console.error('❌ No tenant ID available for auth headers');
      const error = new Error('Authentication required - missing tenant ID');
      error.code = 'AUTH_REQUIRED';
      throw error;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json'
    };

    console.log('🔐 Auth Headers:', {
      token: '***' + token.slice(-10),
      tenantId: tenantId,
      tenantIdLength: tenantId.length
    });

    return headers;
  }

  // Force sync tenant ID from token
  syncTenantIdFromToken() {
    const token = this.getToken();
    if (token) {
      const tokenTenantId = this.extractTenantIdFromToken(token);
      if (tokenTenantId) {
        this.tenantId = tokenTenantId;
        localStorage.setItem('tenantId', tokenTenantId);
        console.log('✅ Tenant ID synced from token:', tokenTenantId);
        return tokenTenantId;
      }
    }
    return null;
  }

  // Logout - clear all auth data
  logout() {
    console.log('🔐 Logging out');
    
    this.token = null;
    this.tenantId = null;
    this.userId = null;
    
    const itemsToRemove = [
      'token', 'tenantId', 'userId', 'auth_token', 'tenant_id', 'user_id',
      'sessionToken', 'userSession', 'redirectAfterLogin', 'recentPages'
    ];
    
    itemsToRemove.forEach(item => {
      localStorage.removeItem(item);
      sessionStorage.removeItem(item);
    });
    
    if (typeof window !== 'undefined') {
      window.sessionToken = null;
      window.sessionUser = null;
      window.tenantId = null;
    }
    
    console.log('✅ Logged out');
  }

  // Validate current session
  validateSession() {
    const token = this.getToken();
    const tenantId = this.getTenantId();
    
    if (!token) {
      return { isValid: false, reason: 'Missing token' };
    }
    
    if (!tenantId) {
      return { isValid: false, reason: 'Missing tenant ID' };
    }
    
    if (!this.isValidTenantId(tenantId)) {
      return { isValid: false, reason: 'Invalid tenant ID format: ' + tenantId };
    }
    
    return { isValid: true, tenantId: tenantId };
  }

  // Debug method
  debugAuth() {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    const tokenTenantId = this.extractTenantIdFromToken(this.getToken());
    
    console.log('🔍 AuthService Debug:');
    console.log('Stored Tenant ID:', tenantId, '| Length:', tenantId?.length);
    console.log('Token Tenant ID:', tokenTenantId, '| Length:', tokenTenantId?.length);
    console.log('Is Valid (Stored):', tenantId ? this.isValidTenantId(tenantId) : false);
    console.log('Is Valid (Token):', tokenTenantId ? this.isValidTenantId(tokenTenantId) : false);
    console.log('Session:', this.validateSession());
  }
}

export default new AuthService();