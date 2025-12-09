// scripts/cleanupDuplicates.js
// Run this script ONCE to clean up duplicate entries
// Command: node scripts/cleanupDuplicates.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const cleanupDuplicates = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop the problematic indexes if they exist
    try {
      console.log('🗑️  Dropping old indexes...');
      await db.collection('users').dropIndex('companyId_1');
      console.log('✅ Dropped companyId index');
    } catch (err) {
      console.log('ℹ️  CompanyId index does not exist or already dropped');
    }

    // Optional: Clear all users (CAUTION: This deletes all user data!)
    // Uncomment the lines below ONLY if you want to start fresh
    /*
    console.log('⚠️  WARNING: Clearing all users...');
    const result = await db.collection('users').deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} users`);
    */

    // Recreate the indexes properly
    console.log('📝 Creating new indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ companyId: 1 }, { unique: true });
    console.log('✅ Indexes created successfully');

    console.log('🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
};

cleanupDuplicates();