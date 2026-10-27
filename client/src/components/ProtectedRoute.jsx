import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';

export const ProtectedRoute = ({ roles, children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader message="Verifying authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '40px 16px' }}>
        <div className="card">
          <h2>Access Denied</h2>
          <p style={{ margin: '16px 0', color: '#6b7280' }}>
            You are not authorized to view this page with your current account role ({user.role}).
          </p>
          <Link to="/" className="btn btn-primary">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
