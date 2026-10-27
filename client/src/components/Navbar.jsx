import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          📍 NearbyPro
        </Link>

        <nav className="nav-links">
          <Link to="/">Search</Link>

          {isAuthenticated ? (
            <>
              {user.role === 'customer' ? (
                <Link to="/customer/dashboard">My Dashboard</Link>
              ) : (
                <>
                  <Link to="/provider/dashboard">Provider Dashboard</Link>
                  <Link to="/provider/services/new" className="btn btn-primary btn-sm" style={{ color: '#fff' }}>
                    + Post Service
                  </Link>
                </>
              )}

              <span style={{ fontSize: '0.85rem', color: '#6b7280', padding: '0 4px' }}>
                {user.name} ({user.role})
              </span>

              <button type="button" onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ color: '#fff' }}>
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
