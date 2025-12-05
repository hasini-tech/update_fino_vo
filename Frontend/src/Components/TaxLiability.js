import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TaxLiability = () => {
  const [liability, setLiability] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiability = async () => {
      try {
        const res = await axios.get('/api/tax/liability');
        setLiability(res.data);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    fetchLiability();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Current Year Tax Liability</h2>
      {liability ? (
        <div>
          <p><strong>Year:</strong> {liability.year}</p>
          <p><strong>Total Income:</strong> ${liability.totalIncome.toFixed(2)}</p>
          <p><strong>Deductible Expenses:</strong> ${liability.totalDeductibleExpenses.toFixed(2)}</p>
          <p><strong>Taxable Income:</strong> ${liability.taxableIncome.toFixed(2)}</p>
          <p><strong>Tax Amount:</strong> ${liability.taxAmount.toFixed(2)}</p>
        </div>
      ) : (
        <p>No data found</p>
      )}
    </div>
  );
};

export default TaxLiability;