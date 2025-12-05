import mongoose from "mongoose";

const apiConfigurationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  tenantId: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['shopify', 'woocommerce', 'instaxbot', 'gowhats', 'stripe']
  },
  accessToken: {
    type: String
  },
  apiUrl: {
    type: String,
    required: true
  },
  apiKey: {
    type: String
  },
  secretKey: {
    type: String
  },
  customHeader: {
    type: String
  },
  storeUrl: {
    type: String
  },
  storeId: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSync: {
    type: Date
  },
  syncStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Unique constraint for user and platform
apiConfigurationSchema.index({ userId: 1, platform: 1 }, { unique: true });
apiConfigurationSchema.index({ tenantId: 1 });

export default mongoose.model('ApiConfiguration', apiConfigurationSchema);