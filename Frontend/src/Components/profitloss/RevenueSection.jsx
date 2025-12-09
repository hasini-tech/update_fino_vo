// RevenueSection.jsx - Updated with INR
import React from 'react';

const RevenueSection = ({ data, formatINR }) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'YTD'];
  
  const calculateTotals = (categoryData) => {
    const monthlyTotals = categoryData.map((_, index) => 
      Object.values(data).reduce((sum, arr) => sum + (arr[index] || 0), 0)
    );
    const ytd = monthlyTotals.reduce((sum, total) => sum + total, 0);
    return [...monthlyTotals, ytd];
  };

  const totals = data ? calculateTotals(data.salesRevenue) : [];

  return (
    <div className="revenue-section section-card">
      <h3>REVENUE</h3>
      
      <div className="section-content">
        <div className="profit-loss-table-container">
          <table className="profit-loss-table">
            <thead>
              <tr>
                <th>Category</th>
                {months.map(month => (
                  <th key={month}>{month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sales Revenue</td>
                {data?.salesRevenue?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.salesRevenue?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr>
                <td>Other Revenue</td>
                {data?.otherRevenue?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.otherRevenue?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr>
                <td>Sales Discounts</td>
                {data?.salesDiscounts?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.salesDiscounts?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr>
                <td>Sales Returns, allowances and others</td>
                {data?.salesReturns?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.salesReturns?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr className="total-row">
                <td><strong>TOTAL REVENUE</strong></td>
                {totals.map((total, index) => (
                  <td key={index}><strong>{formatINR(total)}</strong></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueSection;