import { useAuth } from '../context/AuthContext'; // Adjust import path as needed
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, authChecked } = useAuth();

  console.log('🛣️ PrivateRoute - Auth checked:', authChecked, 'Authenticated:', isAuthenticated, 'Loading:', loading);

  if (loading || !authChecked) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3">Checking authentication...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔒 PrivateRoute redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ PrivateRoute rendering protected content');
  return children;
};

export default PrivateRoute;