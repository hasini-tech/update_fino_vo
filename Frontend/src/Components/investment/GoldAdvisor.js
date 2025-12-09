// src/components/investment/GoldAdvisor.js
import React, { useState } from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import { usePredictions } from '../../hooks/usePredictions';
import PriceChart from './charts/PriceChart';
import { TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';

const GoldAdvisor = () => {
  const { goldPrice, goldHistory } = useMarketData();
  const { goldPrediction } = usePredictions();
  const [timeframe, setTimeframe] = useState('1m');

  const getRecommendation = () => {
    if (!goldPrediction) return 'Loading...';
    
    const trend = goldPrediction.trend;
    if (trend === 'up') return 'Consider buying gold now';
    if (trend === 'down') return 'Wait for better prices';
    return 'Hold current position';
  };

  return (
    <div className="gold-advisor">
      <h3>🥇 Gold Investment Advisor</h3>
      
      <div className="gold-overview">
        <div className="gold-price">
          <span className="price">₹{goldPrice}/gram</span>
          <span className={`change ${goldHistory?.change >= 0 ? 'positive' : 'negative'}`}>
            {goldHistory?.change >= 0 ? <TrendingUp /> : <TrendingDown />}
            {Math.abs(goldHistory?.change || 0)}%
          </span>
        </div>
        
        <div className="gold-recommendation">
          <ShoppingCart />
          <span>{getRecommendation()}</span>
        </div>
      </div>

      <div className="gold-chart">
        <PriceChart 
          data={goldHistory?.prices || []}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
      </div>

      <div className="gold-prediction">
        <h4>AI Prediction</h4>
        <p>{goldPrediction?.message || 'Analyzing market trends...'}</p>
      </div>
    </div>
  );
};

export default GoldAdvisor;