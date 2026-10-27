import { Router } from 'express';
import {
  createRequest,
  getMyCustomerRequests,
  getIncomingRequests,
  getRequestById,
  updateRequestStatus,
  createRequestSchema,
  updateStatusSchema,
} from '../controllers/requestController.js';
import validate from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = Router();

// Customer creates request
router.post('/', protect, requireRole('customer'), validate(createRequestSchema, 'body'), createRequest);

// Customer views their requests
router.get('/mine', protect, requireRole('customer'), getMyCustomerRequests);

// Provider views incoming requests
router.get('/incoming', protect, requireRole('provider'), getIncomingRequests);

// Transition request status
router.patch('/:id/status', protect, validate(updateStatusSchema, 'body'), updateRequestStatus);

// View single request details
router.get('/:id', protect, getRequestById);

export default router;
