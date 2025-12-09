import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Optional project-based tracking
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },

    // income or expense
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
      lowercase: true,
    },

    // Normal category from frontend (Food, Travel, Salary…)
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Subcategory is optional
    subCategory: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },

    // Amount field
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Date
    date: {
      type: Date,
      required: true,
    },

    // Description field
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Handle both paymentMethod and paymentMode for compatibility
    paymentMethod: {
      type: String,
      required: false,
      trim: true,
      default: "Cash",
    },

    paymentMode: {
      type: String,
      required: false,
      trim: true,
      default: "Cash",
    },

    // Status field for transaction state
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "failed"],
      default: "completed",
    },

    // tenant is REQUIRED for multi-tenancy
    tenantId: {
      type: String,
      required: true,
    },

    // Vendor information
    vendor: {
      type: String,
      trim: true,
      default: "",
    },

    // Receipt number for tracking
    receiptNumber: {
      type: String,
      trim: true,
      default: "",
    },

    // Note/Remark field
    note: {
      type: String,
      trim: true,
      default: "",
    },

    // Remark field (alias for note)
    remark: {
      type: String,
      trim: true,
      default: "",
    },

    // Source of income (for income type)
    source: {
      type: String,
      trim: true,
      default: "",
    },

    // Tags for categorization
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Reference number for bank transactions
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    // Account information
    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    // For imported transactions
    imported: {
      type: Boolean,
      default: false,
    },

    importSource: {
      type: String,
      trim: true,
      default: "",
    },

    // Recurring transaction settings
    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurringFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "none"],
      default: "none",
    },

    // Soft delete functionality
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // User who created the transaction (optional)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Last modified by
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Attachments (receipt images, documents)
    attachments: [
      {
        filename: String,
        url: String,
        type: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Location data (optional)
    location: {
      address: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },

    // Currency (default INR for Indian Rupees)
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    // Exchange rate if foreign currency
    exchangeRate: {
      type: Number,
      default: 1,
    },

    // Original amount in foreign currency
    originalAmount: {
      type: Number,
      default: null,
    },

    // Tax related fields
    taxAmount: {
      type: Number,
      default: 0,
    },

    taxPercentage: {
      type: Number,
      default: 0,
    },

    isTaxDeductible: {
      type: Boolean,
      default: false,
    },

    // GST specific fields (for Indian users)
    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },

    gstAmount: {
      type: Number,
      default: 0,
    },

    // Sync status for external integrations
    syncStatus: {
      type: String,
      enum: ["synced", "pending", "failed", "none"],
      default: "none",
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },

    // External ID for integrations (bank, payment gateway, etc.)
    externalId: {
      type: String,
      trim: true,
      default: "",
    },

    externalSource: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// ==================== VIRTUALS ====================

// Virtual for consistent payment method access
transactionSchema.virtual("payment").get(function () {
  return this.paymentMode || this.paymentMethod || "Cash";
});

// Virtual for formatted amount with currency
transactionSchema.virtual("formattedAmount").get(function () {
  const symbol = this.currency === "INR" ? "₹" : "$";
  return `${symbol}${this.amount.toLocaleString("en-IN")}`;
});

// Virtual for net amount (after tax)
transactionSchema.virtual("netAmount").get(function () {
  return this.amount - (this.taxAmount || 0);
});

// ==================== INDEXES ====================

// Compound indexes for better query performance
transactionSchema.index({ tenantId: 1, type: 1 });
transactionSchema.index({ tenantId: 1, date: -1 });
transactionSchema.index({ tenantId: 1, category: 1 });
transactionSchema.index({ tenantId: 1, isDeleted: 1 });
transactionSchema.index({ tenantId: 1, type: 1, isDeleted: 1 });
transactionSchema.index({ tenantId: 1, date: -1, type: 1 });
transactionSchema.index({ tenantId: 1, category: 1, type: 1 });
transactionSchema.index({ tenantId: 1, status: 1 });
transactionSchema.index({ tenantId: 1, createdAt: -1 });
transactionSchema.index({ projectId: 1, tenantId: 1 });

// Text index for search functionality
transactionSchema.index({
  description: "text",
  category: "text",
  subCategory: "text",
  vendor: "text",
  note: "text",
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to handle paymentMethod/paymentMode consistency
transactionSchema.pre("save", function (next) {
  // If paymentMode is provided but paymentMethod is not, copy it
  if (this.paymentMode && !this.paymentMethod) {
    this.paymentMethod = this.paymentMode;
  }
  // If paymentMethod is provided but paymentMode is not, copy it
  if (this.paymentMethod && !this.paymentMode) {
    this.paymentMode = this.paymentMethod;
  }

  // Ensure type is lowercase
  if (this.type) {
    this.type = this.type.toLowerCase();
  }

  // Set default status if not provided
  if (!this.status) {
    this.status = "completed";
  }

  // Copy note to remark if remark is empty
  if (this.note && !this.remark) {
    this.remark = this.note;
  }
  if (this.remark && !this.note) {
    this.note = this.remark;
  }

  next();
});

// Pre-update middleware
transactionSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  // Handle paymentMode/paymentMethod sync on update
  if (update.paymentMode && !update.paymentMethod) {
    update.paymentMethod = update.paymentMode;
  }
  if (update.paymentMethod && !update.paymentMode) {
    update.paymentMode = update.paymentMethod;
  }

  // Ensure type is lowercase on update
  if (update.type) {
    update.type = update.type.toLowerCase();
  }

  next();
});

// ==================== STATIC METHODS ====================

// Find transactions by tenant and type
transactionSchema.statics.findByTenantAndType = function (tenantId, type) {
  return this.find({
    tenantId,
    type,
    isDeleted: false,
  }).sort({ date: -1 });
};

// Find expenses by tenant
transactionSchema.statics.findExpenses = function (tenantId) {
  return this.find({
    tenantId,
    type: "expense",
    isDeleted: false,
  }).sort({ date: -1, createdAt: -1 });
};

// Find incomes by tenant
transactionSchema.statics.findIncomes = function (tenantId) {
  return this.find({
    tenantId,
    type: "income",
    isDeleted: false,
  }).sort({ date: -1, createdAt: -1 });
};

// Get total by type
transactionSchema.statics.getTotalByType = async function (tenantId, type) {
  const result = await this.aggregate([
    {
      $match: {
        tenantId,
        type,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { total: 0, count: 0 };
};

// Get category breakdown
transactionSchema.statics.getCategoryBreakdown = async function (
  tenantId,
  type
) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        type,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);
};

// Get monthly breakdown
transactionSchema.statics.getMonthlyBreakdown = async function (
  tenantId,
  type,
  year
) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  return this.aggregate([
    {
      $match: {
        tenantId,
        type,
        isDeleted: false,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $month: "$date" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Soft delete transaction
transactionSchema.statics.softDelete = function (id, tenantId) {
  return this.findOneAndUpdate(
    { _id: id, tenantId },
    {
      isDeleted: true,
      deletedAt: new Date(),
    },
    { new: true }
  );
};

// Restore soft deleted transaction
transactionSchema.statics.restore = function (id, tenantId) {
  return this.findOneAndUpdate(
    { _id: id, tenantId },
    {
      isDeleted: false,
      deletedAt: null,
    },
    { new: true }
  );
};

// Search transactions
transactionSchema.statics.search = function (tenantId, query) {
  return this.find({
    tenantId,
    isDeleted: false,
    $text: { $search: query },
  }).sort({ score: { $meta: "textScore" } });
};

// ==================== INSTANCE METHODS ====================

// Mark transaction as deleted (soft delete)
transactionSchema.methods.markAsDeleted = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Restore transaction
transactionSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  return this.save();
};

// Clone transaction
transactionSchema.methods.clone = function () {
  const cloned = this.toObject();
  delete cloned._id;
  delete cloned.createdAt;
  delete cloned.updatedAt;
  cloned.date = new Date();
  return new Transaction(cloned);
};

// ==================== JSON CONFIGURATION ====================

transactionSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    // Ensure payment field is included in JSON output
    ret.payment = doc.payment;
    // Remove sensitive or internal fields if needed
    delete ret.__v;
    return ret;
  },
});

transactionSchema.set("toObject", { virtuals: true });

// ==================== MODEL EXPORT ====================

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;