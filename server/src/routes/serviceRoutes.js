import { Router } from 'express';
import {
  getNearbyServices,
  getMyServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  nearbyQuerySchema,
  createServiceSchema,
  updateServiceSchema,
} from '../controllers/serviceController.js';
import validate from '../middleware/validate.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = Router();

// Public nearby search route (must be defined BEFORE /:id)
router.get('/nearby', validate(nearbyQuerySchema, 'query'), getNearbyServices);

// Provider services listing (must be defined BEFORE /:id)
router.get('/mine', protect, requireRole('provider'), getMyServices);

// Create service (provider only)
router.post('/', protect, requireRole('provider'), validate(createServiceSchema, 'body'), createService);

// Service detail by ID
router.get('/:id', getServiceById);

// Update service (provider only)
router.patch('/:id', protect, requireRole('provider'), validate(updateServiceSchema, 'body'), updateService);

// Soft delete service (provider only)
router.delete('/:id', protect, requireRole('provider'), deleteService);

export default router;
