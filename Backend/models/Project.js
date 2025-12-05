import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const financialProgressSchema = new mongoose.Schema({
  totalBudget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
  },
  remaining: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
});

const progressDataSchema = new mongoose.Schema({
  timeline: [{
    date: Date,
    description: String,
    type: String
  }],
  milestones: [{
    title: String,
    targetDate: Date,
    completed: Boolean,
    completedDate: Date
  }],
  financialProgress: financialProgressSchema,
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  budget: {
    type: Number,
    required: [true, 'Project budget is required'],
    min: [0, 'Budget must be positive']
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold', 'cancelled'],
    default: 'active'
  },
  income: [transactionSchema],
  expenses: [transactionSchema],
  tax: [transactionSchema],
  progressData: progressDataSchema,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: String,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps and auto-calculate progress
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate financial progress
  const totalIncome = this.income.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpenses = this.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalTax = this.tax.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  if (!this.progressData) {
    this.progressData = {};
  }
  
  if (!this.progressData.financialProgress) {
    this.progressData.financialProgress = {};
  }
  
  this.progressData.financialProgress = {
    totalBudget: this.budget,
    spent: totalExpenses,
    remaining: totalIncome - totalExpenses - totalTax,
    percentage: this.budget ? Math.min((totalExpenses / this.budget) * 100, 100) : 0
  };
  
  // Calculate completion rate based on status
  if (this.status === 'completed') {
    this.progressData.completionRate = 100;
  } else if (this.status === 'on-hold') {
    this.progressData.completionRate = 25;
  } else {
    this.progressData.completionRate = Math.min(
      (totalIncome / this.budget) * 100, 
      75
    );
  }
  
  this.progressData.lastUpdated = new Date();
  
  next();
});

// Virtual fields
projectSchema.virtual('totalIncome').get(function() {
  return this.income.reduce((sum, item) => sum + (item.amount || 0), 0);
});

projectSchema.virtual('totalExpenses').get(function() {
  return this.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
});

projectSchema.virtual('totalTax').get(function() {
  return this.tax.reduce((sum, item) => sum + (item.amount || 0), 0);
});

projectSchema.virtual('netBalance').get(function() {
  return this.totalIncome - this.totalExpenses - this.totalTax;
});

projectSchema.virtual('progressPercentage').get(function() {
  return this.budget ? Math.min((this.totalIncome / this.budget) * 100, 100) : 0;
});

// Indexes for performance
projectSchema.index({ tenantId: 1, createdBy: 1 });
projectSchema.index({ tenantId: 1, isDeleted: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ status: 1 });

// Ensure virtual fields are included in JSON output
projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;