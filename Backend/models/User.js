// models/User.js - UPDATED WITH EMAIL VERIFICATION
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  password: { 
    type: String, 
    required: function() {
      return this.authMethod === 'email';
    },
    select: false,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  tenantId: { 
    type: String, 
  },
  companyName: {
    type: String,
    trim: true
  },
  userType: {
    type: String,
    enum: ['business', 'family', 'individual'],
    default: 'individual'
  },
  // Email verification fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  verificationAttempts: {
    type: Number,
    default: 0
  },
  lastVerificationAttempt: Date,
  
  authMethod: {
    type: String,
    enum: ['email', 'google', 'demo'],
    default: 'email'
  },
  googleId: {
    type: String
  },
  photoUrl: String,
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isDemoAccount: {
    type: Boolean,
    default: false
  },
  // Security fields
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.authMethod !== 'email' || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChange = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

// Increment verification attempts
userSchema.methods.incrementVerificationAttempts = function() {
  this.verificationAttempts += 1;
  this.lastVerificationAttempt = new Date();
};

// Reset verification attempts
userSchema.methods.resetVerificationAttempts = function() {
  this.verificationAttempts = 0;
  this.lastVerificationAttempt = undefined;
};

// Check if user can request another OTP
userSchema.methods.canRequestOtp = function() {
  if (this.verificationAttempts >= 5) {
    const lastAttempt = this.lastVerificationAttempt;
    if (lastAttempt && Date.now() - lastAttempt < 15 * 60 * 1000) { // 15 minutes
      return false;
    }
    this.resetVerificationAttempts();
  }
  return true;
};

// Update lastLogin on successful authentication
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginAttempts = 0; // Reset login attempts on successful login
  await this.save({ validateBeforeSave: false });
};

// Increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  this.loginAttempts += 1;
  
  if (this.loginAttempts >= 5 && !this.isLocked) {
    // Lock account for 30 minutes
    this.lockUntil = Date.now() + 30 * 60 * 1000;
  }
  
  await this.save({ validateBeforeSave: false });
};

// Generate tenant ID after user is created
userSchema.post('save', async function(doc, next) {
  try {
    if (!doc.tenantId) {
      let tenantId;
      let isUnique = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (!isUnique && attempts < MAX_ATTEMPTS) {
        tenantId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingUser = await mongoose.model('User').findOne({ tenantId });
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        doc.tenantId = 'fallback-' + doc._id.toString().substring(0,6);
      } else {
        doc.tenantId = tenantId;
      }
      
      await mongoose.model('User').updateOne({ _id: doc._id }, { tenantId: doc.tenantId });
    }
    next();
  } catch (error) {
    console.error('Error generating tenant ID in post-save hook:', error);
    next(error);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    if (this.authMethod !== 'email' || !this.password) {
      console.log('Attempted password match for non-email auth user ' + this.email);
      return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Check if password needs to be changed
userSchema.methods.passwordNeedsChange = function() {
  const ninetyDays = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
  return Date.now() - this.lastPasswordChange > ninetyDays;
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ tenantId: 1 }, { unique: true, sparse: true });
userSchema.index({ authMethod: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ emailVerificationExpires: 1 }, { expireAfterSeconds: 0 });
userSchema.index({ lockUntil: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', userSchema);
export default User;