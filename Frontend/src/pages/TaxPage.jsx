// frontend/src/pages/TaxPage.jsx
import React, { useState, useEffect, Suspense } from 'react';

// Safe component imports with error boundaries
const TaxDashboard = React.lazy(() => import('../Components/TaxDashboard'));
const TaxCalculator = React.lazy(() => import('../Components/TaxCalculator'));

// Loading component
const LoadingFallback = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Error boundary component
const ErrorBoundary = ({ children, componentName }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const errorHandler = (error) => {
      console.error(`Error in ${componentName}:`, error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, [componentName]);

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-800 mb-1">
          Component Error
        </h3>
        <p className="text-sm text-red-600">
          There was an error loading the {componentName}. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return children;
};

const TaxPage = ({ userSession }) => {
  const [apiStatus, setApiStatus] = useState('loading');

  useEffect(() => {
    // Check if user is authenticated
    if (!userSession?.isAuthenticated) {
      setApiStatus('error');
      return;
    }
    
    setApiStatus('success');
  }, [userSession]);

  if (apiStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-600">Loading tax information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tax Center</h1>
          <p className="text-gray-600 mt-2">
            Manage your tax information and calculate your tax obligations
          </p>
        </div>

        {/* Tax Dashboard Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tax Overview</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ErrorBoundary componentName="Tax Dashboard">
              <Suspense fallback={<LoadingFallback />}>
                <TaxDashboard userSession={userSession} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </section>

        {/* Tax Calculator Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tax Calculator</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ErrorBoundary componentName="Tax Calculator">
              <Suspense fallback={<LoadingFallback />}>
                <TaxCalculator userSession={userSession} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TaxPage;