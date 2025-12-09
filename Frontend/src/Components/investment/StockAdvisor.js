// src/components/investment/StockAdvisor.js
import React, { useState } from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import { usePredictions } from '../../hooks/usePredictions';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';

const StockAdvisor = () => {
  const { topStocks, niftyData } = useMarketData();
  const { stockPredictions } = usePredictions();
  const [selectedSector, setSelectedSector] = useState('all');

  const sectors = ['IT', 'Pharma', 'Banking', 'Energy', 'Auto'];

  return (
    <div className="stock-advisor">
      <h3>📈 Stock Market Advisor</h3>
      
      <div className="sector-filter">
        {sectors.map(sector => (
          <button
            key={sector}
            className={`sector-btn ${selectedSector === sector ? 'active' : ''}`}
            onClick={() => setSelectedSector(sector)}
          >
            {sector}
          </button>
        ))}
      </div>

      <div className="stock-list">
        <h4>Top Stock Picks</h4>
        {topStocks
          .filter(stock => selectedSector === 'all' || stock.sector === selectedSector)
          .slice(0, 5)
          .map(stock => (
            <div key={stock.symbol} className="stock-item">
              <div className="stock-info">
                <span className="symbol">{stock.symbol}</span>
                <span className="name">{stock.name}</span>
                <span className="sector">{stock.sector}</span>
              </div>
              <div className="stock-performance">
                <span className={`price ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                  ₹{stock.price}
                </span>
                <span className={`change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                  {stock.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                  {Math.abs(stock.change)}%
                </span>
              </div>
              <div className="ai-rating">
                <Star fill="gold" />
                <span>{stock.rating}/5</span>
              </div>
            </div>
          ))}
      </div>

      <div className="market-summary">
        <h4>Market Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span>Nifty 50</span>
            <span>₹{niftyData?.value}</span>
            <span className={niftyData?.change >= 0 ? 'positive' : 'negative'}>
              {niftyData?.change}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAdvisor;