import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['stocks', 'gold', 'mutual_funds', 'bonds', 'crypto', 'other']
  },
  symbol: {
    type: String,
    required: function() {
      return this.type === 'stocks' || this.type === 'crypto';
    }
  },
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  units: {
    type: Number,
    required: function() {
      return this.type === 'stocks' || this.type === 'gold' || this.type === 'mutual_funds';
    }
  },
  pricePerUnit: {
    type: Number,
    required: function() {
      return this.units > 0;
    }
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['buy', 'sell', 'dividend', 'interest']
  },
  status: {
    type: String,
    default: 'completed',
    enum: ['pending', 'completed', 'failed', 'cancelled']
  },
  notes: {
    type: String,
    maxlength: 500
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient queries
investmentSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
investmentSchema.index({ tenantId: 1, type: 1, createdAt: -1 });

export default mongoose.model('Investment', investmentSchema);