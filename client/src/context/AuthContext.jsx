import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Restore user session on app mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user);
            setToken(storedToken);
          }
        }
      } catch (err) {
        console.warn('Failed to restore session:', err?.response?.data?.message || err.message);
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch {
          // ignore
        }
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success) {
      const { user: loggedInUser, token: authToken } = res.data.data;
      try {
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }
      setToken(authToken);
      setUser(loggedInUser);
      return loggedInUser;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data?.success) {
      const { user: registeredUser, token: authToken } = res.data.data;
      try {
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(registeredUser));
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }
      setToken(authToken);
      setUser(registeredUser);
      return registeredUser;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
