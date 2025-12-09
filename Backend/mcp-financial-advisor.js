// backend/mcp-financial-advisor.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import mongoose from 'mongoose';
import axios from 'axios';
import 'dotenv/config';
import Transaction from './models/Transaction.js';

// --- Environment variable names ---
const {
  MONGO_URI,
  NEWS_API_KEY,
  DEEPSEEK_API_KEY,
  RAPIDAPI_KEY, // For Indian stock data
  FRED_API_KEY,
} = process.env;

// --- Helper function to validate environment variables on startup ---
function validateEnv() {
  const requiredKeys = {
    MONGO_URI,
    NEWS_API_KEY,
    DEEPSEEK_API_KEY,
  };
  const missingKeys = Object.entries(requiredKeys)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  
  if (missingKeys.length > 0) {
    throw new Error(`MCP FATAL ERROR: Missing required environment variables: ${missingKeys.join(', ')}`);
  }
}

// --- Helper functions for standardized responses ---
function createSuccessResponse(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function createErrorResponse(message) {
  console.error(`MCP Tool Error: ${message}`);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

// --- Main MCP Class ---
class FinancialAdvisorMCP {
  constructor() {
    this.server = new Server(
      { name: "financial-advisor-mcp", version: "3.1.0" },
      { capabilities: { tools: {} } }
    );
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[MCP Server Error]", error);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        { name: "get_user_financial_profile", description: "Get complete financial profile for a specific tenant.", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, days: { type: "number" } }, required: ["tenantId"] } },
        { name: "get_financial_news", description: "Get latest financial news", inputSchema: { type: "object", properties: { category: { type: "string" }, limit: { type: "number" }, topic: { type: "string" } } } },
        { name: "get_market_data", description: "Get Indian stock market prices", inputSchema: { type: "object", properties: { symbols: { type: "array", items: { type: "string" } } }, required: ["symbols"] } },
        { name: "get_economic_indicators", description: "Get key economic indicators from FRED.", inputSchema: { type: "object", properties: { indicators: { type: "array", items: { type: "string" } } } } },
        { name: "analyze_spending_vs_market", description: "Analyzes user spending against market trends.", inputSchema: { type: "object", properties: { tenantId: { type: "string" } }, required: ["tenantId"] } },
        { name: "get_investment_opportunities", description: "Suggests investment opportunities based on user profile.", inputSchema: { type: "object", properties: { tenantId: { type: "string" }, riskTolerance: { type: "string" } }, required: ["tenantId"] } },
        { name: "get_expense_reduction_suggestions", description: "Provides suggestions to reduce expenses.", inputSchema: { type: "object", properties: { tenantId: { type: "string" } }, required: ["tenantId"] } },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
      const { name, arguments: args } = params;
      try {
        console.error(`[MCP] Received tool call: '${name}' with args:`, JSON.stringify(args || {}));

        switch (name) {
          case "get_user_financial_profile":
            if (!args.tenantId) {
                return createErrorResponse("Tool 'get_user_financial_profile' requires a 'tenantId' argument.");
            }
            return await this.getUserFinancialProfile(args.tenantId, args.days);
          case "get_financial_news": 
            return await this.getFinancialNews(args.category, args.limit, args.topic);
          case "get_market_data": 
            return await this.getMarketData(args.symbols);
          case "get_economic_indicators": 
            return await this.getEconomicIndicators(args.indicators);
          case "analyze_spending_vs_market": 
            if (!args.tenantId) return createErrorResponse("Tool 'analyze_spending_vs_market' requires a 'tenantId' argument.");
            return await this.analyzeSpendingVsMarket(args.tenantId);
          case "get_investment_opportunities": 
            if (!args.tenantId) return createErrorResponse("Tool 'get_investment_opportunities' requires a 'tenantId' argument.");
            return await this.getInvestmentOpportunities(args.tenantId, args.riskTolerance);
          case "get_expense_reduction_suggestions": 
            if (!args.tenantId) return createErrorResponse("Tool 'get_expense_reduction_suggestions' requires a 'tenantId' argument.");
            return await this.getExpenseReductionSuggestions(args.tenantId);
          default: 
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return createErrorResponse(error.message);
      }
    });
  }

  // --- Tool Implementations ---

  async getUserFinancialProfile(tenantId, days = 30) {
    if (!tenantId) {
        return createErrorResponse("A tenantId is required to get the financial profile.");
    }
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [totalIncome, totalExpense, categoryBreakdown, recentTransactions] = await Promise.all([
      Transaction.getTotalIncome(tenantId),
      Transaction.getTotalExpenses(tenantId),
      Transaction.getCategoryBreakdown(tenantId, 'expense'),
      Transaction.find({ tenantId, date: { $gte: fromDate } }).sort({ date: -1 }).limit(10)
    ]);

    return createSuccessResponse({
      summary: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        periodDays: days,
      },
      categoryBreakdown,
      recentTransactions
    });
  }

  async getFinancialNews(category = "general", limit = 5, topic = null) {
    if (!NEWS_API_KEY) {
        return createErrorResponse("News API key is not configured.");
    }
    const url = `https://newsapi.org/v2/top-headlines`;
    try {
        const response = await axios.get(url, {
            params: {
                apiKey: NEWS_API_KEY,
                category: category,
                pageSize: limit,
                q: topic || 'India stock market',
                country: 'in'
            }
        });
        return createSuccessResponse({ articles: response.data.articles });
    } catch (error) {
        return createErrorResponse(`Failed to fetch news: ${error.message}`);
    }
  }

  // ✅ Indian Stock Market Data - Multiple sources
  async getMarketData(symbols = ['RELIANCE.NSE', 'TCS.NSE', 'INFY.NSE']) {
    console.error(`[MCP] Fetching Indian market data for: ${symbols.join(', ')}`);
    
    try {
      // Method 1: Try Yahoo Finance for Indian stocks first
      return await this.getIndianStocksFromYahoo(symbols);
    } catch (yahooError) {
      console.error('[MCP] Yahoo Finance failed, trying RapidAPI...', yahooError.message);
      
      // Method 2: Fallback to RapidAPI Indian Stock Exchange
      if (RAPIDAPI_KEY) {
        try {
          return await this.getIndianStocksFromRapidAPI(symbols);
        } catch (rapidError) {
          console.error('[MCP] RapidAPI also failed:', rapidError.message);
        }
      }
      
      // Method 3: Try NSE India unofficial API
      try {
        return await this.getIndianStocksFromNSE(symbols);
      } catch (nseError) {
        console.error('[MCP] NSE API also failed:', nseError.message);
      }
      
      // Final fallback: Mock Indian stock data
      return this.getMockIndianStockData(symbols);
    }
  }

  // Method 1: Yahoo Finance for Indian Stocks
  async getIndianStocksFromYahoo(symbols) {
    const marketData = [];
    
    for (const symbol of symbols) {
      try {
        // Convert format: RELIANCE.NSE -> RELIANCE.NS, TCS.NSE -> TCS.NS
        let yahooSymbol = symbol;
        if (symbol.includes('.NSE')) {
          yahooSymbol = symbol.replace('.NSE', '.NS');
        } else if (symbol.includes('.BSE')) {
          yahooSymbol = symbol.replace('.BSE', '.BO');
        } else if (symbol.includes('.MCX')) {
          // For commodities like GOLD, SILVER
          yahooSymbol = symbol.split('.')[0];
        }
        
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
        const response = await axios.get(url, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const data = response.data.chart.result[0];
        const quote = data.meta;
        const currentPrice = quote.regularMarketPrice || quote.previousClose;
        const previousClose = quote.previousClose;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;
        
        marketData.push({
          symbol: symbol,
          price: currentPrice.toFixed(2),
          changePercent: changePercent.toFixed(2)
        });
      } catch (error) {
        console.error(`[MCP] Failed to fetch ${symbol} from Yahoo:`, error.message);
        marketData.push({
          symbol: symbol,
          price: 'N/A',
          changePercent: 'N/A'
        });
      }
    }
    
    console.error(`[MCP] ✅ Successfully processed ${marketData.filter(d => d.price !== 'N/A').length}/${symbols.length} symbols from Yahoo Finance`);
    return createSuccessResponse({ marketData });
  }

  // Method 2: RapidAPI Indian Stock Exchange
  async getIndianStocksFromRapidAPI(symbols) {
    if (!RAPIDAPI_KEY) {
      throw new Error('RapidAPI key not configured');
    }
    
    const marketData = [];
    
    for (const symbol of symbols) {
      try {
        const stockSymbol = symbol.split('.')[0];
        const url = `https://latest-stock-price.p.rapidapi.com/price`;
        
        const response = await axios.get(url, {
          params: { Indices: stockSymbol },
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'latest-stock-price.p.rapidapi.com'
          },
          timeout: 15000
        });
        
        if (response.data && response.data.length > 0) {
          const stock = response.data[0];
          const price = stock.lastPrice || stock.pricecurrent;
          const changePercent = stock.pChange || 0;
          
          marketData.push({
            symbol: symbol,
            price: price.toFixed(2),
            changePercent: changePercent.toFixed(2)
          });
        } else {
          throw new Error('No data returned');
        }
      } catch (error) {
        console.error(`[MCP] Failed to fetch ${symbol} from RapidAPI:`, error.message);
        marketData.push({
          symbol: symbol,
          price: 'N/A',
          changePercent: 'N/A'
        });
      }
    }
    
    console.error(`[MCP] ✅ Successfully processed ${marketData.filter(d => d.price !== 'N/A').length}/${symbols.length} symbols from RapidAPI`);
    return createSuccessResponse({ marketData });
  }

  // Method 3: NSE India Unofficial API (Free but rate-limited)
  async getIndianStocksFromNSE(symbols) {
    const marketData = [];
    
    for (const symbol of symbols) {
      try {
        const stockSymbol = symbol.split('.')[0];
        
        // NSE India's quote API
        const url = `https://www.nseindia.com/api/quote-equity?symbol=${stockSymbol}`;
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.nseindia.com/'
          },
          timeout: 15000
        });
        
        if (response.data && response.data.priceInfo) {
          const priceInfo = response.data.priceInfo;
          const price = priceInfo.lastPrice;
          const changePercent = priceInfo.pChange || 0;
          
          marketData.push({
            symbol: symbol,
            price: price.toFixed(2),
            changePercent: changePercent.toFixed(2)
          });
        } else {
          throw new Error('No price data available');
        }
      } catch (error) {
        console.error(`[MCP] Failed to fetch ${symbol} from NSE:`, error.message);
        marketData.push({
          symbol: symbol,
          price: 'N/A',
          changePercent: 'N/A'
        });
      }
    }
    
    console.error(`[MCP] ✅ Successfully processed ${marketData.filter(d => d.price !== 'N/A').length}/${symbols.length} symbols from NSE`);
    return createSuccessResponse({ marketData });
  }

  // Fallback: Mock data with realistic Indian stock prices
  getMockIndianStockData(symbols) {
    console.error('[MCP] ⚠️ Using mock data - all real APIs failed');
    
    const mockPrices = {
      'RELIANCE.NSE': { price: 2456.75, change: 1.25 },
      'TCS.NSE': { price: 3678.90, change: -0.85 },
      'INFY.NSE': { price: 1567.30, change: 2.10 },
      'HDFCBANK.NSE': { price: 1678.45, change: 0.65 },
      'SBIN.NSE': { price: 567.80, change: -1.20 },
      'WIPRO.NSE': { price: 445.60, change: 1.45 },
      'ICICIBANK.NSE': { price: 987.25, change: 0.95 },
      'GOLD.MCX': { price: 62450.00, change: 0.45 },
      'SILVER.MCX': { price: 72850.00, change: -0.75 }
    };
    
    const marketData = symbols.map(symbol => {
      const mock = mockPrices[symbol] || { price: 1000 + Math.random() * 2000, change: (Math.random() - 0.5) * 4 };
      return {
        symbol: symbol,
        price: mock.price.toFixed(2),
        changePercent: mock.change.toFixed(2),
        note: 'Mock data - API unavailable'
      };
    });
    
    return createSuccessResponse({ marketData });
  }
  
  async getEconomicIndicators(indicators = ['CPIAUCSL', 'UNRATE']) {
    return createSuccessResponse({ 
      note: "Economic indicator data is mock data for now.",
      indicators: indicators.map(i => ({ seriesId: i, value: (Math.random() * 100).toFixed(2) }))
    });
  }
  
  async analyzeSpendingVsMarket(tenantId) {
    if (!tenantId) return createErrorResponse("'analyzeSpendingVsMarket' requires a tenantId.");
    return createSuccessResponse({ 
      analysis: "Your spending in 'Technology' category is 15% higher than NIFTY IT index performance this month.",
      recommendation: "Consider diversifying your tech investments across multiple sectors like banking and pharma."
    });
  }

  async getInvestmentOpportunities(tenantId, riskTolerance = 'medium') {
    if (!tenantId) return createErrorResponse("'getInvestmentOpportunities' requires a tenantId.");
    return createSuccessResponse({
        opportunities: [
            { type: "Index Fund", symbol: "NIFTYBEES", description: "Nifty 50 ETF - Broad market exposure", risk: "low" },
            { type: "Stock", symbol: "RELIANCE.NSE", description: "Diversified conglomerate with strong growth", risk: "medium" },
            { type: "Stock", symbol: "INFY.NSE", description: "Leading IT services company", risk: "medium" },
            { type: "Commodity", symbol: "GOLD.MCX", description: "Gold for portfolio hedging", risk: "low" }
        ].filter(opp => opp.risk === riskTolerance)
    });
  }
  
  async getExpenseReductionSuggestions(tenantId) {
    if (!tenantId) return createErrorResponse("'getExpenseReductionSuggestions' requires a tenantId.");
    const topCategory = await Transaction.aggregate([
        { $match: { tenantId, type: 'expense' }},
        { $group: { _id: "$category", total: { $sum: "$amount" }}},
        { $sort: { total: -1 }},
        { $limit: 1 }
      ]);
    return createSuccessResponse({
        suggestions: [
            { category: topCategory[0]?._id || "your top category", suggestion: "Review subscriptions and cancel any you no longer use." },
            { category: "Food", suggestion: "Try meal prepping for the week to reduce dining out costs." },
            { category: "Transport", suggestion: "Consider carpooling or public transport to save on fuel costs." }
        ]
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('MCP_READY');
    console.error("✅ Financial Advisor MCP server running with Indian stock market support.");
    process.stdin.resume();
  }
}

// --- Main Execution Block ---
async function main() {
  try {
    console.error('[MCP] Starting validation...');
    validateEnv();
    console.error('[MCP] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000 });
    console.error('✅ MCP: MongoDB connected successfully.');
    console.error('[MCP] Initializing server with Indian stock market support...');
    const server = new FinancialAdvisorMCP();
    await server.run();
  } catch (err) {
    console.error("❌ MCP FATAL STARTUP ERROR:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => { console.error('❌ Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error('❌ Unhandled Rejection:', err); process.exit(1); });

main();