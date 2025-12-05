import { useAuth } from '../context/AuthContext'; // Adjust import path as needed
import { Navigate } from 'react-router-dom';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, authChecked } = useAuth();

  console.log('🛣️ PublicRoute - Auth checked:', authChecked, 'Authenticated:', isAuthenticated, 'Loading:', loading);

  // Show loading spinner while checking authentication
  if (loading || !authChecked) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3">Checking authentication...</span>
      </div>
    );
  }

  // Only redirect if we're sure user is authenticated
  if (isAuthenticated) {
    console.log('🔄 PublicRoute redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('✅ PublicRoute rendering children');
  return children;
};

export default PublicRoute;