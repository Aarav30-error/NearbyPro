import { Router } from 'express';
import {
  createReview,
  getServiceReviews,
  createReviewSchema,
  getReviewsQuerySchema,
} from '../controllers/reviewController.js';
import validate from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = Router();

// Customer creates review for a completed request
router.post('/', protect, requireRole('customer'), validate(createReviewSchema, 'body'), createReview);

// Public paginated reviews for a service
router.get('/service/:serviceId', validate(getReviewsQuerySchema, 'query'), getServiceReviews);

export default router;
