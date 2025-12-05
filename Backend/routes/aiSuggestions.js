// routes/aiSuggestion.js
import express from 'express';
import axios from 'axios';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Transaction from '../models/Transaction.js';
import { protect, tenantMiddleware } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

// ========================================================
// ✅ MODIFICATION: Import the Income model
// Note: We no longer need to import mongoose itself here
// ========================================================
import Income from '../models/income.js'; // Adjust path if necessary
// ========================================================

dotenv.config();

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// ========================================================
// ✅ ENHANCED MCP TOOL CALLER WITH RETRY & TIMEOUT
// ========================================================
// ✅ MODIFICATION: Increased timeout from 8000ms to 15000ms
async function callMCPTool(toolName, args, timeout = 15000) {
  console.log(`      ↳ 🔧 Calling MCP Tool: ${toolName}`);
  console.log(`      ↳ 📋 Args:`, JSON.stringify(args));
  
  return new Promise((resolve) => {
    const mcpScriptPath = join(__dirname, '../mcp-financial-advisor.js');
    const mcpProcess = spawn('node', [mcpScriptPath], { 
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    const timeoutHandle = setTimeout(() => {
      if (!resolved) {
        console.warn(`      ↳ ⚠️ MCP tool '${toolName}' timed out after ${timeout}ms`);
        resolved = true;
        try { mcpProcess.kill('SIGTERM'); } catch {}
        resolve(null);
      }
    }, timeout);

    mcpProcess.stdout.on('data', (data) => { 
      stdout += data.toString(); 
    });

    mcpProcess.stderr.on('data', (data) => { 
      stderr += data.toString(); 
    });

    mcpProcess.on('close', (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutHandle);

      if (stderr && !stderr.includes('MCP')) {
        console.warn(`      ↳ ⚠️ MCP stderr:`, stderr.substring(0, 150));
      }

      if (!stdout) {
        console.warn(`      ↳ ❌ No stdout from MCP tool '${toolName}'`);
        return resolve(null);
      }

      try {
        const lines = stdout.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.result?.content?.[0]?.text) {
              const result = JSON.parse(response.result.content[0].text);
              console.log(`      ↳ ✅ MCP tool '${toolName}' succeeded`);
              return resolve(result);
            }
          } catch (parseErr) {
            // Continue to next line
          }
        }
        console.warn(`      ↳ ⚠️ Could not parse MCP response for '${toolName}'`);
        resolve(null);
      } catch (err) {
        console.error(`      ↳ ❌ MCP tool '${toolName}' error:`, err.message);
        resolve(null);
      }
    });

    mcpProcess.on('error', (err) => {
      if (!resolved) {
        console.error(`      ↳ ❌ MCP process error for '${toolName}':`, err.message);
        resolved = true;
        clearTimeout(timeoutHandle);
        resolve(null);
      }
    });

    const request = JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
      id: `mcp-${toolName}-${Date.now()}`
    });

    try {
      mcpProcess.stdin.write(request + '\n');
      mcpProcess.stdin.end();
    } catch (err) {
      if (!resolved) {
        console.error(`      ↳ ❌ Failed to write to MCP stdin:`, err.message);
        resolved = true;
        clearTimeout(timeoutHandle);
        resolve(null);
      }
    }
  });
}

// ========================================================
// ✅ PARALLEL MCP DATA FETCHER
// ========================================================
async function fetchAllMCPData(tenantId, hasUserData) {
  console.log("      ↳ 🚀 Fetching MCP data in parallel...");
  
  const mcpPromises = [];

  // 1. Financial News (always fetch)
  mcpPromises.push(
    callMCPTool('get_financial_news', { 
      category: 'business', 
      limit: 3,
      topic: hasUserData ? 'personal finance savings' : 'budgeting tips'
    }).then(result => ({ type: 'news', data: result }))
  );

  // 2. Market Data (for context)
  mcpPromises.push(
    callMCPTool('get_market_data', { 
      symbols: ['SPY', 'BTC-USD', 'GLD'] 
    }).then(result => ({ type: 'market', data: result }))
  );

  // 3. User Financial Profile (only if authenticated)
  if (hasUserData && tenantId) {
    mcpPromises.push(
      callMCPTool('get_user_financial_profile', { 
        tenantId: tenantId,
        days: 30 
      }).then(result => ({ type: 'profile', data: result }))
    );

    // 4. Expense Reduction Suggestions
    mcpPromises.push(
      callMCPTool('get_expense_reduction_suggestions', { 
        tenantId: tenantId 
      }).then(result => ({ type: 'expense_tips', data: result }))
    );
  }

  const results = await Promise.allSettled(mcpPromises);
  
  const mcpData = {
    news: null,
    market: null,
    profile: null,
    expenseTips: null
  };

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value?.data) {
      const { type, data } = result.value;
      mcpData[type === 'expense_tips' ? 'expenseTips' : type] = data;
    }
  });

  console.log("      ↳ ✅ MCP data fetch complete");
  console.log(`      ↳    News: ${mcpData.news ? '✓' : '✗'}`);
  console.log(`      ↳    Market: ${mcpData.market ? '✓' : '✗'}`);
  console.log(`      ↳    Profile: ${mcpData.profile ? '✓' : '✗'}`);
  console.log(`      ↳    Expense Tips: ${mcpData.expenseTips ? '✓' : '✗'}`);

  return mcpData;
}

// ========================================================
// ✅ BUILD AI CONTEXT FROM ALL DATA SOURCES
// ========================================================
function buildAIContext(summary, mcpData, isAuthenticated) {
  const hasUserData = summary.hasData;
  
  let context = `You are an expert AI financial advisor. Analyze the data provided and return 3–5 actionable, personalized financial suggestions.\n\n`;

  // --- USER FINANCIAL DATA ---
  if (hasUserData && isAuthenticated) {
    context += `=== USER FINANCIAL SUMMARY ===\n`;
    context += `Income: ₹${summary.totalIncome}\n`;
    context += `Expenses: ₹${summary.totalExpense}\n`;
    context += `Balance: ₹${summary.balance}\n`;
    context += `Savings Rate: ${summary.savingsRate}%\n`;
    context += `Top Spending Category: ${summary.topCategory}\n\n`;

    if (mcpData.profile) {
      context += `=== DETAILED FINANCIAL PROFILE (from MCP) ===\n`;
      context += `Net Balance: ₹${mcpData.profile.summary?.netBalance || 0}\n`;
      context += `Period: ${mcpData.profile.summary?.periodDays || 30} days\n`;
      
      if (mcpData.profile.categoryBreakdown?.length) {
        context += `\nCategory Breakdown:\n`;
        mcpData.profile.categoryBreakdown.forEach(cat => {
          context += `  - ${cat.category}: ₹${cat.total} (${cat.count} transactions)\n`;
        });
      }
      context += `\n`;
    }

    if (mcpData.expenseTips?.suggestions) {
      context += `=== MCP EXPENSE REDUCTION SUGGESTIONS ===\n`;
      mcpData.expenseTips.suggestions.forEach(tip => {
        context += `  - ${tip.category}: ${tip.suggestion}\n`;
      });
      context += `\n`;
    }
  } else {
    context += `=== USER STATUS ===\n`;
    context += `New user or guest - provide beginner-friendly financial advice.\n\n`;
  }

  // --- FINANCIAL NEWS ---
  if (mcpData.news?.articles?.length) {
    context += `=== CURRENT FINANCIAL NEWS (from MCP) ===\n`;
    mcpData.news.articles.forEach((article, i) => {
      context += `${i + 1}. ${article.title}\n`;
      if (article.description) {
        context += `   ${article.description.substring(0, 120)}...\n`;
      }
    });
    context += `\n`;
  }

  // --- MARKET DATA ---
  if (mcpData.market?.marketData?.length) {
    context += `=== MARKET DATA (from MCP) ===\n`;
    mcpData.market.marketData.forEach(stock => {
      context += `  - ${stock.symbol}: ₹${stock.price} (${stock.changePercent})\n`;
    });
    context += `\n`;
  }

  // --- INSTRUCTIONS ---
  context += `=== INSTRUCTIONS ===\n`;
  context += `Based on ALL the data above (user finances, news, market data, and MCP analysis), provide suggestions that:\n`;
  context += `1. Are specific and actionable\n`;
  context += `2. Reference current market conditions or news when relevant\n`;
  context += `3. Consider the user's actual spending patterns (if available)\n`;
  context += `4. Include a mix of short-term and long-term advice\n`;
  context += `5. Are personalized to the user's financial situation\n\n`;

  context += `Return ONLY valid JSON in this exact format:\n`;
  context += `{\n`;
  context += `  "suggestions": [\n`;
  context += `    {\n`;
  context += `      "title": "Clear, actionable title",\n`;
  context += `      "description": "Detailed explanation with specific numbers or actions",\n`;
  context += `      "type": "info|success|warning",\n`;
  context += `      "category": "Savings|Budgeting|Investment|Planning"\n`;
  context += `    }\n`;
  context += `  ]\n`;
  context += `}\n`;

  return context;
}

// ========================================================
// ✅ AGGREGATE FINANCIAL SUMMARY (LOCAL DB) - CORRECTED
// ========================================================
async function getFinancialSummary(tenantId) {
    if (!tenantId) {
        return {
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            savingsRate: 0,
            hasData: false,
            topCategory: 'None'
        };
    }

    // Use Promise.all to fetch all data concurrently
    const [incomeResult, expenseResult, topCategoryData] = await Promise.all([
        // 1. Aggregate income from the 'Income' collection using tenantId as a string
        Income.aggregate([
            { $match: { tenantId: tenantId } }, // Treat tenantId as a string
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),

        // 2. Aggregate expenses from the 'Transaction' collection
        Transaction.aggregate([
            { $match: { tenantId: tenantId, type: 'expense' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),

        // 3. Get the top expense category from the 'Transaction' collection
        Transaction.aggregate([
            { $match: { tenantId: tenantId, type: 'expense' } },
            { $group: { _id: "$category", total: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
            { $limit: 1 }
        ])
    ]);

    // Safely extract totals, defaulting to 0
    const income = incomeResult[0]?.total || 0;
    const expense = expenseResult[0]?.total || 0;

    return {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        savingsRate: income > 0 ? (((income - expense) / income) * 100).toFixed(2) : 0,
        hasData: income > 0 || expense > 0,
        topCategory: topCategoryData[0]?._id || 'None'
    };
}


// ========================================================
// ✅ PUBLIC AI SUGGESTIONS ROUTE (ENHANCED)
// ========================================================
router.get('/suggestions', async (req, res) => {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║   AI SUGGESTIONS ROUTE (ENHANCED WITH FULL MCP)   ║");
  console.log("╚════════════════════════════════════════════════════╝");

  try {
    // Extract tenant info (optional for public route)
    const tenantId = req.headers["tenant-id"] || req.headers["x-tenant-id"] || null;
    const isAuthenticated = !!tenantId;
    
    console.log(`\n📊 Request Info:`);
    console.log(`   Authenticated: ${isAuthenticated ? '✓' : '✗'}`);
    if (tenantId) console.log(`   Tenant ID: ${tenantId}`);

    // Check API key
    if (!DEEPSEEK_API_KEY) {
      console.error("❌ DEEPSEEK_API_KEY missing");
      return res.status(500).json({ 
        error: "AI service not configured. Please contact administrator." 
      });
    }

    // Step 1: Get user financial summary from MongoDB
    console.log(`\n📈 Step 1: Fetching user financial summary...`);
    const summary = await getFinancialSummary(tenantId);
    console.log(`   Has Data: ${summary.hasData ? '✓' : '✗'}`);
    if (summary.hasData) {
      console.log(`   Income: ₹${summary.totalIncome}`);
      console.log(`   Expenses: ₹${summary.totalExpense}`);
      console.log(`   Balance: ₹${summary.balance}`);
    }

    // Step 2: Fetch ALL MCP data in parallel
    console.log(`\n🔧 Step 2: Fetching MCP tool data...`);
    const mcpData = await fetchAllMCPData(tenantId, summary.hasData);

    // Step 3: Build comprehensive AI context
    console.log(`\n🤖 Step 3: Building AI context...`);
    const aiContext = buildAIContext(summary, mcpData, isAuthenticated);
    console.log(`   Context length: ${aiContext.length} characters`);

    // Step 4: Call DeepSeek AI
    console.log(`\n🚀 Step 4: Calling DeepSeek API...`);
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: aiContext }],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      // ✅ MODIFICATION: Increased timeout from 30000ms to 60000ms
      timeout: 60000
    });

    console.log("   ✅ DeepSeek response received");

    // Step 5: Parse and validate response
    const aiResult = JSON.parse(response.data.choices[0].message.content);
    
    if (aiResult?.suggestions?.length) {
      console.log(`\n✅ SUCCESS: ${aiResult.suggestions.length} AI suggestions generated`);
      console.log("╚════════════════════════════════════════════════════╝\n");
      return res.status(200).json(aiResult);
    } else {
      console.log("\n⚠️ Invalid AI response, using fallback");
      return res.status(200).json(getFallbackSuggestions(summary.hasData));
    }

  } catch (error) {
    console.error("\n❌ CRITICAL ERROR in suggestions route");
    console.error("   Error:", error.message);

    if (error.response) {
      console.error("   DeepSeek API Error:", error.response.status);
      console.error("   Details:", JSON.stringify(error.response.data).substring(0, 200));
    }
    
    console.log("   📦 Returning fallback suggestions");
    console.log("╚════════════════════════════════════════════════════╝\n");

    // Always return fallback suggestions
    const tenantId = req.headers["tenant-id"] || req.headers["x-tenant-id"] || null;
    let hasData = false;
    if (tenantId) {
      try {
        const summary = await getFinancialSummary(tenantId);
        hasData = summary.hasData;
      } catch {}
    }
    res.status(200).json(getFallbackSuggestions(hasData));
  }
});

// ========================================================
// ✅ FALLBACK SUGGESTIONS
// ========================================================
function getFallbackSuggestions(hasData) {
  return hasData
    ? {
        suggestions: [
          { 
            type: "warning", 
            title: "Review Your Top Spending Category", 
            description: "Analyze your highest spending area and identify opportunities to reduce costs by 10-15%. Small changes can lead to significant savings.",
            category: "Budgeting"
          },
          { 
            type: "success", 
            title: "Increase Your Savings Rate", 
            description: "Aim to save at least 20% of your income. Set up automatic transfers to a savings account on payday to make it effortless.",
            category: "Savings"
          },
          { 
            type: "info", 
            title: "Track Expenses Consistently", 
            description: "Continue logging all transactions to unlock deeper insights and personalized recommendations from our AI advisor.",
            category: "Planning"
          },
          { 
            type: "info", 
            title: "Set Category Budget Limits", 
            description: "Create monthly spending limits for each expense category to maintain control and avoid overspending.",
            category: "Budgeting"
          }
        ]
      }
    : {
        suggestions: [
          { 
            type: "info", 
            title: "Start Tracking Your Finances Today", 
            description: "Begin by adding your income and expenses. The more data you provide, the better our AI can assist you.",
            category: "Getting Started"
          },
          { 
            type: "success", 
            title: "Set Clear Financial Goals", 
            description: "Define both short-term (3-6 months) and long-term (1-5 years) financial objectives to stay motivated and focused.",
            category: "Planning"
          },
          { 
            type: "warning", 
            title: "Build an Emergency Fund", 
            description: "Start by saving ₹1,000 for emergencies, then work towards 3-6 months of living expenses for true financial security.",
            category: "Savings"
          },
          { 
            type: "success", 
            title: "Create Your First Budget", 
            description: "Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings. Adjust based on your personal situation.",
            category: "Budgeting"
          }
        ]
      };
}

// ========================================================
// ✅ AUTHENTICATED ROUTE (CONVENIENCE WRAPPER)
// ========================================================
router.get('/suggestions-authenticated', protect, tenantMiddleware, async (req, res) => {
  req.headers["tenant-id"] = req.tenantId;
  return router.handle(req, res);
});

export default router;