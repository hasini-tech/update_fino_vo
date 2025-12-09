import mongoose from 'mongoose';

const userIncomeSchema = new mongoose.Schema({
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
  monthlyIncome: {
    type: Number,
    required: true,
    min: 0
  },
  monthlyExpenses: {
    type: Number,
    default: 0,
    min: 0
  },
  savings: {
    type: Number,
    default: 0,
    min: 0
  },
  riskTolerance: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  investmentExperience: {
    type: String,
    enum: ['beginner', 'intermediate', 'expert'],
    default: 'beginner'
  },
  age: {
    type: Number,
    min: 18,
    max: 100
  },
  financialGoals: [{
    type: String,
    enum: ['retirement', 'wealth_creation', 'education', 'house', 'emergency', 'other']
  }],
  investmentHorizon: {
    type: String,
    enum: ['short_term', 'medium_term', 'long_term'],
    default: 'medium_term'
  }
}, {
  timestamps: true
});

// Compound index
userIncomeSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

export default mongoose.model('UserIncome', userIncomeSchema);