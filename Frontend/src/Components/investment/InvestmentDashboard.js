// src/components/investment/InvestmentDashboard.js
import React from 'react';
import SmartSuggestionEngine from './SmartSuggestionEngine';
import GoldAdvisor from './GoldAdvisor';
import StockAdvisor from './StockAdvisor';
import AIStockInsights from './AIStockInsights';
import DashboardCard from '../common/DashboardCard';
import { useMarketData } from '../../hooks/useMarketData';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const InvestmentDashboard = () => {
  const { marketSummary, loading } = useMarketData();

  return (
    <div className="investment-dashboard">
      <div className="dashboard-header">
        <h1>Smart Investment Advisor</h1>
        <p>AI-powered insights for smarter investing</p>
      </div>

      {/* Market Summary Widget */}
      <div className="market-pulse">
        <h3>📊 Today's Market Pulse</h3>
        <div className="pulse-cards">
          <DashboardCard
            title="Nifty 50"
            value={marketSummary.nifty}
            change={marketSummary.niftyChange}
            icon={<TrendingUp />}
          />
          <DashboardCard
            title="Sensex"
            value={marketSummary.sensex}
            change={marketSummary.sensexChange}
            icon={<TrendingUp />}
          />
          <DashboardCard
            title="Gold"
            value={marketSummary.gold}
            change={marketSummary.goldChange}
            icon={<TrendingDown />}
          />
        </div>
      </div>

      {/* AI Suggestions */}
      <SmartSuggestionEngine />

      <div className="advisor-grid">
        <div className="grid-column">
          <GoldAdvisor />
          <AIStockInsights />
        </div>
        <div className="grid-column">
          <StockAdvisor />
        </div>
      </div>
    </div>
  );
};

export default InvestmentDashboard;