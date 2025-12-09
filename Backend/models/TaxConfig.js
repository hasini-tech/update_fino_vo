// backend/models/TaxConfig.js
import mongoose from 'mongoose';

const TaxBracketSchema = new mongoose.Schema({
  range: String,
  rate: Number,
  description: String,
  min: Number,
  max: Number,
  slab: String
}, { _id: false });

const TaxTypeSchema = new mongoose.Schema({
  name: String,
  code: String,
  defaultRate: Number,
  description: String,
  isActive: { type: Boolean, default: true }
}, { _id: false });

const TaxConfigSchema = new mongoose.Schema({
  tenantId: { type: String, required: false },
  source: { type: String, default: 'default' },
  financialYear: String,
  taxBrackets: [TaxBracketSchema],
  deductions: { type: Object, default: {} },
  cess: { type: Number, default: 0.04 },
  taxTypes: [TaxTypeSchema],
  regime: { type: String, enum: ['old', 'new'], default: 'new' },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const TaxConfig = mongoose.model('TaxConfig', TaxConfigSchema);
export default TaxConfig;