import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  // Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    if (err.keyPattern?.customer && err.keyPattern?.service) {
      message = 'You already have an active request for this service';
    } else if (err.keyPattern?.request) {
      message = 'You have already reviewed this job';
    } else if (err.keyPattern?.email) {
      message = 'Email is already registered';
    } else {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      message = `Duplicate value for ${field}`;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired, please log in again';
  }

  // Never leak internal 500 error stack/details in production
  if (statusCode === 500 && env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  const response = {
    success: false,
    message,
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  if (env.NODE_ENV === 'development' && statusCode === 500 && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
