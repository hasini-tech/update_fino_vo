import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TaxReport = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async (selectedYear) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/tax/report/${selectedYear}`);
      setReport(res.data);
    } catch (error) {
      console.error(error);
      setReport(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport(year);
  }, [year]);

  const handleYearChange = (e) => {
    setYear(e.target.value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Tax Report</h2>
      <div className="mb-4">
        <label htmlFor="year" className="block text-sm font-medium text-gray-700">Select Year</label>
        <select
          id="year"
          value={year}
          onChange={handleYearChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading && <div>Loading...</div>}

      {report ? (
        <div>
          <p><strong>Year:</strong> {report.year}</p>
          <p><strong>Total Income:</strong> ${report.totalIncome.toFixed(2)}</p>
          <p><strong>Deductible Expenses:</strong> ${report.totalDeductibleExpenses.toFixed(2)}</p>
          <p><strong>Taxable Income:</strong> ${report.taxableIncome.toFixed(2)}</p>
          <p><strong>Tax Amount:</strong> ${report.taxAmount.toFixed(2)}</p>
          <p><strong>Report Generated:</strong> {new Date(report.createdAt).toLocaleDateString()}</p>
        </div>
      ) : (
        !loading && <p>No report found for the selected year.</p>
      )}
    </div>
  );
};

export default TaxReport;