// routes/chatbot.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import multer from 'multer';
import FormData from 'form-data';
import Transaction from '../models/Transaction.js';
import Income from '../models/income.js';
import { protect } from '../middleware/authMiddleware.js';

dotenv.config();

const router = express.Router();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Helper function to get financial data
async function getFinancialSummary(tenantId) {
  try {
    const [incomeResult, expenseResult, recentTransactions] = await Promise.all([
      Income.aggregate([
        { $match: { tenantId } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { tenantId, type: 'expense' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.find({ tenantId })
        .sort({ date: -1 })
        .limit(5)
        .select('description amount type date category')
    ]);

    const income = incomeResult[0]?.total || 0;
    const expense = expenseResult[0]?.total || 0;
    const balance = income - expense;

    // Format recent transactions for context
    const recentInfo = recentTransactions.length > 0 
      ? recentTransactions.map(t => 
          `${t.description}: ₹${t.amount} (${t.type}) on ${new Date(t.date).toLocaleDateString()}`
        ).join(', ')
      : 'No recent transactions';

    return {
      income,
      expense,
      balance,
      recentTransactions: recentInfo
    };
  } catch (err) {
    console.error("Error calculating summary:", err);
    return { income: 0, expense: 0, balance: 0, recentTransactions: 'No data available' };
  }
}

// VOICE TRANSCRIPTION ENDPOINT
router.post("/transcribe", protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key not configured'
      });
    }

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: 'audio.webm',
      contentType: req.file.mimetype
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Change to 'hi' for Hindi or remove for auto-detect

    // Call OpenAI Whisper API
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );

    const transcribedText = response.data.text;

    res.json({
      success: true,
      text: transcribedText
    });

  } catch (error) {
    console.error("Transcription Error:", error.response?.data || error.message);
    
    let errorMessage = "Failed to transcribe audio";
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = "Transcription request timed out";
    } else if (error.response?.status === 401) {
      errorMessage = "Invalid OpenAI API key";
    } else if (error.response?.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later";
    }

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// CHAT ENDPOINT (Enhanced with better financial context)
router.post("/chat", protect, async (req, res) => {
  try {
    const { messages } = req.body;
    const tenantId = req.user.tenantId || req.user._id; 

    if (!DEEPSEEK_API_KEY) {
      throw new Error("DeepSeek API Key is missing");
    }

    // Get comprehensive financial data
    const financialData = await getFinancialSummary(tenantId);

    const systemPrompt = `You are a helpful financial assistant for a personal finance management app. 

Current User's Financial Summary:
- Total Income: ₹${financialData.income.toLocaleString('en-IN')}
- Total Expenses: ₹${financialData.expense.toLocaleString('en-IN')}
- Current Balance: ₹${financialData.balance.toLocaleString('en-IN')}
- Recent Transactions: ${financialData.recentTransactions}

Your capabilities:
1. Answer questions about the user's income, expenses, and balance
2. Provide spending analysis and insights
3. Offer budgeting advice based on their financial data
4. Suggest ways to save money or optimize spending
5. Explain financial concepts in simple terms

Guidelines:
- Be friendly, conversational, and supportive
- Use the financial data provided to give personalized responses
- If asked about specific transactions, refer to the recent transactions list
- Keep responses concise but informative (2-4 sentences usually)
- If the question is not finance-related, politely redirect to financial topics
- Always format currency in Indian Rupees (₹) format

Example interactions:
- "What's my balance?" → "Your current balance is ₹${financialData.balance.toLocaleString('en-IN')}. You've earned ₹${financialData.income.toLocaleString('en-IN')} and spent ₹${financialData.expense.toLocaleString('en-IN')} so far."
- "How am I doing?" → Provide analysis based on income vs expenses ratio
- "Tips to save money" → Offer 2-3 practical tips based on their spending patterns`;

    // Prepare messages for API
    const apiMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    // Call DeepSeek API
    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...apiMessages
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );

    const aiResponse = response.data.choices[0].message.content;

    res.json({
      success: true,
      message: aiResponse
    });

  } catch (error) {
    console.error("Chatbot API Error:", error.response?.data || error.message);
    
    let errorMessage = "I'm having trouble connecting right now.";
    
    if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please try again.";
    } else if (error.response?.status === 402) {
        errorMessage = "Service quota exceeded. Please contact support.";
    } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please check API configuration.";
    } else if (error.response?.status === 429) {
        errorMessage = "Too many requests. Please wait a moment.";
    }

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

export default router;