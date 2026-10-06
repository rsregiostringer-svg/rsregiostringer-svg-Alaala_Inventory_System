import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from '../components/common/LoadingState';

export default function ProtectedRoute({
  children,
  masterAdminOnly = false,
  adminOnly = false,
  checkPermission = null,
}) {
  const { isAuthenticated, loading, isMasterAdmin, isAdmin, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
        <LoadingState message="Verifying session security..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (masterAdminOnly && !isMasterAdmin) {
    return (
      <Navigate
        to="/dashboard"
        state={{ error: 'You do not have permission to access this page.' }}
        replace
      />
    );
  }

  if (adminOnly && !isAdmin) {
    return (
      <Navigate
        to="/dashboard"
        state={{ error: 'You do not have permission to access this page.' }}
        replace
      />
    );
  }

  if (checkPermission && !checkPermission(user)) {
    return (
      <Navigate
        to="/dashboard"
        state={{ error: 'You do not have permission to access this page.' }}
        replace
      />
    );
  }

  return children;
}
