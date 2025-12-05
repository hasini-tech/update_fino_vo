// frontend/src/Components/TaxCalculator.jsx
import React, { useState, useEffect } from 'react';
import { 
  InformationCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';
import taxService from '../services/taxService';

const TaxCalculator = ({ userSession }) => {
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualIncome, setManualIncome] = useState('');
  const [isCalculatingManual, setIsCalculatingManual] = useState(false);

  useEffect(() => {
    const tenantId = userSession?.user?.tenantId || localStorage.getItem('tenantId');
    if (!tenantId) {
      setError('Tenant ID not found. Please log in again.');
      return;
    }
    loadTaxData();
  }, [userSession]);

  const loadTaxData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await taxService.getCurrentTaxCalculation();
      setTaxData(response.data.data);
    } catch (error) {
      console.error('Error loading tax data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load tax data';
      setError(errorMessage);
    } finally {
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
      
      console.log('🔄 Starting manual tax calculation...');
      const response = await taxService.calculateManualTax(manualIncome);
      console.log('✅ Manual tax response:', response.data);
      
      setTaxData(response.data.data);
      
    } catch (error) {
      console.error('❌ Error calculating manual tax:', error);
      setError(error.response?.data?.message || 'Failed to calculate manual tax');
    } finally {
      setIsCalculatingManual(false);
    }
  };

  const handleResetToIncomeTax = async () => {
    try {
      setLoading(true);
      const response = await taxService.resetToIncomeTax();
      setTaxData(response.data.data);
      setManualIncome('');
      console.log('✅ Reset to income-based tax calculation');
    } catch (error) {
      console.error('❌ Error resetting tax calculation:', error);
      setError(error.response?.data?.message || 'Failed to reset tax calculation');
    } finally {
      setLoading(false);
    }
  };

  const TaxProgressBar = ({ label, amount, total, color = 'blue' }) => {
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      red: 'bg-red-500'
    };

    return (
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-medium text-gray-900">
            ₹{amount?.toLocaleString('en-IN') || '0'} / ₹{total?.toLocaleString('en-IN') || '0'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${colorClasses[color]}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Get current tax rates for display
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tax Calculator</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Unified Manual Input Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <CalculatorIcon className="h-6 w-6 mr-2 text-green-500" />
          Quick Tax Calculator
        </h3>
        
        <p className="text-green-700 text-sm mb-4">
          Enter any income amount to calculate tax instantly. This calculation is separate from your actual income data.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-green-700 mb-2">
              Annual Income Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-medium">₹</span>
              <input
                type="number"
                value={manualIncome}
                onChange={(e) => setManualIncome(e.target.value)}
                placeholder="Enter income amount"
                className="pl-10 w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleManualTaxCalculation}
              disabled={isCalculatingManual || !manualIncome}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center"
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
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Reset to Income Data
              </button>
            )}
          </div>
        </div>

        {taxData?.isManualCalculation && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 text-sm">
                  Showing manual calculation for ₹{taxData.manualIncome?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={loadTaxData}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
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

          {/* Progress Visualization - Only show if we have data */}
          {(taxData.hasIncomeData || taxData.isManualCalculation) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Tax Calculation Breakdown</h3>
              
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
                total={taxData.taxableIncome}
                color="red"
              />
            </div>
          )}

          {/* Detailed Breakdown - Only show if we have data */}
          {(taxData.hasIncomeData || taxData.isManualCalculation) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income Sources */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-gray-700">Income Sources</h4>
                {taxData.incomeBreakdown && Object.entries(taxData.incomeBreakdown).map(([source, amount]) => (
                  <div key={source} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="capitalize text-gray-600">{source}</span>
                    <span className="font-medium">₹{amount?.toLocaleString('en-IN') || '0'}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold border-t border-gray-200 mt-2">
                  <span>Total Income</span>
                  <span>₹{taxData.totalIncome?.toLocaleString('en-IN') || '0'}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-gray-700">Deductions</h4>
                {taxData.deductionBreakdown && Object.entries(taxData.deductionBreakdown).map(([deduction, amount]) => (
                  <div key={deduction} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="capitalize text-gray-600">{deduction}</span>
                    <span className="font-medium text-green-600">
                      ₹{amount?.toLocaleString('en-IN') || '0'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-bold border-t border-gray-200 mt-2">
                  <span>Total Deductions</span>
                  <span className="text-green-600">
                    ₹{taxData.totalDeductions?.toLocaleString('en-IN') || '0'}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Using: {taxData.deductionUsed || 'standard'} deduction
                </div>
              </div>
            </div>
          )}

          {/* Tax Summary - Only show if we have data */}
          {(taxData.hasIncomeData || taxData.isManualCalculation) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-blue-800">Tax Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-blue-600">Taxable Income</p>
                  <p className="text-xl font-bold text-blue-800">
                    ₹{taxData.taxableIncome?.toLocaleString('en-IN') || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-600">Tax Rate</p>
                  <p className="text-xl font-bold text-blue-800">
                    {taxData.taxableIncome > 0 ? ((taxData.taxLiability / taxData.taxableIncome) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-600">Tax Liability</p>
                  <p className="text-xl font-bold text-blue-800">
                    ₹{taxData.taxLiability?.toLocaleString('en-IN') || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-600">Effective Rate</p>
                  <p className="text-xl font-bold text-blue-800">
                    {taxData.totalIncome > 0 ? ((taxData.taxLiability / taxData.totalIncome) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tax Rates Information (when no data) */}
          {!taxData.hasIncomeData && !taxData.isManualCalculation && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200">
              <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                Current Tax Rates (FY {getCurrentTaxRates().year}-{getCurrentTaxRates().year + 1})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-indigo-700 mb-3">Income Tax Slabs</h4>
                  <div className="space-y-2">
                    {getCurrentTaxRates().brackets.map((bracket, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-indigo-100">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{bracket.range}</p>
                          <p className="text-xs text-gray-600">{bracket.description}</p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-semibold">
                          {bracket.rate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-indigo-700 mb-3">Common Deductions</h4>
                  <div className="space-y-2">
                    {Object.entries(getCurrentTaxRates().deductions).map(([key, value]) => (
                      <div key={key} className="py-2 border-b border-indigo-100">
                        <p className="text-sm text-gray-800 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-xs text-gray-600">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> {getCurrentTaxRates().cess}
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