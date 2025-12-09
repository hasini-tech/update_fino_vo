import mongoose from "mongoose";

const moneyTransactionSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ["borrow", "lend"],
    index: true
  },
  personName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  personEmail: {
    type: String,
    required: false,
    trim: true,
    maxlength: 255
  },
  personPhone: {
    type: String,
    required: false,
    trim: true,
    maxlength: 20
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: "INR",
    maxlength: 10
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "completed", "overdue", "cancelled"],
    default: "pending",
    index: true
  },
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  reminderDays: {
    type: Number,
    default: 3,
    min: 1,
    max: 30
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  attachments: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
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

// Indexes for better performance
moneyTransactionSchema.index({ tenantId: 1, dueDate: 1 });
moneyTransactionSchema.index({ tenantId: 1, status: 1 });
moneyTransactionSchema.index({ tenantId: 1, type: 1 });
moneyTransactionSchema.index({ dueDate: 1, status: 1 });
moneyTransactionSchema.index({ tenantId: 1, personName: 1 });

// Pre-save middleware to update updatedAt
moneyTransactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find overdue transactions
moneyTransactionSchema.statics.findOverdue = function(tenantId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    tenantId,
    status: 'pending',
    dueDate: { $lt: today }
  });
};

// Static method to find due soon transactions
moneyTransactionSchema.statics.findDueSoon = function(tenantId, days = 3) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + days);
  dueDate.setHours(23, 59, 59, 999);
  
  return this.find({
    tenantId,
    status: 'pending',
    dueDate: { $gte: today, $lte: dueDate }
  });
};

// Instance method to mark as completed
moneyTransactionSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to check if overdue
moneyTransactionSchema.methods.isOverdue = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.status === 'pending' && this.dueDate < today;
};

// Instance method to get days until due
moneyTransactionSchema.methods.getDaysUntilDue = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(this.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Virtual for formatted due date
moneyTransactionSchema.virtual('formattedDueDate').get(function() {
  return this.dueDate.toLocaleDateString();
});

// Virtual for formatted amount
moneyTransactionSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString()}`;
});

// Ensure virtual fields are serialized
moneyTransactionSchema.set('toJSON', { virtuals: true });
moneyTransactionSchema.set('toObject', { virtuals: true });

// FIX: Check if model already exists before creating
const MoneyTransaction = mongoose.models.MoneyTransaction || 
  mongoose.model('MoneyTransaction', moneyTransactionSchema);

export default MoneyTransaction;