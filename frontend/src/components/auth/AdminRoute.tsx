import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminRoute: React.FC = () => {
  const location = useLocation();

  const isLoading = false; // mock
  const isAuthenticated = true; // mock
  const user = { role: 'admin' }; // mock

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated || !user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return <Outlet />;
};

export default AdminRoute;
