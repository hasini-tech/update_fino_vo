import mongoose from 'mongoose';

const marketDataSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['stock', 'gold', 'index', 'crypto', 'mutual_fund']
  },
  price: {
    type: Number,
    required: true
  },
  change: {
    type: Number,
    default: 0
  },
  changePercent: {
    type: Number,
    default: 0
  },
  volume: {
    type: Number,
    default: 0
  },
  high: {
    type: Number
  },
  low: {
    type: Number
  },
  open: {
    type: Number
  },
  previousClose: {
    type: Number
  },
  marketCap: {
    type: Number
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
marketDataSchema.index({ tenantId: 1, symbol: 1, type: 1 }, { unique: true });
marketDataSchema.index({ lastUpdated: -1 });

export default mongoose.model('MarketData', marketDataSchema);