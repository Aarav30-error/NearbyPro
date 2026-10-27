import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Loader from './components/Loader.jsx';

// Pages
import Home from './pages/Home.jsx';
import ServiceDetail from './pages/ServiceDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import ProviderDashboard from './pages/ProviderDashboard.jsx';
import ServiceForm from './pages/ServiceForm.jsx';
import NotFound from './pages/NotFound.jsx';

const DashboardRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader message="Redirecting to your dashboard..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'provider') {
    return <Navigate to="/provider/dashboard" replace />;
  }

  return <Navigate to="/customer/dashboard" replace />;
};

export const App = () => {
  return (
    <div>
      <Navbar />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Role-based Dashboard Dispatcher */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Customer Protected Routes */}
          <Route
            path="/customer/dashboard"
            element={
              <ProtectedRoute roles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Provider Protected Routes */}
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute roles={['provider']}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/services/new"
            element={
              <ProtectedRoute roles={['provider']}>
                <ServiceForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/services/:id/edit"
            element={
              <ProtectedRoute roles={['provider']}>
                <ServiceForm />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
