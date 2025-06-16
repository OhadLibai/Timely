import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute: React.FC = () => {
  const location = useLocation();

  const isLoading = false; // mock
  const isAuthenticated = true; // mock
  const user = { id: 1, name: 'Test User' }; // mock

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated || !user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
};

export default ProtectedRoute;
