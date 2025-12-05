import React from 'react';

const ProfitLossHeader = ({ timeRange, onTimeRangeChange, selectedMonth, onMonthChange }) => {
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ALL'
  ];

  return (
    <div className="profit-loss-header">
      <div className="header-main">
        <h1>TECH VASEEGRAH 2025</h1>
        <h2>Monthly Profit and Loss Statement</h2>
        <p>For the Year Ended {timeRange}</p>
      </div>
      
      <div className="header-controls">
        <div className="time-range-selector">
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => onTimeRangeChange(e.target.value)}>
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>
        
        <div className="month-selector">
          <label>Show Month:</label>
          <select value={selectedMonth} onChange={(e) => onMonthChange(e.target.value)}>
            {months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossHeader;