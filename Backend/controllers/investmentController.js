// backend/controllers/investmentController.js
import Investment from '../models/Investment.js';

// 🔹 Dummy data simulation (you can replace later with real APIs)
const getMarketData = async (req, res) => {
  try {
    const marketData = {
      niftyData: { value: 22500, change: 0.85 },
      sensexData: { value: 74500, change: -0.34 },
      goldPrice: 6200,
      goldHistory: [
        { date: '2025-10-01', price: 6050 },
        { date: '2025-10-10', price: 6100 },
        { date: '2025-10-20', price: 6150 },
        { date: '2025-10-25', price: 6200 },
      ],
      topStocks: [
        { symbol: 'TCS', name: 'Tata Consultancy', price: 3980, change: 1.4, sector: 'IT', rating: 4.7 },
        { symbol: 'INFY', name: 'Infosys', price: 1650, change: -0.8, sector: 'IT', rating: 4.4 },
        { symbol: 'HDFC', name: 'HDFC Bank', price: 1520, change: 0.5, sector: 'Banking', rating: 4.6 },
        { symbol: 'RELI', name: 'Reliance', price: 2510, change: 0.9, sector: 'Energy', rating: 4.8 },
      ]
    };
    res.json({ success: true, data: marketData });
  } catch (err) {
    console.error('Error fetching market data:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch market data' });
  }
};

const getPredictions = async (req, res) => {
  try {
    const predictions = {
      suggestions: {
        allocation: [
          { name: 'Stocks', value: 50 },
          { name: 'Gold', value: 30 },
          { name: 'Mutual Funds', value: 20 }
        ],
        breakdown: [
          { type: 'Stock - TCS', amount: 10000, allocation: 40 },
          { type: 'Gold', amount: 6000, allocation: 30 },
          { type: 'Mutual Funds', amount: 4000, allocation: 20 },
        ],
        riskProfile: 'Moderate'
      },
      goldPrediction: {
        trend: 'up',
        message: 'Good time to buy gold',
        confidence: 87,
        analysis: 'AI predicts steady gold price increase due to inflation trends'
      },
      marketSentiment: { sentiment: 'Bullish', score: 8.2 },
      stockInsights: [
        { stock: 'TCS', type: 'buy', confidence: 85, message: 'Strong quarterly earnings', reason: 'Earnings growth' },
        { stock: 'INFY', type: 'hold', confidence: 65, message: 'Stable outlook', reason: 'Neutral sentiment' },
      ]
    };
    res.json({ success: true, data: predictions });
  } catch (err) {
    console.error('Error fetching predictions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch predictions' });
  }
};

const getUserFinance = async (req, res) => {
  try {
    const userFinance = {
      totalInvestment: 20000,
      currentValue: 21800,
      profitLoss: 9
    };
    res.json({ success: true, data: userFinance });
  } catch (err) {
    console.error('Error fetching user finance:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user finance data' });
  }
};

const getPortfolio = async (req, res) => {
  try {
    const portfolio = {
      totalInvested: 20000,
      portfolio: [
        { _id: 'stocks', totalInvested: 10000 },
        { _id: 'gold', totalInvested: 6000 },
        { _id: 'mutual funds', totalInvested: 4000 },
      ]
    };
    res.json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch portfolio' });
  }
};

const getHistory = async (req, res) => {
  try {
    const investments = await Investment.find().sort({ timestamp: -1 });
    res.json({ success: true, data: { investments } });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch investment history' });
  }
};

const makeInvestment = async (req, res) => {
  try {
    const { type, name, amount, transactionType } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ success: false, message: 'Type and amount are required' });
    }

    const newInvestment = new Investment({
      type,
      name,
      amount,
      transactionType,
      status: 'completed',
      timestamp: new Date()
    });

    await newInvestment.save();
    res.json({ success: true, message: 'Investment recorded successfully!' });
  } catch (err) {
    console.error('Error creating investment:', err);
    res.status(500).json({ success: false, message: 'Failed to make investment' });
  }
};

export {
  getMarketData,
  getPredictions,
  getUserFinance,
  getPortfolio,
  getHistory,
  makeInvestment
};
