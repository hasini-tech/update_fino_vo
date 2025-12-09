// src/hooks/useMarketData.js
import { useState, useEffect } from 'react';
import { fetchGoldPrice, fetchStockData, fetchMarketSummary } from '../services/api';

export const useMarketData = () => {
  const [marketData, setMarketData] = useState({
    goldPrice: 0,
    goldHistory: [],
    topStocks: [],
    niftyData: {},
    marketSummary: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const [gold, stocks, summary] = await Promise.all([
          fetchGoldPrice(),
          fetchStockData(),
          fetchMarketSummary()
        ]);

        setMarketData({
          goldPrice: gold.currentPrice,
          goldHistory: gold.history,
          topStocks: stocks.topGainers,
          niftyData: summary.nifty,
          marketSummary: summary
        });
      } catch (error) {
        console.error('Error loading market data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMarketData();
    const interval = setInterval(loadMarketData, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return { ...marketData, loading };
};