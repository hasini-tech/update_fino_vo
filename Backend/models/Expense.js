import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String
  },
  recurring: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'other'],
    default: 'card'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Check if model is already compiled to prevent hot-reload errors
const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

export default Expense;