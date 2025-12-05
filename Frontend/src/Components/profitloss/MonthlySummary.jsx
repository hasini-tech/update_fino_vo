import React from 'react';

const MonthlySummary = ({ data }) => {
  if (!data) return null;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'YTD'];

  const summaryData = months.map((month, index) => {
    if (index === 12) {
      // YTD calculation
      const totalRevenue = (data.revenue?.salesRevenue.reduce((a, b) => a + b, 0) || 0) + 
                          (data.revenue?.otherRevenue.reduce((a, b) => a + b, 0) || 0);
      const totalCogs = Object.values(data.costOfGoodsSold || {}).reduce((sum, arr) => 
        sum + arr.reduce((a, b) => a + b, 0), 0);
      const totalExpenses = Object.values(data.expenses || {}).reduce((sum, arr) => 
        sum + arr.reduce((a, b) => a + b, 0), 0);
      const netProfit = totalRevenue - totalCogs - totalExpenses;

      return {
        month,
        revenue: totalRevenue,
        cogs: totalCogs,
        expenses: totalExpenses,
        netProfit
      };
    }

    const revenue = (data.revenue?.salesRevenue[index] || 0) + (data.revenue?.otherRevenue[index] || 0);
    const cogs = Object.values(data.costOfGoodsSold || {}).reduce((sum, arr) => sum + (arr[index] || 0), 0);
    const expenses = Object.values(data.expenses || {}).reduce((sum, arr) => sum + (arr[index] || 0), 0);
    const netProfit = revenue - cogs - expenses;

    return { month, revenue, cogs, expenses, netProfit };
  });

  return (
    <div className="monthly-summary section-card">
      <h3>MONTHLY SUMMARY</h3>
      
      <div className="summary-content">
        <table className="summary-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Revenue</th>
              <th>COGS</th>
              <th>Expenses</th>
              <th>Net Profit/Loss</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((row, index) => (
              <tr key={row.month} className={row.netProfit < 0 ? 'loss-row' : ''}>
                <td><strong>{row.month}</strong></td>
                <td>¥{row.revenue.toLocaleString()}</td>
                <td>¥{row.cogs.toLocaleString()}</td>
                <td>¥{row.expenses.toLocaleString()}</td>
                <td className={row.netProfit < 0 ? 'loss' : 'profit'}>
                  <strong>¥{row.netProfit.toLocaleString()}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlySummary;