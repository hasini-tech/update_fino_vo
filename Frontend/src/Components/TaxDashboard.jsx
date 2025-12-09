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
      <div className="mb-4 w-full">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
            ₹{amount?.toLocaleString('en-IN') || '0'} / ₹{total?.toLocaleString('en-IN') || '0'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 rounded-full ${colorClasses[color]} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 overflow-x-hidden w-full max-w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tax Calculator</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Unified Manual Input Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-xl p-4 sm:p-6 mb-6 w-full overflow-x-hidden">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 flex items-center">
          <CalculatorIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-green-500 flex-shrink-0" />
          <span>Quick Tax Calculator</span>
        </h3>
        
        <p className="text-green-700 text-xs sm:text-sm mb-4">
          Enter any income amount to calculate tax instantly. This calculation is separate from your actual income data.
        </p>
        
        <div className="flex flex-col gap-4 w-full">
          <div className="w-full">
            <label className="block text-sm font-medium text-green-700 mb-2">
              Annual Income Amount
            </label>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 font-medium">₹</span>
              <input
                type="number"
                value={manualIncome}
                onChange={(e) => setManualIncome(e.target.value)}
                placeholder="Enter income amount"
                className="pl-10 w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={handleManualTaxCalculation}
              disabled={isCalculatingManual || !manualIncome}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center text-sm"
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
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors duration-200 text-sm whitespace-nowrap"
              >
                Reset to Income Data
              </button>
            )}
          </div>
        </div>

        {taxData?.isManualCalculation && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
              <span className="text-yellow-800 text-xs sm:text-sm">
                Showing manual calculation for ₹{taxData.manualIncome?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={loadTaxData}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50 text-sm"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {taxData && (
        <div className="space-y-6 w-full overflow-x-hidden">
          {/* Information Banner */}
          {!taxData.hasIncomeData && !taxData.isManualCalculation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-blue-800 font-semibold mb-1 text-sm sm:text-base">No Income Data Available</h3>
                  <p className="text-blue-700 text-xs sm:text-sm">
                    Add your income data in the Income Module to see personalized tax calculations, 
                    or use the Quick Tax Calculator above.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Visualization - Only show if we have data */}
          {(taxData.hasIncomeData || taxData.isManualCalculation) && (
            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg w-full overflow-x-hidden">
              <h3 className="text-base sm:text-lg font-semibold mb-4">Tax Calculation Breakdown</h3>
              
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
              {/* Income Sources */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-0 overflow-x-hidden">
                <h4 className="font-semibold mb-3 text-gray-700 text-sm sm:text-base">Income Sources</h4>
                {taxData.incomeBreakdown && Object.entries(taxData.incomeBreakdown).map(([source, amount]) => (
                  <div key={source} className="flex justify-between items-center py-2 border-b border-gray-100 gap-2">
                    <span className="capitalize text-gray-600 text-sm truncate">{source}</span>
                    <span className="font-medium text-sm whitespace-nowrap">₹{amount?.toLocaleString('en-IN') || '0'}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 font-bold border-t border-gray-200 mt-2 gap-2">
                  <span className="text-sm sm:text-base">Total Income</span>
                  <span className="text-sm sm:text-base whitespace-nowrap">₹{taxData.totalIncome?.toLocaleString('en-IN') || '0'}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-0 overflow-x-hidden">
                <h4 className="font-semibold mb-3 text-gray-700 text-sm sm:text-base">Deductions</h4>
                {taxData.deductionBreakdown && Object.entries(taxData.deductionBreakdown).map(([deduction, amount]) => (
                  <div key={deduction} className="flex justify-between items-center py-2 border-b border-gray-100 gap-2">
                    <span className="capitalize text-gray-600 text-sm truncate">{deduction}</span>
                    <span className="font-medium text-green-600 text-sm whitespace-nowrap">
                      ₹{amount?.toLocaleString('en-IN') || '0'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 font-bold border-t border-gray-200 mt-2 gap-2">
                  <span className="text-sm sm:text-base">Total Deductions</span>
                  <span className="text-green-600 text-sm sm:text-base whitespace-nowrap">
                    ₹{taxData.totalDeductions?.toLocaleString('en-IN') || '0'}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-2">
                  Using: {taxData.deductionUsed || 'standard'} deduction
                </div>
              </div>
            </div>
          )}

          {/* Tax Summary - Only show if we have data */}
          {(taxData.hasIncomeData || taxData.isManualCalculation) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 w-full overflow-x-hidden">
              <h4 className="font-semibold mb-4 text-blue-800 text-sm sm:text-base">Tax Summary</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-blue-600 mb-1 truncate">Taxable Income</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-800 truncate">
                    ₹{taxData.taxableIncome?.toLocaleString('en-IN') || '0'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-blue-600 mb-1 truncate">Tax Rate</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-800">
                    {taxData.taxableIncome > 0 ? ((taxData.taxLiability / taxData.taxableIncome) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-blue-600 mb-1 truncate">Tax Liability</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-800 truncate">
                    ₹{taxData.taxLiability?.toLocaleString('en-IN') || '0'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-blue-600 mb-1 truncate">Effective Rate</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-800">
                    {taxData.totalIncome > 0 ? ((taxData.taxLiability / taxData.totalIncome) * 100).toFixed(1) : '0'}%
                  </p>
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