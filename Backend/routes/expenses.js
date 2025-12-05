const express = require('express');
const router = express.Router();
const Expense = require('../models/expense');
const auth = require('../middleware/auth');

// Create expense for project
router.post('/', auth, async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      userId: req.user.id
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get expenses for project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ 
      projectId: req.params.projectId,
      userId: req.user.id 
    }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update expense
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    await Expense.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;