import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required', invalid_type_error: 'Name must be a string' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name cannot exceed 60 characters'),
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email must be a string' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  password: z
    .string({ required_error: 'Password is required', invalid_type_error: 'Password must be a string' })
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least 1 letter and 1 number'),
  role: z.enum(['customer', 'provider'], {
    required_error: 'Role is required and must be either customer or provider',
    invalid_type_error: 'Role must be either customer or provider',
  }),
  phone: z
    .string({ invalid_type_error: 'Phone must be a string' })
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Phone number must be between 10 and 15 digits')
    .optional()
    .nullable(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email must be a string' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
  password: z
    .string({ required_error: 'Password is required', invalid_type_error: 'Password must be a string' })
    .min(1, 'Password is required'),
});

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    phone: phone || null,
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    data: {
      user: user.toJSON(),
      token,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    data: {
      user: user.toJSON(),
      token,
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user.toJSON(),
    },
  });
});

export default {
  register,
  login,
  getMe,
  registerSchema,
  loginSchema,
};
