// config/db.js
import mongoose from "mongoose";

/**
 * Comprehensive database configuration supporting both MongoDB and Firebase
 * with enhanced error handling and connection management
 */
class DatabaseManager {
  constructor() {
    this.mongoConnection = null;
    this.firebaseConfig = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  /**
   * Establishes MongoDB connection using Mongoose with automatic retries
   */
  async connectMongoDB() {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error("❌ MongoDB connection URI is missing.");
      throw new Error("MongoDB connection URI not found in environment variables");
    }

    try {
      console.log("🔗 Connecting to MongoDB...");

      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        autoIndex: process.env.NODE_ENV !== 'production',
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        family: 4,
      });

      this.mongoConnection = conn;
      this.isConnected = true;
      this.retryCount = 0;

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`📂 Database: ${conn.connection.name}`);
      console.log(`⚡ Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

      // Create essential indexes for finance application
      await this.createIndexes();
      
      return conn;
    } catch (error) {
      console.error("❌ MongoDB Connection Error:", error.message);
      this.isConnected = false;

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
        console.log(`🔄 Retrying MongoDB connection in ${retryDelay/1000} seconds... (Attempt ${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.connectMongoDB(), retryDelay);
      } else {
        console.error("❌ Max retry attempts reached. Please check your database configuration.");
        throw error;
      }
    }
  }

  /**
   * Create essential indexes for finance data
   */
  async createIndexes() {
    try {
      const db = mongoose.connection.db;
      
      // User indexes
      await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });
      await db.collection("users").createIndex({ tenantId: 1 });
      await db.collection("users").createIndex({ createdAt: 1 });
      
      // Finance data indexes
      await db.collection("transactions").createIndex({ userId: 1, date: -1 });
      await db.collection("transactions").createIndex({ type: 1, date: -1 });
      await db.collection("transactions").createIndex({ category: 1 });
      await db.collection("transactions").createIndex({ date: -1 });
      
      // Sales data indexes (for sales features)
      await db.collection("sales").createIndex({ userId: 1, date: -1 });
      await db.collection("sales").createIndex({ platform: 1, date: -1 });
      await db.collection("sales").createIndex({ product: 1 });
      
      // Dashboard summary indexes
      await db.collection("dashboard_summary").createIndex({ userId: 1 }, { unique: true });
      
      // Budget indexes
      await db.collection("budgets").createIndex({ userId: 1, month: -1 });
      
      console.log("✅ Database indexes created successfully");
    } catch (indexError) {
      console.warn("⚠️ Index creation warning:", indexError.message);
    }
  }

  /**
   * Initialize Firebase configuration for client-side usage
   */
  initializeFirebase() {
    // For your current setup, Firebase might not be configured
    // This provides a graceful fallback
    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    };

    // Validate Firebase config - if not configured, return null gracefully
    const isValid = this.validateFirebaseConfig(firebaseConfig);
    
    if (isValid) {
      this.firebaseConfig = firebaseConfig;
      console.log("✅ Firebase configuration loaded successfully");
      return firebaseConfig;
    } else {
      console.log("ℹ️  Firebase not configured - running with MongoDB only");
      return null;
    }
  }

  /**
   * Validate Firebase configuration
   */
  validateFirebaseConfig(config) {
    const requiredFields = [
      'apiKey',
      'authDomain', 
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId'
    ];

    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      console.log('ℹ️  Firebase not fully configured - optional for finance app');
      return false;
    }
    
    return true;
  }

  /**
   * Get database configuration for client components
   */
  getClientConfig(userId, appId) {
    const firebaseConfig = this.initializeFirebase();
    
    return {
      // MongoDB configuration (for server-side)
      mongo: {
        connected: this.isConnected,
        url: process.env.MONGO_URI ? 'Configured' : 'Not configured'
      },
      
      // Firebase configuration (for client-side) - optional
      firebase: firebaseConfig,
      
      // Application identifiers
      userId: userId,
      appId: appId || 'finance-app',
      
      // Status
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production'
    };
  }

  /**
   * Health check for database connections
   */
  async healthCheck() {
    const mongoStatus = this.isConnected ? 'healthy' : 'disconnected';
    const firebaseStatus = this.firebaseConfig ? 'configured' : 'not configured';
    
    return {
      status: this.isConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      databases: {
        mongodb: {
          status: mongoStatus,
          readyState: this.mongoConnection?.connection?.readyState || 0,
          database: this.mongoConnection?.connection?.name || 'financeapp'
        },
        firebase: {
          status: firebaseStatus,
          configured: !!this.firebaseConfig
        }
      },
      services: {
        deepseek: process.env.DEEPSEEK_API_KEY ? 'configured' : 'not configured',
        news: process.env.NEWS_API_KEY ? 'configured' : 'not configured',
        eodhd: process.env.EODHD_API_KEY ? 'configured' : 'not configured',
        fred: process.env.FRED_API_KEY ? 'configured' : 'not configured'
      }
    };
  }

  /**
   * Close database connections gracefully
   */
  async disconnect() {
    try {
      if (this.mongoConnection) {
        await mongoose.connection.close();
        console.log("🛑 MongoDB connection closed");
      }
      this.isConnected = false;
    } catch (error) {
      console.error("❌ Error closing database connections:", error.message);
    }
  }

  /**
   * Get MongoDB connection for direct database operations
   */
  getMongoConnection() {
    if (!this.isConnected) {
      throw new Error("MongoDB is not connected");
    }
    return this.mongoConnection;
  }

  /**
   * Check if database is ready
   */
  isReady() {
    return this.isConnected;
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// --- Mongoose connection event listeners ---
mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB");
  databaseManager.isConnected = true;
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err.message);
  databaseManager.isConnected = false;
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ Mongoose disconnected. Attempting to reconnect...");
  databaseManager.isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ Mongoose reconnected to MongoDB');
  databaseManager.isConnected = true;
});

// Graceful shutdown handlers
const gracefulShutdown = async () => {
  console.log('🛑 Received shutdown signal, closing database connections...');
  await databaseManager.disconnect();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // For nodemon

// Uncaught exception handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Export both the singleton instance and the class
export default databaseManager;
export { DatabaseManager };