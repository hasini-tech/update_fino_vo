import React, { useState, useEffect } from 'react';
import { 
  InformationCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';

const TaxCalculator = ({ userSession }) => {
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualIncome, setManualIncome] = useState('');
  const [isCalculatingManual, setIsCalculatingManual] = useState(false);

  useEffect(() => {
    // Simulate loading tax data
    loadTaxData();
  }, [userSession]);

  const loadTaxData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulated data
      setTimeout(() => {
        setTaxData({
          totalIncome: 1200,
          totalDeductions: 75000,
          taxableIncome: 0,
          taxLiability: 0,
          hasIncomeData: true,
          isManualCalculation: false,
          incomeBreakdown: {
            freelance: 1200
          },
          deductionBreakdown: {
            standard: 75000
          },
          deductionUsed: 'standard'
        });
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading tax data:', error);
      setError('Failed to load tax data');
      setLoading(false);
    }
  };

  const handleManualTaxCalculation = async () => {
    if (!manualIncome || manualIncome < 0) {
      setError('Please enter a valid income amount');
      return;
    }

    try {
      setIsCalculatingManual(true);
      setError(null);
      
      // Calculate manual tax
      const income = parseFloat(manualIncome);
      const standardDeduction = 75000;
      const taxableIncome = Math.max(0, income - standardDeduction);
      
      // Simple tax calculation
      let tax = 0;
      if (taxableIncome > 1500000) {
        tax += (taxableIncome - 1500000) * 0.30;
        tax += 300000 * 0.20;
        tax += 300000 * 0.15;
        tax += 300000 * 0.10;
        tax += 300000 * 0.05;
      } else if (taxableIncome > 1200000) {
        tax += (taxableIncome - 1200000) * 0.20;
        tax += 300000 * 0.15;
        tax += 300000 * 0.10;
        tax += 300000 * 0.05;
      } else if (taxableIncome > 900000) {
        tax += (taxableIncome - 900000) * 0.15;
        tax += 300000 * 0.10;
        tax += 300000 * 0.05;
      } else if (taxableIncome > 600000) {
        tax += (taxableIncome - 600000) * 0.10;
        tax += 300000 * 0.05;
      } else if (taxableIncome > 300000) {
        tax += (taxableIncome - 300000) * 0.05;
      }
      
      // Add 4% cess
      tax = tax * 1.04;
      
      setTaxData({
        totalIncome: income,
        totalDeductions: standardDeduction,
        taxableIncome: taxableIncome,
        taxLiability: Math.round(tax),
        hasIncomeData: true,
        isManualCalculation: true,
        manualIncome: income,
        incomeBreakdown: {
          manual: income
        },
        deductionBreakdown: {
          standard: standardDeduction
        },
        deductionUsed: 'standard'
      });
      
    } catch (error) {
      console.error('Error calculating manual tax:', error);
      setError('Failed to calculate manual tax');
    } finally {
      setIsCalculatingManual(false);
    }
  };

  const handleResetToIncomeTax = async () => {
    setManualIncome('');
    loadTaxData();
  };

  const TaxProgressBar = ({ label, amount, total, color = 'blue' }) => {
    const percentage = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
    
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      red: 'bg-red-500'
    };

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-sm font-bold text-gray-900">
            ₹{amount?.toLocaleString('en-IN') || '0'} / ₹{total?.toLocaleString('en-IN') || '0'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${colorClasses[color]}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const getCurrentTaxRates = () => {
    return {
      year: new Date().getFullYear(),
      brackets: [
        { range: "Up to ₹3,00,000", rate: "0%", description: "No tax" },
        { range: "₹3,00,001 - ₹6,00,000", rate: "5%", description: "Tax on amount exceeding ₹3L" },
        { range: "₹6,00,001 - ₹9,00,000", rate: "10%", description: "Tax on amount exceeding ₹6L" },
        { range: "₹9,00,001 - ₹12,00,000", rate: "15%", description: "Tax on amount exceeding ₹9L" },
        { range: "₹12,00,001 - ₹15,00,000", rate: "20%", description: "Tax on amount exceeding ₹12L" },
        { range: "Above ₹15,00,000", rate: "30%", description: "Tax on amount exceeding ₹15L" }
      ],
      deductions: {
        standard: "₹75,000 (Standard Deduction)",
        section80C: "₹1,50,000 (Various investments)",
        hra: "House Rent Allowance",
        medical: "Medical Insurance"
      },
      cess: "4% Health and Education Cess on total tax"
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tax Calculator</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Manual Input Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <CalculatorIcon className="h-6 w-6 mr-2 text-green-600" />
          Quick Tax Calculator
        </h3>
        
        <p className="text-green-700 text-sm mb-4">
          Enter any income amount to calculate tax instantly. This calculation is separate from your actual income data.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-green-700 mb-2">
              Annual Income Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-semibold text-lg">₹</span>
              <input
                type="number"
                value={manualIncome}
                onChange={(e) => setManualIncome(e.target.value)}
                placeholder="Enter income amount"
                className="pl-10 w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={handleManualTaxCalculation}
              disabled={isCalculatingManual || !manualIncome}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
            >
              {isCalculatingManual ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <CalculatorIcon className="h-4 w-4 mr-2" />
                  Calculate Tax
                </>
              )}
            </button>

            {taxData?.isManualCalculation && (
              <button
                onClick={handleResetToIncomeTax}
                className="flex-1 sm:flex-none bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 whitespace-nowrap"
              >
                Reset to Income Data
              </button>
            )}
          </div>
        </div>

        {taxData?.isManualCalculation && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
            <div className="flex items-center">
              <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
              <span className="text-yellow-800 text-sm font-medium">
                Showing manual calculation for ₹{taxData.manualIncome?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mb-6">
        <button
          onClick={loadTaxData}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors duration-200"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {taxData && (
        <div className="space-y-6">
          {/* Information Banner */}
          {!taxData.hasIncomeData && !taxData.isManualCalculation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-blue-800 font-semibold mb-1">No Income Data Available</h3>
                  <p className="text-blue-700 text-sm">
                    Add your income data in the Income Module to see personalized tax calculations, 
                    or use the Quick Tax Calculator above.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Visualization */}
          {(taxData.hasIncomeData || taxData.isManualCalculation) && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Tax Calculation Breakdown</h3>
              
              <TaxProgressBar
                label="Total Income"
                amount={taxData.totalIncome}
                total={taxData.totalIncome}
                color="blue"
              />
              
              <TaxProgressBar
                label="Deductions Applied"
                amount={taxData.totalDeductions}
                total={taxData.totalIncome}
                color="green"
              />
              
              <TaxProgressBar
                label="Taxable Income"
                amount={taxData.taxableIncome}
                total={taxData.totalIncome}
                color="purple"
              />
              
              <TaxProgressBar
                label="Tax Liability"
                amount={taxData.taxLiability}
                total={taxData.taxableIncome || taxData.totalIncome}
                color="red"
              />
            </div>
          )}

          {/* Detailed Breakdown */}
          {(taxData.hasIncomeData || taxData.isManualCalculation) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Sources */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Income Sources</h4>
                <div className="space-y-3">
                  {taxData.incomeBreakdown && Object.entries(taxData.incomeBreakdown).map(([source, amount]) => (
                    <div key={source} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="capitalize text-gray-700 font-medium">{source}</span>
                      <span className="font-semibold text-gray-900">₹{amount?.toLocaleString('en-IN') || '0'}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center py-3 px-3 font-bold bg-blue-50 rounded-lg mt-4 border-t-2 border-blue-200">
                  <span className="text-blue-800">Total Income</span>
                  <span className="text-blue-900">₹{taxData.totalIncome?.toLocaleString('en-IN') || '0'}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Deductions</h4>
                <div className="space-y-3">
                  {taxData.deductionBreakdown && Object.entries(taxData.deductionBreakdown).map(([deduction, amount]) => (
                    <div key={deduction} className="flex justify-between items-center py-2 px-3 bg-green-50 rounded-lg">
                      <span className="capitalize text-gray-700 font-medium">{deduction}</span>
                      <span className="font-semibold text-green-700">
                        ₹{amount?.toLocaleString('en-IN') || '0'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center py-3 px-3 font-bold bg-green-50 rounded-lg mt-4 border-t-2 border-green-200">
                  <span className="text-green-800">Total Deductions</span>
                  <span className="text-green-900">
                    ₹{taxData.totalDeductions?.toLocaleString('en-IN') || '0'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="font-medium">Using:</span> {taxData.deductionUsed || 'standard'} deduction
                </div>
              </div>
            </div>
          )}

          {/* Tax Summary */}
          {(taxData.hasIncomeData || taxData.isManualCalculation) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
              <h4 className="font-bold text-xl mb-5 text-blue-900">Tax Summary</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <p className="text-sm text-blue-700 font-medium mb-1">Taxable Income</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ₹{taxData.taxableIncome?.toLocaleString('en-IN') || '0'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <p className="text-sm text-blue-700 font-medium mb-1">Tax Rate</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {taxData.taxableIncome > 0 ? ((taxData.taxLiability / taxData.taxableIncome) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-red-100 shadow-sm">
                  <p className="text-sm text-red-700 font-medium mb-1">Tax Liability</p>
                  <p className="text-2xl font-bold text-red-900">
                    ₹{taxData.taxLiability?.toLocaleString('en-IN') || '0'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <p className="text-sm text-blue-700 font-medium mb-1">Effective Rate</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {taxData.totalIncome > 0 ? ((taxData.taxLiability / taxData.totalIncome) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tax Rates Information */}
          {!taxData.hasIncomeData && !taxData.isManualCalculation && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200 shadow-sm">
              <h3 className="text-lg font-bold text-indigo-900 mb-5 flex items-center">
                <InformationCircleIcon className="h-6 w-6 mr-2" />
                Current Tax Rates (FY {getCurrentTaxRates().year}-{getCurrentTaxRates().year + 1})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <h4 className="font-bold text-indigo-800 mb-4 text-base">Income Tax Slabs</h4>
                  <div className="space-y-3">
                    {getCurrentTaxRates().brackets.map((bracket, index) => (
                      <div key={index} className="flex justify-between items-center py-3 px-3 border-b border-indigo-100 hover:bg-indigo-50 rounded transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{bracket.range}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{bracket.description}</p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-900 px-3 py-1.5 rounded-lg text-sm font-bold ml-3">
                          {bracket.rate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <h4 className="font-bold text-indigo-800 mb-4 text-base">Common Deductions</h4>
                  <div className="space-y-3">
                    {Object.entries(getCurrentTaxRates().deductions).map(([key, value]) => (
                      <div key={key} className="py-3 px-3 border-b border-indigo-100 hover:bg-indigo-50 rounded transition-colors">
                        <p className="text-sm font-semibold text-gray-800 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-900">
                      <strong className="font-bold">Note:</strong> {getCurrentTaxRates().cess}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaxCalculator;