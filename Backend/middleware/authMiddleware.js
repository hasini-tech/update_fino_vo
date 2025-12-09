import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secure_jwt_secret_key_2024_finovo_app_secure';

// Helper function to clean tenant ID - remove hidden characters
const cleanTenantId = (tenantId) => {
  if (!tenantId) return null;
  
  // Handle object tenant IDs (e.g., MongoDB ObjectId objects)
  if (typeof tenantId === 'object') {
    tenantId = tenantId._id || tenantId.id || tenantId.toString();
  }
  
  // Convert to string and trim
  let cleaned = String(tenantId).trim();
  
  // If there are commas (multiple headers concatenated), take the first value
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[0].trim();
  }
  
  // Remove non-printable characters (keep ASCII 32-126)
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');
  
  // Remove quotes
  cleaned = cleaned.replace(/['"]/g, '');
  
  // Remove whitespace
  cleaned = cleaned.replace(/\s/g, '');
  
  return cleaned;
};

// Helper function to validate tenant ID format - ACCEPTS MULTIPLE FORMATS
const isValidTenantId = (tenantId) => {
  if (!tenantId) return false;
  
  const cleaned = cleanTenantId(tenantId);
  if (!cleaned) return false;
  
  // Accept 6-digit format
  if (/^\d{6}$/.test(cleaned)) return true;
  
  // Accept MongoDB ObjectId format (24 hex characters)
  if (/^[a-fA-F0-9]{24}$/.test(cleaned)) return true;
  
  // Accept fallback format
  if (cleaned.startsWith('fallback-')) return true;
  
  // Accept UUID format
  if (/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(cleaned)) return true;
  
  // Accept any alphanumeric string 6-36 chars (flexible)
  if (/^[a-zA-Z0-9_-]{6,36}$/.test(cleaned)) return true;
  
  return false;
};

// Helper function to extract tenant ID from request
const extractTenantId = (req) => {
  // Check all possible header variations
  const headerVariations = [
    'tenant-id',
    'x-tenant-id',
    'Tenant-Id',
    'X-Tenant-ID',
    'TENANT-ID',
    'X-TENANT-ID'
  ];
  
  for (const header of headerVariations) {
    const value = req.headers[header.toLowerCase()] || req.headers[header];
    if (value) {
      const cleaned = cleanTenantId(value);
      if (cleaned) {
        console.log(`📋 Found tenant ID in header '${header}':`, cleaned);
        return cleaned;
      }
    }
  }
  
  // Check query params
  if (req.query && req.query.tenantId) {
    const cleaned = cleanTenantId(req.query.tenantId);
    if (cleaned) {
      console.log('📋 Found tenant ID in query:', cleaned);
      return cleaned;
    }
  }
  
  // Check body
  if (req.body && req.body.tenantId) {
    const cleaned = cleanTenantId(req.body.tenantId);
    if (cleaned) {
      console.log('📋 Found tenant ID in body:', cleaned);
      return cleaned;
    }
  }
  
  return null;
};

// Protect middleware - requires valid JWT token
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Check x-auth-token header
    if (!token && req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.userId || decoded.id).select('-password');
      
      if (!user) {
        console.log('❌ User not found for token');
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      req.user = user;
      
      // Set tenant ID from token or user - CLEANED
      if (decoded.tenantId) {
        req.tenantId = cleanTenantId(decoded.tenantId);
      } else if (user.tenantId) {
        req.tenantId = cleanTenantId(user.tenantId);
      }
      
      console.log('✅ Token verified for user:', user.email, 'Tenant:', req.tenantId);
      next();
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('❌ Protect middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional auth - doesn't require token but will use it if present
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId || decoded.id).select('-password');
        
        if (user) {
          req.user = user;
          if (decoded.tenantId) {
            req.tenantId = cleanTenantId(decoded.tenantId);
          } else if (user.tenantId) {
            req.tenantId = cleanTenantId(user.tenantId);
          }
        }
      } catch (jwtError) {
        console.log('⚠️ Optional auth token invalid:', jwtError.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('⚠️ Optional auth error:', error);
    next();
  }
};

// Tenant middleware - extracts and validates tenant ID
// Tenant middleware - extracts and validates tenant ID (MORE FLEXIBLE)
export const tenantMiddleware = (req, res, next) => {
  try {
    // If tenant ID already set by protect middleware, validate it
    if (req.tenantId) {
      const cleaned = cleanTenantId(req.tenantId);
      if (isValidTenantId(cleaned)) {
        req.tenantId = cleaned;
        console.log('✅ Using tenant ID from auth:', req.tenantId);
        return next();
      }
    }
    
    // Try to extract from headers/query/body
    const extractedTenantId = extractTenantId(req);
    
    if (extractedTenantId) {
      if (isValidTenantId(extractedTenantId)) {
        req.tenantId = extractedTenantId;
        console.log('✅ Tenant ID validated:', req.tenantId);
        return next();
      } else {
        // Try to extract 6 digits from invalid tenant ID
        const digitsOnly = extractedTenantId.replace(/\D/g, '');
        if (digitsOnly.length === 6) {
          req.tenantId = digitsOnly;
          console.log('✅ Extracted 6-digit tenant ID:', req.tenantId);
          return next();
        }
        
        // In development, use fallback instead of rejecting
        if (process.env.NODE_ENV === 'development') {
          req.tenantId = 'fallback-' + Date.now().toString(36);
          console.warn('⚠️ Invalid tenant ID, using fallback:', req.tenantId);
          return next();
        }
        
        console.error('❌ Invalid tenant ID format:', extractedTenantId, '| Length:', extractedTenantId.length);
        return res.status(400).json({
          success: false,
          message: "Invalid Tenant ID format. Accepted: 6-digit, MongoDB ObjectId, UUID, or fallback-*",
          received: extractedTenantId,
          length: extractedTenantId.length
        });
      }
    }
    
    // No tenant ID found - generate fallback for dev, reject in prod
    if (process.env.NODE_ENV === 'development') {
      req.tenantId = 'fallback-' + Date.now().toString(36);
      console.warn('⚠️ No tenant ID provided, using fallback:', req.tenantId);
      return next();
    }
    
    console.error('❌ No tenant ID provided');
    return res.status(400).json({
      success: false,
      message: 'Tenant ID is required'
    });
  } catch (error) {
    console.error('❌ Tenant middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing tenant ID'
    });
  }
};

export default { protect, optionalAuth, tenantMiddleware };