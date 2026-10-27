import React from 'react';

export const ErrorMessage = ({ message }) => {
  if (!message) return null;

  const text = typeof message === 'string' ? message : message?.message || 'An error occurred';

  return (
    <div className="error-box">
      <span>{text}</span>
    </div>
  );
};

export default ErrorMessage;
