import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      if (from === '/dashboard') {
        if (loggedUser.role === 'provider') {
          navigate('/provider/dashboard', { replace: true });
        } else {
          navigate('/customer/dashboard', { replace: true });
        }
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', marginTop: '40px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>Sign In to NearbyPro</h2>

        <ErrorMessage message={error} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@demo.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: '#2563eb', fontWeight: 600 }}>
            Register here
          </Link>
        </p>

        <div style={{ marginTop: '20px', padding: '12px', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.8rem', color: '#4b5563' }}>
          <strong>Demo credentials:</strong><br />
          Customer: <code>customer@demo.com</code> / <code>Demo@1234</code><br />
          Provider: <code>provider1@demo.com</code> / <code>Demo@1234</code>
        </div>
      </div>
    </div>
  );
};

export default Login;
