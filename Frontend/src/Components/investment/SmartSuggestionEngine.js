// src/components/investment/SmartSuggestionEngine.js
import React from 'react';
import { useUserFinance } from '../../hooks/useUserFinance';
import { calculateInvestmentSuggestions } from '../../services/ai/suggestionEngine';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const SmartSuggestionEngine = () => {
  const { userData } = useUserFinance();
  const suggestions = calculateInvestmentSuggestions(userData);

  const chartData = [
    { name: 'Stocks', value: suggestions.stocks.allocation },
    { name: 'Gold', value: suggestions.gold.allocation },
    { name: 'Emergency', value: suggestions.emergency.allocation },
  ];

  const COLORS = ['#0088FE', '#FFBB28', '#00C49F'];

  return (
    <div className="suggestion-engine">
      <h3>💡 Smart Investment Suggestions</h3>
      <div className="suggestion-content">
        <div className="suggestion-chart">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="suggestion-details">
          <div className="suggestion-item">
            <span className="amount">₹{suggestions.stocks.amount}</span>
            <span className="type">in Stocks/Mutual Funds</span>
            <span className="allocation">{suggestions.stocks.allocation}%</span>
          </div>
          
          <div className="suggestion-item">
            <span className="amount">₹{suggestions.gold.amount}</span>
            <span className="type">in Gold</span>
            <span className="allocation">{suggestions.gold.allocation}%</span>
          </div>
          
          <div className="risk-profile">
            <span>Risk Profile: {suggestions.riskProfile}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSuggestionEngine;