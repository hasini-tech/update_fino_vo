// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MoneyTransaction'
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill'
  },
  type: {
    type: String,
    required: true,
    enum: ['reminder', 'payment', 'overdue', 'system']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  scheduledFor: {
    type: Date,
    required: true
  },
  sent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
notificationSchema.index({ tenantId: 1, scheduledFor: 1 });
notificationSchema.index({ tenantId: 1, sent: 1 });
notificationSchema.index({ scheduledFor: 1, sent: 1 });

export default mongoose.model('Notification', notificationSchema);