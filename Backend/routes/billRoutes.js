// routes/billRoutes.js
import express from 'express';
import { protect, tenantMiddleware } from '../middleware/authMiddleware.js'; // ✅ Corrected import
import Bill from '../models/Bill.js'; // ✅ Corrected relative path

const router = express.Router();

// =====================================
// GET all bills for the authenticated tenant
// =====================================
router.get('/', protect, tenantMiddleware, async (req, res) => {
  try {
    const bills = await Bill.find({
      tenantId: req.tenantId,
      user: req.user.userId
    }).sort({ dueDate: 1 });

    res.json(bills);
  } catch (err) {
    console.error('❌ Error fetching bills:', err.message);
    res.status(500).send('Server Error');
  }
});

// =====================================
// ADD a new bill
// =====================================
router.post('/', protect, tenantMiddleware, async (req, res) => {
  try {
    const { name, amount, dueDate, category, paid } = req.body;

    if (!name || !amount || !dueDate || !category) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newBill = new Bill({
      name,
      amount,
      dueDate,
      category,
      paid: paid || false,
      tenantId: req.tenantId,
      user: req.user.userId
    });

    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (err) {
    console.error('❌ Error adding bill:', err.message);
    res.status(500).send('Server Error');
  }
});

export default router;