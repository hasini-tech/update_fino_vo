// src/components/investment/AIStockInsights.js
import React from 'react';
import { usePredictions } from '../../hooks/usePredictions';
import { Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react';

const AIStockInsights = () => {
  const { insights, sentiment } = usePredictions();

  return (
    <div className="ai-insights">
      <h3>🤖 AI Stock Insights</h3>
      
      <div className="sentiment-analysis">
        <h4>Market Sentiment</h4>
        <div className={`sentiment ${sentiment?.overall}`}>
          <span>{sentiment?.overall || 'Neutral'}</span>
          <span>Score: {sentiment?.score || 0}/10</span>
        </div>
      </div>

      <div className="insights-list">
        {insights.map((insight, index) => (
          <div key={index} className="insight-item">
            <div className="insight-icon">
              {insight.type === 'buy' ? <TrendingUp /> : <AlertTriangle />}
            </div>
            <div className="insight-content">
              <span className="stock">{insight.stock}</span>
              <p>{insight.message}</p>
              <span className="confidence">
                Confidence: {insight.confidence}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-tips">
        <Lightbulb />
        <p>AI analyzes market trends, news sentiment, and technical indicators</p>
      </div>
    </div>
  );
};

export default AIStockInsights;