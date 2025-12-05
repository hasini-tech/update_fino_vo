import mongoose from 'mongoose';

const taxSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  taxType: {
    type: String,
    required: true,
    enum: [
      'GST',
      'Income Tax', 
      'Professional Tax',
      'TDS',
      'Property Tax',
      'Corporate Tax',
      'Capital Gains Tax',
      'Customs Duty',
      'Excise Duty',
      'Service Tax',
      'Other'
    ]
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'filed'],
    default: 'pending'
  },
  taxPeriod: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  formType: {
    type: String,
    trim: true
  },
  
  // GST-specific fields
  gstDetails: {
    gstNumber: {
      type: String,
      trim: true
    },
    gstRate: {
      type: Number,
      min: 0,
      max: 100
    },
    sgst: {
      type: Number,
      min: 0
    },
    cgst: {
      type: Number,
      min: 0
    },
    igst: {
      type: Number,
      min: 0
    },
    hsnCode: {
      type: String,
      trim: true
    },
    gstFilingType: {
      type: String,
      enum: ['Regular', 'Composition', 'Nil', 'Other'],
      default: 'Regular'
    },
    returnType: {
      type: String,
      enum: ['GSTR-1', 'GSTR-3B', 'GSTR-9', 'Other'],
      default: 'GSTR-3B'
    }
  },
  
  // TDS-specific fields
  tdsDetails: {
    tanNumber: {
      type: String,
      trim: true
    },
    formType: {
      type: String,
      enum: ['24Q', '26Q', '27Q', '27EQ'],
      default: '24Q'
    },
    section: {
      type: String,
      trim: true
    },
    deducteePan: {
      type: String,
      trim: true
    }
  },
  
  // Common fields for all tax types
  paymentDetails: {
    paymentDate: Date,
    paymentMethod: {
      type: String,
      enum: ['Online', 'Cheque', 'Cash', 'Bank Transfer', 'Other']
    },
    transactionId: String,
    bankName: String,
    challanNumber: String
  },
  
  documents: [{
    name: String,
    url: String,
    documentType: {
      type: String,
      enum: ['invoice', 'challan', 'return', 'certificate', 'other']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // AI Analysis Fields
  aiAnalysis: {
    optimizedAmount: Number,
    suggestions: [String],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    lastAnalyzed: Date
  },
  
  tenantId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
taxSchema.index({ tenantId: 1, taxType: 1 });
taxSchema.index({ tenantId: 1, dueDate: 1 });
taxSchema.index({ tenantId: 1, status: 1 });
taxSchema.index({ tenantId: 1, priority: 1 });

// Prevent model overwrite during hot reloads
const Tax = mongoose.models.Tax || mongoose.model('Tax', taxSchema);

export default Tax;