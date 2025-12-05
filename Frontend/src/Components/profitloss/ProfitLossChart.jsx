// ProfitLossChart.jsx - Updated with INR
import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ProfitLossChart = ({ data, formatINR }) => {
  if (!data) return null;

  const chartData = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ].map((month, index) => {
    const revenue = (data.revenue?.salesRevenue[index] || 0) + (data.revenue?.otherRevenue[index] || 0);
    const cogs = Object.values(data.costOfGoodsSold || {}).reduce((sum, arr) => sum + (arr[index] || 0), 0);
    const expenses = Object.values(data.expenses || {}).reduce((sum, arr) => sum + (arr[index] || 0), 0);
    const netProfit = revenue - cogs - expenses;

    return {
      month,
      revenue,
      cogs,
      expenses,
      netProfit,
      grossProfit: revenue - cogs
    };
  });

  // Custom tooltip formatter for INR
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatINR(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="profit-loss-chart section-card">
      <h3>PROFIT & LOSS TREND</h3>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `₹${(value/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
            <Line type="monotone" dataKey="grossProfit" stroke="#82ca9d" strokeWidth={2} />
            <Line type="monotone" dataKey="netProfit" stroke="#ff7300" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `₹${(value/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
            <Bar dataKey="cogs" fill="#ff8042" name="COGS" />
            <Bar dataKey="expenses" fill="#ffc658" name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProfitLossChart;