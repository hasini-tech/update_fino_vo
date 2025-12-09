// ========================================================
// ✅ FINOVO BACKEND SERVER (COMPLETE FIXED VERSION)
// ========================================================

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from 'node-cron';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// === Import Models ===
import User from "./models/User.js";
import Bill from "./models/Bill.js";
import Settings from "./models/Settings.js";
import MoneyTransaction from "./models/moneyTransaction.js";
import Otp from "./models/Otp.js";

// === Import Routes ===
import incomeRoutes from "./routes/incomeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactions.js";
import syncRoutes from './routes/syncRoutes.js';
import taxRoutes from "./routes/taxRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";
import chatbotRouter from "./routes/chatbot.js";
import aiSuggestionsRouter from "./routes/aiSuggestions.js";
import marketRoutes from "./routes/marketRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";
import billRoutes from './routes/billRoutes.js';
import moneyRoutes from './routes/moneyRoutes.js';
import schemesRoute from "./routes/Scheme.js";

// === Import Middleware ===
import { protect, optionalAuth } from "./middleware/authMiddleware.js";

// ========================================================
// ✅ LOAD ENVIRONMENT VARIABLES FIRST
// ========================================================
dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("❌ FATAL ERROR: MONGO_URI is not defined in the .env file.");
  process.exit(1);
}

const app = express();

// === Environment Variables ===
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secure_jwt_secret_key_2024_finovo_app_secure';

// ========================================================
// ✅ CORS CONFIGURATION
// ========================================================
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    const originDomain = origin.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
    
    console.log("CORS check - Origin: " + origin);
    
    const allowedDomains = [
      "localhost:3000",
      "localhost:3001", 
      "localhost:5173",
      "localhost:5000",
      "localhost:5173",
      "127.0.0.1:3000",
      "127.0.0.1:5173",
      "127.0.0.1:5000",
      "personalfinance.netlify.app",
      "finovo-app.netlify.app"
    ];
    
    const isAllowed = allowedDomains.includes(originDomain) || 
                      originDomain.endsWith('.netlify.app') || 
                      originDomain.endsWith('.vercel.app') ||
                      originDomain.startsWith('localhost') ||
                      originDomain.startsWith('127.0.0.1');
    
    if (isAllowed) {
      console.log("✅ CORS ALLOWED: " + origin);
      return callback(null, true);
    }
    
    console.warn("⚠ CORS - Allowing anyway: " + origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Tenant-ID',
    'tenant-id',
    'X-Tenant-ID',
    'x-tenant-id',
    'X-Correlation-ID',
    'X-Client-Version',
    'x-auth-token',
    'token'
  ],
  exposedHeaders: [
    'Content-Length',
    'X-JSON',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-Correlation-ID'
  ],
  maxAge: 86400,
  optionsSuccessStatus: 200
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Handle ALL preflight OPTIONS requests
app.options('*', cors(corsOptions));

// ========================================================
// ✅ EXPLICIT CORS HEADERS FOR ALL RESPONSES
// ========================================================
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Tenant-ID, tenant-id, X-Tenant-ID, x-tenant-id, X-Correlation-ID, X-Client-Version, x-auth-token, token');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, X-JSON, X-RateLimit-Limit, X-RateLimit-Remaining, X-Correlation-ID');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    console.log("✅ OPTIONS preflight for: " + req.path);
    return res.status(200).send('OK');
  }
  
  next();
});

// ========================================================
// ✅ SECURITY MIDDLEWARE
// ========================================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false
}));

app.use(compression({ level: 6, threshold: 1024 }));

// Rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
});

app.use('/api/auth/', createRateLimit(15 * 60 * 1000, 50, "Too many authentication attempts."));
app.use('/api/', createRateLimit(15 * 60 * 1000, 1000, "Too many requests."));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ========================================================
// ✅ LOGGING SETUP
// ========================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

// Request logging
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || 'corr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  req.correlationId = correlationId;
  req.requestId = crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', req.requestId);
  
  console.log("[" + new Date().toISOString() + "] [" + correlationId + "] " + req.method + " " + req.originalUrl);
  next();
});

// Response time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl !== '/api/health') {
      console.log("[" + req.correlationId + "] " + req.method + " " + req.originalUrl + " - " + res.statusCode + " - " + duration + "ms");
    }
  });
  next();
});

app.use(morgan('combined', { 
  stream: accessLogStream,
  skip: (req) => req.originalUrl === '/api/health'
}));

// ========================================================
// ✅ GLOBAL TENANT ID MIDDLEWARE - CRITICAL FIX
// ========================================================
const extractAndValidateTenantId = (req, res, next) => {
  let tenantId = req.headers['tenant-id'] || 
                 req.headers['x-tenant-id'] || 
                 req.headers['Tenant-Id'] ||
                 req.headers['X-Tenant-ID'] ||
                 req.headers['tenantid'] ||
                 req.query.tenantId ||
                 req.body?.tenantId;
  
  console.log("🔍 [GLOBAL] Extracting tenant ID:", {
    'tenant-id': req.headers['tenant-id'],
    'x-tenant-id': req.headers['x-tenant-id'],
    'query': req.query.tenantId,
    'extracted': tenantId
  });
  
  if (tenantId) {
    tenantId = String(tenantId).trim().replace(/['"]/g, '').replace(/\s/g, '');
    
    const isValid6Digit = /^\d{6}$/.test(tenantId);
    const isValidFallback = tenantId.startsWith('fallback-');
    const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(tenantId);
    
    if (isValid6Digit || isValidFallback || isValidObjectId) {
      req.tenantId = tenantId;
      req.headers['tenant-id'] = tenantId;
      req.headers['x-tenant-id'] = tenantId;
      console.log("✅ [GLOBAL] Valid tenant ID set: " + tenantId);
    } else {
      const digitsOnly = tenantId.replace(/\D/g, '');
      if (digitsOnly.length === 6) {
        req.tenantId = digitsOnly;
        req.headers['tenant-id'] = digitsOnly;
        req.headers['x-tenant-id'] = digitsOnly;
        console.log("✅ [GLOBAL] Extracted 6-digit tenant ID: " + digitsOnly);
      } else if (NODE_ENV === 'development') {
        const fallback = 'fallback-' + Date.now().toString(36);
        req.tenantId = fallback;
        req.headers['tenant-id'] = fallback;
        req.headers['x-tenant-id'] = fallback;
        console.warn("⚠ [GLOBAL] Invalid tenant ID \"" + tenantId + "\", using fallback: " + fallback);
      }
    }
  } else if (NODE_ENV === 'development') {
    const fallback = 'fallback-' + Date.now().toString(36);
    req.tenantId = fallback;
    req.headers['tenant-id'] = fallback;
    req.headers['x-tenant-id'] = fallback;
    console.warn("⚠ [GLOBAL] No tenant ID provided, using fallback: " + fallback);
  }
  
  next();
};

app.use(extractAndValidateTenantId);

// ========================================================
// ✅ NOTIFICATION MODEL
// ========================================================
const notificationSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill", required: false },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "MoneyTransaction", required: false },
  type: { type: String, required: true, enum: ["bill_reminder", "payment_due", "overdue", "reminder", "system", "income", "expense", "investment", "tax"] },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  scheduledFor: { type: Date, default: Date.now },
  sent: { type: Boolean, default: false },
  sentAt: { type: Date },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  actionUrl: { type: String, required: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

notificationSchema.index({ tenantId: 1, scheduledFor: 1 });
notificationSchema.index({ tenantId: 1, sent: 1 });
notificationSchema.index({ tenantId: 1, read: 1 });

notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// ========================================================
// ✅ DATABASE CONNECTION
// ========================================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log("✅ MongoDB Connected: " + conn.connection.host);
    console.log("📊 Database: " + conn.connection.name);
    
    mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err));
    mongoose.connection.on('disconnected', () => console.warn('⚠ MongoDB disconnected'));
    mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// ========================================================
// ✅ NOTIFICATION FUNCTIONS
// ========================================================
const updateOverdueStatus = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await MoneyTransaction.updateMany(
      { status: 'pending', dueDate: { $lt: today } },
      { $set: { status: 'overdue', updatedAt: new Date() } }
    );
    
    console.log("✅ Updated " + result.modifiedCount + " transactions to overdue status");
  } catch (error) {
    console.error('❌ Error updating overdue status:', error);
  }
};

const checkAndMarkBillNotifications = async (tenantId) => {
  try {
    const billReminderDays = parseInt(process.env.BILL_REMINDER_DAYS || '2');
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + billReminderDays);
    targetDate.setHours(0, 0, 0, 0);
    
    const endOfTargetDay = new Date(targetDate);
    endOfTargetDay.setHours(23, 59, 59, 999);
    
    const upcomingBills = await Bill.find({
      tenantId: tenantId,
      dueDate: { $gte: targetDate, $lte: endOfTargetDay },
      paid: false,
      notificationSent: false
    });
    
    for (const bill of upcomingBills) {
      const notification = new Notification({
        tenantId: tenantId,
        billId: bill._id,
        type: 'bill_reminder',
        title: "Upcoming Bill: " + bill.name,
        message: "Your bill for \"" + bill.name + "\" of ₹" + bill.amount + " is due on " + new Date(bill.dueDate).toLocaleDateString() + ".",
        scheduledFor: new Date(),
        sent: true,
        sentAt: new Date()
      });
      await notification.save();

      bill.notificationSent = true;
      bill.lastNotificationSent = new Date();
      await bill.save();
    }
    
    return { bills: upcomingBills.length };
  } catch (error) {
    console.error('❌ Error in bill notifications:', error);
    return { bills: 0, error: error.message };
  }
};

const checkAndMarkMoneyNotifications = async (tenantId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const moneyReminderDays = parseInt(process.env.MONEY_REMINDER_DAYS || '3');

    const transactions = await MoneyTransaction.find({
      tenantId: tenantId,
      status: { $in: ['pending', 'overdue'] },
      reminderEnabled: true
    });
    
    let processed = 0;
    
    for (const transaction of transactions) {
      const dueDate = new Date(transaction.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 3600 * 24));
      
      if (daysUntilDue <= moneyReminderDays || daysUntilDue < 0) {
        const existingNotification = await Notification.findOne({
          tenantId,
          transactionId: transaction._id,
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });
        
        if (!existingNotification) {
          const actionType = transaction.type === 'borrow' ? 'You borrowed' : 'You lent';
          const preposition = transaction.type === 'borrow' ? 'from' : 'to';
          const notification = new Notification({
            tenantId,
            transactionId: transaction._id,
            type: daysUntilDue < 0 ? 'overdue' : 'reminder',
            title: "Payment " + (daysUntilDue < 0 ? 'Overdue' : 'Reminder'),
            message: actionType + " ₹" + transaction.amount + " " + preposition + " " + transaction.personName,
            scheduledFor: new Date(),
            sent: true,
            sentAt: new Date()
          });
          await notification.save();
          processed++;
        }
      }
    }
    
    return { transactions: processed };
  } catch (error) {
    console.error('❌ Error in money notifications:', error);
    return { transactions: 0, error: error.message };
  }
};

// ========================================================
// ✅ NOTIFICATION SYSTEM INITIALIZATION
// ========================================================
const initializeNotificationSystem = () => {
  if (!mongoose.connection.readyState) {
    console.warn('⚠ Notification system disabled: No database connection');
    return;
  }
  
  console.log("🔄 Initializing Notification System...");

  cron.schedule('0 * * * *', async () => {
    try {
      await updateOverdueStatus();
    } catch (error) {
      console.error('❌ Error in overdue cron:', error);
    }
  });

  cron.schedule('0 * * * *', async () => {
    try {
      const activeTenants = await Bill.distinct('tenantId', { paid: false, notificationSent: false });
      for (const tenantId of activeTenants) {
        await checkAndMarkBillNotifications(tenantId);
      }
    } catch (error) {
      console.error('❌ Error in bill notification cron:', error);
    }
  });

  cron.schedule('0 * * * *', async () => {
    try {
      const activeTenants = await MoneyTransaction.distinct('tenantId', { status: { $in: ['pending', 'overdue'] }, reminderEnabled: true });
      for (const tenantId of activeTenants) {
        await checkAndMarkMoneyNotifications(tenantId);
      }
    } catch (error) {
      console.error('❌ Error in money notification cron:', error);
    }
  });

  console.log("✅ Notification System initialized");
};

// ========================================================
// ✅ AUTH ROUTES
// ========================================================
app.post("/api/auth/quick-login", async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        email,
        name: name || email.split('@')[0],
        isVerified: true,
        authProvider: 'quick-login',
        lastLogin: new Date()
      });
      await user.save();
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, email: user.email, name: user.name, tenantId: user.tenantId },
      tenantId: user.tenantId
    });

  } catch (error) {
    console.error('❌ Quick login error:', error);
    res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
});

app.post("/api/auth/google-login", async (req, res) => {
  try {
    const { email, name, googleId, photoUrl } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    let user = await User.findOne({ $or: [{ email }, { googleId }] });
    
    if (!user) {
      user = new User({
        email,
        name: name || email.split('@')[0],
        googleId: googleId || email,
        photoUrl,
        isVerified: true,
        authProvider: 'google',
        lastLogin: new Date()
      });
      await user.save();
    } else {
      user.googleId = googleId || user.googleId;
      user.name = name || user.name;
      user.photoUrl = photoUrl || user.photoUrl;
      user.lastLogin = new Date();
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: { id: user._id, email: user.email, name: user.name, tenantId: user.tenantId, photoUrl: user.photoUrl },
      tenantId: user.tenantId
    });

  } catch (error) {
    console.error('❌ Google login error:', error);
    res.status(500).json({ success: false, message: "Google login failed", error: error.message });
  }
});

// ========================================================
// ✅ HEALTH CHECK ROUTES
// ========================================================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "✅ Finovo Backend API is running!",
    version: "4.1.0",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 60 / 60);
    const uptimeMinutes = Math.floor(uptime / 60) % 60;
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    res.status(200).json({
      success: true,
      message: "Server is running",
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      uptime: uptimeHours + "h " + uptimeMinutes + "m",
      database: { status: dbStatus },
      memory: { used: memoryUsedMB + "MB" }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Health check failed", error: error.message });
  }
});

// ========================================================
// ✅ PUBLIC ROUTES
// ========================================================
app.use("/api/auth", authRoutes);
console.log("🤖 Registering Chatbot routes at /api/chatbot");
app.use("/api/chatbot", chatbotRouter);

app.use("/api/chatbot", aiSuggestionsRouter);
app.use("/api/market-data", marketRoutes);

// ========================================================
// ✅ CUSTOM TENANT MIDDLEWARE FOR PROTECTED ROUTES
// ========================================================
const ensureTenantId = (req, res, next) => {
  const publicPaths = ['/api/auth', '/api/health', '/api/chatbot', '/api/market-data', '/'];
  const isPublic = publicPaths.some(path => req.originalUrl.startsWith(path) || req.originalUrl === path);
  
  if (isPublic) {
    return next();
  }

  if (!req.tenantId) {
    const tenantId = req.headers['tenant-id'] || req.headers['x-tenant-id'] || req.query.tenantId;
    
    if (tenantId) {
      req.tenantId = String(tenantId).trim();
    } else if (NODE_ENV === 'development') {
      req.tenantId = 'fallback-' + Date.now().toString(36);
      console.warn("⚠ [ensureTenantId] Generated fallback: " + req.tenantId);
    } else {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required. Include 'tenant-id' or 'x-tenant-id' header."
      });
    }
  }

  console.log("🏢 [ensureTenantId] Tenant ID: " + req.tenantId + " for " + req.method + " " + req.originalUrl);
  next();
};

app.use('/api', ensureTenantId);

// ========================================================
// ✅ PROTECTED ROUTES
// ========================================================
app.use("/api/income", incomeRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/investment", investmentRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/money", moneyRoutes);
app.use("/api/schemes", schemesRoute);

// ========================================================
// ✅ NOTIFICATION ROUTES
// ========================================================
app.get("/api/notifications/check", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const result = await checkAndMarkBillNotifications(tenantId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to check notifications", error: error.message });
  }
});

app.get("/api/notifications/upcoming", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const upcomingBills = await Bill.find({
      tenantId,
      dueDate: { $gte: today, $lte: sevenDaysFromNow },
      paid: false
    }).sort({ dueDate: 1 });

    res.status(200).json({ success: true, bills: upcomingBills, count: upcomingBills.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch upcoming bills", error: error.message });
  }
});

app.get("/api/notifications/list", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page = 1, limit = 20, readStatus = 'all' } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const query = { tenantId };
    if (readStatus === 'read') query.read = true;
    else if (readStatus === 'unread') query.read = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalNotifications: total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch notifications", error: error.message });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification marked as read", notification });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to mark notification as read", error: error.message });
  }
});

app.patch("/api/notifications/mark-all-read", async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const result = await Notification.updateMany(
      { tenantId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.status(200).json({ success: true, message: result.modifiedCount + " notifications marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to mark notifications as read", error: error.message });
  }
});

// ========================================================
// ✅ BILL STATISTICS ROUTE
// ========================================================
app.get("/api/bills/statistics", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const [totalBills, paidBills, unpaidBills, totalAmount, paidAmount] = await Promise.all([
      Bill.countDocuments({ tenantId }),
      Bill.countDocuments({ tenantId, paid: true }),
      Bill.countDocuments({ tenantId, paid: false }),
      Bill.aggregate([{ $match: { tenantId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Bill.aggregate([{ $match: { tenantId, paid: true } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);

    const totalAmt = totalAmount[0]?.total || 0;
    const paidAmt = paidAmount[0]?.total || 0;

    res.status(200).json({
      success: true,
      statistics: {
        totalBills,
        paidBills,
        unpaidBills,
        totalAmount: totalAmt,
        paidAmount: paidAmt,
        pendingAmount: totalAmt - paidAmt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch statistics", error: error.message });
  }
});

// ========================================================
// ✅ MONEY STATISTICS ROUTE
// ========================================================
app.get("/api/money/statistics/summary", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const [totalBorrow, totalLend, overdueCount, completedCount] = await Promise.all([
      MoneyTransaction.aggregate([{ $match: { tenantId, type: 'borrow', status: { $in: ['pending', 'overdue'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      MoneyTransaction.aggregate([{ $match: { tenantId, type: 'lend', status: { $in: ['pending', 'overdue'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      MoneyTransaction.countDocuments({ tenantId, status: 'overdue' }),
      MoneyTransaction.countDocuments({ tenantId, status: 'completed' })
    ]);

    const borrowAmt = totalBorrow[0]?.total || 0;
    const lendAmt = totalLend[0]?.total || 0;

    res.status(200).json({
      success: true,
      statistics: {
        totalBorrow: borrowAmt,
        totalLend: lendAmt,
        overdueCount,
        completedCount,
        netBalance: lendAmt - borrowAmt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch money statistics", error: error.message });
  }
});

// ========================================================
// ✅ SETTINGS ROUTES
// ========================================================
app.get("/api/settings", async (req, res) => {
  try {
    const tenantId = req.tenantId || req.query.tenantId;

    if (!tenantId) {
      return res.status(200).json({ platforms: [], tenantId: "default" });
    }

    const settings = await Settings.findOne({ tenantId }).sort({ updatedAt: -1 });
    res.status(200).json(settings || { platforms: [], tenantId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch settings", error: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { platforms, tenantId: bodyTenantId } = req.body;
    const tenantId = req.tenantId || bodyTenantId;

    if (!platforms || !Array.isArray(platforms)) {
      return res.status(400).json({ success: false, message: "Platforms array is required" });
    }

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    let settings = await Settings.findOne({ tenantId });
    if (settings) {
      settings.platforms = platforms;
      settings.updatedAt = new Date();
      settings = await settings.save();
    } else {
      settings = await Settings.create({ platforms, tenantId, createdAt: new Date(), updatedAt: new Date() });
    }

    res.status(200).json({ success: true, message: "Settings saved successfully", data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save settings", error: error.message });
  }
});

app.delete("/api/settings", async (req, res) => {
  try {
    const tenantId = req.tenantId || req.query.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const result = await Settings.deleteMany({ tenantId });
    res.status(200).json({ success: true, message: "Settings cleared", deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to clear settings", error: error.message });
  }
});

// ========================================================
// ✅ PROJECT MODEL & ROUTES
// ========================================================
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  budget: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'completed', 'on-hold', 'cancelled'], default: 'active' },
  income: [{ description: String, amount: Number, category: String, date: { type: Date, default: Date.now } }],
  expenses: [{ description: String, amount: Number, category: String, date: { type: Date, default: Date.now } }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: String, required: true, index: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

projectSchema.index({ tenantId: 1, createdBy: 1 });

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

app.post("/api/projects", protect, async (req, res) => {
  try {
    const { name, description, budget, status } = req.body;
    
    if (!name || budget === undefined) {
      return res.status(400).json({ success: false, message: "Project name and budget are required" });
    }

    const project = new Project({
      name,
      description: description || '',
      budget,
      status: status || 'active',
      createdBy: req.user.id,
      tenantId: req.tenantId
    });

    await project.save();
    res.status(201).json({ success: true, message: "Project created", data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating project", error: error.message });
  }
});

app.get("/api/projects", protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { tenantId: req.tenantId, createdBy: req.user.id, isDeleted: false };
    if (status && status !== 'all') filter.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Project.countDocuments(filter)
    ]);
    
    res.status(200).json({
      success: true,
      data: projects,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching projects", error: error.message });
  }
});

app.get("/api/projects/:id", protect, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, tenantId: req.tenantId, createdBy: req.user.id, isDeleted: false });
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching project", error: error.message });
  }
});

app.put("/api/projects/:id", protect, async (req, res) => {
  try {
    const { name, description, budget, status } = req.body;
    
    const updateData = { updatedAt: Date.now() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (budget !== undefined) updateData.budget = budget;
    if (status) updateData.status = status;
    
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId, createdBy: req.user.id, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    
    res.status(200).json({ success: true, message: "Project updated", data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating project", error: error.message });
  }
});

app.delete("/api/projects/:id", protect, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId, createdBy: req.user.id, isDeleted: false },
      { isDeleted: true, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    
    res.status(200).json({ success: true, message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting project", error: error.message });
  }
});

// ========================================================
// ✅ PROJECT INCOME/EXPENSE ROUTES
// ========================================================
app.post("/api/projects/:id/income", protect, async (req, res) => {
  try {
    const { description, amount, category } = req.body;
    
    if (!description || !amount) {
      return res.status(400).json({ success: false, message: "Description and amount are required" });
    }

    const project = await Project.findOne({ _id: req.params.id, tenantId: req.tenantId, createdBy: req.user.id, isDeleted: false });
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.income.push({ description, amount, category: category || 'general', date: new Date() });
    project.updatedAt = new Date();
    await project.save();

    res.status(201).json({ success: true, message: "Income added", data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding income", error: error.message });
  }
});

app.post("/api/projects/:id/expense", protect, async (req, res) => {
  try {
    const { description, amount, category } = req.body;
    
    if (!description || !amount) {
      return res.status(400).json({ success: false, message: "Description and amount are required" });
    }

    const project = await Project.findOne({ _id: req.params.id, tenantId: req.tenantId, createdBy: req.user.id, isDeleted: false });
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    project.expenses.push({ description, amount, category: category || 'general', date: new Date() });
    project.updatedAt = new Date();
    await project.save();

    res.status(201).json({ success: true, message: "Expense added", data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding expense", error: error.message });
  }
});

// ========================================================
// ✅ PROJECT STATISTICS ROUTE
// ========================================================
app.get("/api/projects/:id/statistics", protect, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, tenantId: req.tenantId, createdBy: req.user.id, isDeleted: false });
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const totalIncome = project.income.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalExpenses = project.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const budgetUsed = (totalExpenses / project.budget) * 100;

    res.status(200).json({
      success: true,
      statistics: {
        budget: project.budget,
        totalIncome,
        totalExpenses,
        netProfit,
        budgetUsed: Math.round(budgetUsed * 100) / 100,
        budgetRemaining: project.budget - totalExpenses,
        incomeCount: project.income.length,
        expenseCount: project.expenses.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching project statistics", error: error.message });
  }
});

// ========================================================
// ✅ DASHBOARD SUMMARY ROUTE
// ========================================================
app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalBills,
      unpaidBills,
      pendingTransactions,
      overdueTransactions,
      recentNotifications
    ] = await Promise.all([
      Bill.countDocuments({ tenantId }),
      Bill.countDocuments({ tenantId, paid: false }),
      MoneyTransaction.countDocuments({ tenantId, status: 'pending' }),
      MoneyTransaction.countDocuments({ tenantId, status: 'overdue' }),
      Notification.find({ tenantId, read: false }).sort({ createdAt: -1 }).limit(5)
    ]);

    res.status(200).json({
      success: true,
      summary: {
        bills: { total: totalBills, unpaid: unpaidBills },
        transactions: { pending: pendingTransactions, overdue: overdueTransactions },
        notifications: { unread: recentNotifications.length, recent: recentNotifications }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch dashboard summary", error: error.message });
  }
});

// ========================================================
// ✅ SEARCH ROUTE
// ========================================================
app.get("/api/search", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { q, type = 'all' } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const results = {};

    if (type === 'all' || type === 'bills') {
      results.bills = await Bill.find({
        tenantId,
        $or: [{ name: searchRegex }, { category: searchRegex }, { notes: searchRegex }]
      }).limit(10).lean();
    }

    if (type === 'all' || type === 'transactions') {
      results.transactions = await MoneyTransaction.find({
        tenantId,
        $or: [{ personName: searchRegex }, { description: searchRegex }, { notes: searchRegex }]
      }).limit(10).lean();
    }

    res.status(200).json({ success: true, query: q, results });
  } catch (error) {
    res.status(500).json({ success: false, message: "Search failed", error: error.message });
  }
});

// ========================================================
// ✅ EXPORT DATA ROUTE
// ========================================================
app.get("/api/export/:type", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { type } = req.params;
    const { format = 'json', startDate, endDate } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Tenant ID is required" });
    }

    let data;
    const dateFilter = {};
    
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = { tenantId };
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter;
    }

    switch (type) {
      case 'bills':
        data = await Bill.find(query).lean();
        break;
      case 'transactions':
        data = await MoneyTransaction.find(query).lean();
        break;
      case 'notifications':
        data = await Notification.find(query).lean();
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid export type. Use: bills, transactions, or notifications" });
    }

    if (format === 'csv') {
      if (data.length === 0) {
        return res.status(200).send('No data to export');
      }
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(item => Object.values(item).map(v => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return JSON.stringify(v).replace(/,/g, ';');
        return String(v).replace(/,/g, ';');
      }).join(','));
      
      const csv = [headers, ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=' + type + '-export.csv');
      return res.status(200).send(csv);
    }

    res.status(200).json({ success: true, type, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Export failed", error: error.message });
  }
});

// ========================================================
// ✅ 404 HANDLER
// ========================================================
app.use((req, res) => {
  console.log("❌ 404 Not Found: " + req.method + " " + req.originalUrl);
  res.status(404).json({
    success: false,
    message: "Route not found: " + req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// ========================================================
// ✅ GLOBAL ERROR HANDLER
// ========================================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  
  const errorLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack
  }) + '\n';
  
  errorLogStream.write(errorLog);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: "Validation Error: " + errors.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: field + " already exists" });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };
  
  if (NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
});

// ========================================================
// ✅ SERVER INITIALIZATION
// ========================================================
const startServer = async () => {
  try {
    console.log('🚀 Starting Finovo Backend Server...');
    console.log('🌍 Environment: ' + NODE_ENV);
    
    await connectDB();
    initializeNotificationSystem();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║           🚀 FINOVO BACKEND STARTED                    ║');
      console.log('║   Port: ' + PORT + '                                          ║');
      console.log('║   Environment: ' + NODE_ENV + '                              ║');
      console.log('║   Database: ✅ Connected                               ║');
      console.log('║   Notifications: ✅ Active                             ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('✅ API: http://localhost:' + PORT + '/api');
      console.log('✅ Health: http://localhost:' + PORT + '/api/health');
      console.log('✅ Income: http://localhost:' + PORT + '/api/income');
      console.log('✅ Transactions: http://localhost:' + PORT + '/api/transactions');
    });

    const gracefulShutdown = async (signal) => {
      console.log('\n⚠ Received ' + signal + '. Shutting down...');
      
      server.close(async () => {
        console.log('✅ HTTP server closed.');
        
        try {
          await mongoose.connection.close();
          console.log('✅ MongoDB connection closed.');
          accessLogStream.end();
          errorLogStream.end();
        } catch (dbError) {
          console.error('❌ Error closing connections:', dbError);
        }
        
        process.exit(0);
      });

      setTimeout(() => {
        console.error('❌ Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;