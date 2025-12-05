// backend/models/income.js
import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema(
  {
    // User reference (optional)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Multi-tenant support (REQUIRED)
    tenantId: {
      type: String,
      required: true,
      trim: true
    },

    // Date of income (REQUIRED)
    date: {
      type: Date,
      required: true,
    },

    // Type (always 'income')
    type: {
      type: String,
      default: 'income',
      trim: true
    },

    // Category (REQUIRED) - matches frontend
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    // Sub-category (optional) - matches frontend
    subCategory: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
      default: ''
    },

    // Description/notes (optional)
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    // Amount (REQUIRED)
    amount: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000000,
    },

    // Payment mode (REQUIRED) - matches frontend field name
    paymentMode: {
      type: String,
      required: true,
      trim: true,
      default: 'Other'
    },

    // Optional project reference
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },

    // Income source (optional)
    source: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },

    // Recurring income flag
    recurring: {
      type: Boolean,
      default: false
    },

    // Income status
    status: {
      type: String,
      enum: ["pending", "received", "cancelled"],
      default: "received"
    },

    // Tags for categorization
    tags: [{
      type: String,
      trim: true
    }],

    // Remarks/additional notes
    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    // Soft delete support
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'incomes' // Explicit collection name
  }
);

// Compound indexes for better query performance
incomeSchema.index({ tenantId: 1, date: -1 });
incomeSchema.index({ tenantId: 1, category: 1 });
incomeSchema.index({ tenantId: 1, isDeleted: 1 });
incomeSchema.index({ tenantId: 1, createdAt: -1 });
incomeSchema.index({ date: 1 });

// Virtual for formatted date
incomeSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-IN');
});

// Pre-save middleware for validation
incomeSchema.pre('save', function(next) {
  // Ensure tenantId is present
  if (!this.tenantId) {
    return next(new Error('Tenant ID is required'));
  }
  
  // Ensure amount is valid
  if (this.amount <= 0) {
    return next(new Error('Amount must be greater than 0'));
  }
  
  // Trim string fields
  if (this.category) this.category = this.category.trim();
  if (this.subCategory) this.subCategory = this.subCategory.trim();
  if (this.description) this.description = this.description.trim();
  if (this.paymentMode) this.paymentMode = this.paymentMode.trim();
  
  next();
});

// Static method to find by tenant
incomeSchema.statics.findByTenant = function(tenantId, includeDeleted = false) {
  const filter = { tenantId };
  if (!includeDeleted) {
    filter.isDeleted = false;
  }
  return this.find(filter).sort({ date: -1 });
};

// Instance method to soft delete
incomeSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Instance method to restore
incomeSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  return this.save();
};

// Prevent model overwrite during hot reloads
const Income = mongoose.models.Income || mongoose.model("Income", incomeSchema);

export default Income;