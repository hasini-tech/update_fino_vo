// ExpensesSection.jsx - Updated with INR
import React from 'react';

const ExpensesSection = ({ data, formatINR }) => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'YTD'];

  const expenseCategories = [
    { key: 'marketingAdvertising', label: 'Marketing & Advertising' },
    { key: 'chatOpt', label: 'ChatOpt' },
    { key: 'canva', label: 'Canva' },
    { key: 'legalFees', label: 'Legal and Professional Fees' },
    { key: 'computersRepair', label: 'Computers and Repair' },
    { key: 'officeExpenses', label: 'Office Expenses' },
    { key: 'deepseekAI', label: 'Deepseek AI' },
    { key: 'claudeAI', label: 'Claude AI' },
    { key: 'openAI', label: 'Open AI' },
    { key: 'utilities', label: 'Utilities' },
    { key: 'internetBill', label: 'Internet Bill/Mobile Recharge' },
    { key: 'internshipExpenses', label: 'Internship Expenses' },
    { key: 'googleWorkspace', label: 'Google Workspace' },
    { key: 'biliaryPayment', label: 'Biliary Payment' },
    { key: 'miscellaneous', label: 'Miscellaneous Expenses/Transporting Expenses' }
  ];

  const calculateTotals = () => {
    if (!data) return [];
    const monthlyTotals = months.slice(0, 12).map((_, index) => 
      expenseCategories.reduce((sum, category) => sum + (data[category.key]?.[index] || 0), 0)
    );
    const ytd = monthlyTotals.reduce((sum, total) => sum + total, 0);
    return [...monthlyTotals, ytd];
  };

  const totals = calculateTotals();

  return (
    <div className="expenses-section section-card">
      <h3>EXPENSES</h3>
      
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
              {expenseCategories.map(category => (
                <tr key={category.key}>
                  <td>{category.label}</td>
                  {data?.[category.key]?.map((amount, index) => (
                    <td key={index}>{formatINR(amount)}</td>
                  ))}
                  <td>{formatINR(data?.[category.key]?.reduce((a, b) => a + b, 0))}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td><strong>TOTAL EXPENSES</strong></td>
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

export default ExpensesSection;