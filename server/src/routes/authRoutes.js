import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getMe,
  registerSchema,
  loginSchema,
} from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Rate limit /auth/* to 20 requests per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
});

router.use(authLimiter);

router.post('/register', validate(registerSchema, 'body'), register);
router.post('/login', validate(loginSchema, 'body'), login);
router.get('/me', protect, getMe);

export default router;
