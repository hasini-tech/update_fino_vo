import React, { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AITaxSlabGenerator from '../Components/AITaxSlabGenerator';

// Keep these exactly as they were (safe imports)
const TaxDashboard = React.lazy(() => import('../Components/TaxDashboard'));
const TaxCalculator = React.lazy(() => import('../Components/TaxCalculator'));

// Error Boundary (Keep as is)
const ErrorBoundary = ({ children, componentName }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) return <div className="text-red-600 p-4">Error loading {componentName}</div>;
  return children;
};

// Formatter (Keep as is)
const formatIndianRupee = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// --- MODIFIED MANAGER COMPONENT ---
const IncomeTaxSlabsManager = ({ userSession, tenantId, onSlabsUpdated }) => {
  const [slabs, setSlabs] = useState([]);
  const [financialYear, setFinancialYear] = useState('2024-2025');

  // Fetch Slabs Function
  const fetchSlabs = async () => {
    try {
      const response = await axios.get(`/api/tax/slabs?financialYear=${financialYear}`, {
        headers: { 'x-tenant-id': tenantId, 'Authorization': `Bearer ${userSession.token}` }
      });
      if (response.data.success) {
        setSlabs(response.data.data.slabs || []);
      }
    } catch (error) {
      console.error('Error fetching slabs:', error);
      toast.error('Failed to load tax slabs');
    }
  };

  useEffect(() => {
    if (userSession?.isAuthenticated && tenantId) fetchSlabs();
  }, [userSession, tenantId, financialYear]);

  // Callback when AI saves new slabs -> Updates the list immediately
  const handleSlabsGenerated = (newSlabs) => {
    setSlabs(newSlabs);
    if (onSlabsUpdated) onSlabsUpdated();
  };

  // Delete Slab Handler
  const handleDeleteSlab = async (slabId) => {
    if (!window.confirm('Delete this slab?')) return;
    try {
      await axios.delete(`/api/tax/slabs/${slabId}?financialYear=${financialYear}`, {
        headers: { 'x-tenant-id': tenantId, 'Authorization': `Bearer ${userSession.token}` }
      });
      fetchSlabs();
      if (onSlabsUpdated) onSlabsUpdated();
      toast.success('Slab deleted');
    } catch (error) {
      toast.error('Failed to delete slab');
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* 1. AI GENERATOR */}
      <AITaxSlabGenerator 
        userSession={userSession}
        tenantId={tenantId}
        onSlabsGenerated={handleSlabsGenerated}
      />

    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
const TaxPage = ({ userSession }) => {
  const [slabsUpdated, setSlabsUpdated] = useState(0);
  const tenantId = userSession?.tenantId || localStorage.getItem('tenantId');

  return (
    <div className="min-h-screen bg-gray-50 py-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tax Center</h1>
          <p className="text-gray-600 mt-2">Manage tax slabs and calculate obligations</p>
        </div>

        {/* 1. Slabs Manager (Includes new AI Generator) */}
        <section className="mb-8 overflow-x-hidden">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-x-hidden">
            <ErrorBoundary componentName="Tax Slabs Manager">
              <IncomeTaxSlabsManager 
                userSession={userSession} 
                tenantId={tenantId}
                onSlabsUpdated={() => setSlabsUpdated(prev => prev + 1)}
              />
            </ErrorBoundary>
          </div>
        </section>

        {/* 2. Dashboard */}
        <section className="mb-8 overflow-x-hidden">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tax Overview</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-x-hidden">
            <ErrorBoundary componentName="Tax Dashboard">
              <Suspense fallback={
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading tax dashboard...</p>
                  </div>
                </div>
              }>
                <TaxDashboard userSession={userSession} key={`dashboard-${slabsUpdated}`} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </section>
        
        {/* 3. Calculator */}
        <section className="overflow-x-hidden">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tax Calculator</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-x-hidden">
            <ErrorBoundary componentName="Tax Calculator">
              <Suspense fallback={
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading calculator...</p>
                  </div>
                </div>
              }>
                <TaxCalculator userSession={userSession} key={`calculator-${slabsUpdated}`} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TaxPage;