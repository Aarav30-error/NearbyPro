import React from 'react';

export const Loader = ({ message = 'Loading...' }) => {
  return (
    <div className="loader-container">
      <p>{message}</p>
    </div>
  );
};

export default Loader;
