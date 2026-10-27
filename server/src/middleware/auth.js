import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication token missing or invalid');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new ApiError(401, 'Authentication token missing');
  }

  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (!decoded || !decoded.id) {
    throw new ApiError(401, 'Invalid authentication token');
  }

  const user = await User.findById(decoded.id).select('-passwordHash');
  if (!user) {
    throw new ApiError(401, 'User associated with this token no longer exists');
  }

  req.user = user;
  next();
});

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient permissions for this action'));
    }
    next();
  };
};

export default { protect, requireRole };
