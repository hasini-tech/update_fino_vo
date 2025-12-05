/*
 * Filename: /routes/marketDataRoutes.js
 * Description: Defines API routes for fetching market data and AI-driven suggestions.
 */

import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import { optionalAuth, tenantMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function callMCPToolSimple(toolName, args) {
    return new Promise((resolve, reject) => {
        const mcpScriptPath = join(__dirname, '../mcp-financial-advisor.js');
        const mcpProcess = spawn('node', [mcpScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'production' }
        });

        let stdoutBuffer = '';
        let hasResolved = false;

        const cleanup = () => {
            if (!hasResolved) {
                hasResolved = true;
                try {
                    mcpProcess.kill('SIGTERM');
                    setTimeout(() => { try { mcpProcess.kill('SIGKILL'); } catch (e) {} }, 1000);
                } catch (err) {}
            }
        };

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('MCP call timed out after 30 seconds.'));
        }, 30000);

        mcpProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutBuffer += output;

            if (output.includes('MCP_READY')) {
                const request = JSON.stringify({
                    jsonrpc: "2.0", method: "tools/call",
                    params: { name: toolName, arguments: args },
                    id: `mcp-call-${Date.now()}`
                });
                try {
                    mcpProcess.stdin.write(request + '\n');
                    mcpProcess.stdin.end();
                } catch (err) {
                    clearTimeout(timeout);
                    cleanup();
                    reject(new Error(`Failed to send request to MCP: ${err.message}`));
                }
            }

            if (stdoutBuffer.includes('jsonrpc')) {
                const lines = stdoutBuffer.split('\n');
                for (const line of lines) {
                    if (line.trim().startsWith('{')) {
                        try {
                            const parsed = JSON.parse(line);
                            if (parsed.id?.startsWith('mcp-call-')) {
                                clearTimeout(timeout);
                                if (parsed.result?.isError) reject(new Error(parsed.result.content[0].text));
                                else if (parsed.result.content[0]?.text) resolve(JSON.parse(parsed.result.content[0].text));
                                else if (parsed.error) reject(new Error(parsed.error.message));
                                cleanup();
                                return;
                            }
                        } catch (e) {}
                    }
                }
            }
        });
        mcpProcess.stderr.on('data', (data) => console.error(`[MCP stderr]: ${data.toString().trim()}`));
        mcpProcess.on('close', (code) => { if (!hasResolved) reject(new Error(`MCP process failed with code ${code}`)); });
        mcpProcess.on('error', (err) => reject(new Error(`Failed to start MCP process: ${err.message}`)));
    });
}

router.get('/', optionalAuth, tenantMiddleware, async (req, res) => {
    console.log("--- ✅ Market Data Route Hit ---");
    try {
        const symbolsToFetch = ['GOLD.MCX', 'SILVER.MCX', 'RELIANCE.NSE', 'TCS.NSE', 'HDFCBANK.NSE', 'INFY.NSE', 'SBIN.NSE'];
        console.log('📊 Fetching market data for symbols:', symbolsToFetch);
        
        const result = await callMCPToolSimple('get_market_data', { symbols: symbolsToFetch });

        if (result && result.marketData && Array.isArray(result.marketData)) {
            console.log('✅ Market data retrieved successfully, count:', result.marketData.length);
            res.status(200).json(result.marketData);
        } else {
            throw new Error("Received unexpected or empty data format from market data service.");
        }
    } catch (error) {
        console.error("❌ ERROR in market data route:", {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            message: "Failed to fetch market data.", 
            details: error.message,
            type: error.name
        });
    }
});

router.post('/suggestions', optionalAuth, tenantMiddleware, async (req, res) => {
    console.log("--- 🧠 AI Suggestion Route Hit ---");
    const { marketData } = req.body;

    if (!marketData || !Array.isArray(marketData) || marketData.length === 0) {
        return res.status(400).json({ message: "Market data is required in the request body." });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.error("❌ DeepSeek API key is not configured.");
        return res.status(500).json({ message: "AI service is not configured on the server." });
    }

    const prompt = `Based on the following Indian market data, provide a brief, one-paragraph market summary: ${marketData.map(d => `- ${d.symbol}: Price ${d.price}, Change ${d.changePercent}`).join('\n')}`;

    try {
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a helpful financial analyst assistant." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 150
            },
            { headers: { 'Authorization': `Bearer ${apiKey}` } }
        );

        const suggestion = response.data.choices[0].message.content;
        res.status(200).json({ suggestion: suggestion.trim() });
    } catch (error) {
        console.error("❌ ERROR calling DeepSeek API:", error.response?.data || error.message);
        const details = error.response?.data?.error?.message || error.message;
        res.status(500).json({ message: "Failed to get AI suggestion.", details });
    }
});

export default router;