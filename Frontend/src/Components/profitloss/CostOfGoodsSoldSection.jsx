// CostOfGoodsSoldSection.jsx - Updated with INR
import React from 'react';

const CostOfGoodsSoldSection = ({ data, formatINR }) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'YTD'];

  const calculateTotals = () => {
    if (!data) return [];
    const monthlyTotals = months.slice(0, 12).map((_, index) => 
      Object.values(data).reduce((sum, arr) => sum + (arr[index] || 0), 0)
    );
    const ytd = monthlyTotals.reduce((sum, total) => sum + total, 0);
    return [...monthlyTotals, ytd];
  };

  const totals = calculateTotals();

  return (
    <div className="cogs-section section-card">
      <h3>COST OF GOODS SOLD</h3>
      
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
                <td>AWS Server</td>
                {data?.awsServer?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.awsServer?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr>
                <td>Direct Salaries</td>
                {data?.directSalaries?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.directSalaries?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr>
                <td>Internship Salaries</td>
                {data?.internshipSalaries?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.internshipSalaries?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr>
                <td>Secured Funds</td>
                {data?.securedFunds?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.securedFunds?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr>
                <td>Project Profit Share</td>
                {data?.projectProfitShare?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.projectProfitShare?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr>
                <td>Internship Profit Share</td>
                {data?.internshipProfitShare?.map((amount, index) => (
                  <td key={index}>{formatINR(amount)}</td>
                ))}
                <td>{formatINR(data?.internshipProfitShare?.reduce((a, b) => a + b, 0))}</td>
              </tr>
              <tr className="total-row">
                <td><strong>TOTAL COGS</strong></td>
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

export default CostOfGoodsSoldSection;