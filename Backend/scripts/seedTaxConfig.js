// backend/scripts/seedTaxConfig.js
import mongoose from 'mongoose';
import TaxConfig from '../models/TaxConfig.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set in environment. Set it before running this script.');
  process.exit(1);
}

const sampleConfig = {
  financialYear: '2025-2026',
  source: 'Seeded Default',
  taxBrackets: [
    { range: 'Up to ₹3,00,000', rate: 0, min: 0, max: 300000, slab: '0-3L' },
    { range: '₹3,00,001 - ₹6,00,000', rate: 5, min: 300001, max: 600000, slab: '3L-6L' },
    { range: '₹6,00,001 - ₹9,00,000', rate: 10, min: 600001, max: 900000, slab: '6L-9L' },
    { range: '₹9,00,001 - ₹12,00,000', rate: 15, min: 900001, max: 1200000, slab: '9L-12L' },
    { range: '₹12,00,001 - ₹15,00,000', rate: 20, min: 1200001, max: 1500000, slab: '12L-15L' },
    { range: 'Above ₹15,00,000', rate: 30, min: 1500001, max: null, slab: '15L+' }
  ],
  deductions: {
    standard: 75000,
    section80C: 150000,
    section80D: 25000,
    nps: 50000
  },
  cess: 0.04,
  taxTypes: [
    { name: 'GST', code: 'GST', defaultRate: 18, description: 'Goods & Services Tax' },
    { name: 'Income Tax', code: 'INCOME_TAX', defaultRate: 0, description: 'Personal income tax slabs' },
    { name: 'TDS', code: 'TDS', defaultRate: 10, description: 'Tax deducted at source' },
    { name: 'Professional Tax', code: 'PROF_TAX', defaultRate: 2, description: 'State professional tax' }
  ]
};

const run = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected');

    // Upsert global (no tenantId) tax config
    const existing = await TaxConfig.findOne({ tenantId: { $exists: false } });
    if (existing) {
      Object.assign(existing, sampleConfig, { lastUpdated: new Date() });
      await existing.save();
      console.log('♻️ Updated existing global TaxConfig:', existing._id);
    } else {
      const cfg = new TaxConfig(Object.assign({}, sampleConfig));
      await cfg.save();
      console.log('✨ Created global TaxConfig:', cfg._id);
    }

    console.log('✅ Seed completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message || err);
    process.exit(1);
  }
};

run();
