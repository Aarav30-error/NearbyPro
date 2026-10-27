import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound = () => {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '60px 16px' }}>
      <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '32px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '12px', color: '#2563eb' }}>404</h1>
        <h2 style={{ marginBottom: '12px' }}>Page Not Found</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Search
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
