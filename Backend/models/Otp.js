// models/Otp.js - UPDATED VERSION
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create TTL index to automatically delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster queries on email and creation time (to get latest OTP)
otpSchema.index({ email: 1, createdAt: -1 });

// Index for finding unused OTPs
otpSchema.index({ email: 1, used: 1 });

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;