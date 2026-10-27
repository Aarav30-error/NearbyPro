import mongoose from 'mongoose';
import { z } from 'zod';
import ServiceRequest from '../models/ServiceRequest.js';
import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getTransition } from '../utils/requestStateMachine.js';
import { expireOldRequests } from '../jobs/expireRequests.js';

export const createRequestSchema = z.object({
  serviceId: z.string({ required_error: 'Service ID is required' }).trim(),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(5, 'Message must be at least 5 characters')
    .max(500, 'Message cannot exceed 500 characters'),
  preferredDate: z.coerce.date({
    required_error: 'Preferred date is required',
    invalid_type_error: 'Invalid date format',
  }),
  customerAddress: z
    .string({ required_error: 'Address is required' })
    .trim()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address cannot exceed 200 characters'),
});

export const updateStatusSchema = z.object({
  action: z.enum(['accept', 'decline', 'cancel', 'complete'], {
    required_error: 'Action is required',
    invalid_type_error: 'Action must be accept, decline, cancel, or complete',
  }),
  note: z.string().trim().max(300).optional(),
});

// POST /requests (customer only)
export const createRequest = asyncHandler(async (req, res) => {
  const { serviceId, message, preferredDate, customerAddress } = req.body;

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new ApiError(400, 'Invalid service ID format');
  }

  // Validate preferredDate is in the future
  const parsedDate = new Date(preferredDate);
  if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
    throw new ApiError(400, 'Preferred date must be in the future');
  }

  // Find active service
  const service = await Service.findOne({ _id: serviceId, isActive: true });
  if (!service) {
    throw new ApiError(404, 'Service not found or is currently inactive');
  }

  // Check: customer cannot be the service's provider
  if (service.provider.toString() === req.user._id.toString()) {
    throw new ApiError(403, 'You cannot request your own service');
  }

  // Check for active duplicate request
  const existingActive = await ServiceRequest.findOne({
    customer: req.user._id,
    service: serviceId,
    status: { $in: ['PENDING', 'ACCEPTED'] },
  });

  if (existingActive) {
    throw new ApiError(409, 'You already have an active request for this service');
  }

  // Create request with snapshot of service
  const request = await ServiceRequest.create({
    customer: req.user._id,
    provider: service.provider,
    service: service._id,
    serviceSnapshot: {
      title: service.title,
      category: service.category,
      price: service.price,
      priceUnit: service.priceUnit,
    },
    message,
    preferredDate: parsedDate,
    customerAddress,
    status: 'PENDING',
    statusHistory: [
      {
        status: 'PENDING',
        changedBy: req.user._id,
        at: new Date(),
        note: 'Request created by customer',
      },
    ],
  });

  res.status(201).json({
    success: true,
    data: request,
  });
});

// GET /requests/mine (customer only)
export const getMyCustomerRequests = asyncHandler(async (req, res) => {
  // Run lazy expiry check
  await expireOldRequests();

  const { status } = req.query;
  const filter = { customer: req.user._id };

  if (status) {
    filter.status = status;
  }

  const requests = await ServiceRequest.find(filter)
    .populate('provider', 'name phone')
    .sort({ createdAt: -1 });

  // Only reveal provider phone when ACCEPTED or COMPLETED
  const sanitized = requests.map((doc) => {
    const obj = doc.toObject();
    if (!['ACCEPTED', 'COMPLETED'].includes(obj.status) && obj.provider) {
      delete obj.provider.phone;
    }
    return obj;
  });

  res.status(200).json({
    success: true,
    data: sanitized,
  });
});

// GET /requests/incoming (provider only)
export const getIncomingRequests = asyncHandler(async (req, res) => {
  // Run lazy expiry check
  await expireOldRequests();

  const { status } = req.query;
  const filter = { provider: req.user._id };

  if (status) {
    filter.status = status;
  }

  const requests = await ServiceRequest.find(filter)
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 });

  // "customer phone and address only shown when status is ACCEPTED or COMPLETED"
  const sanitized = requests.map((doc) => {
    const obj = doc.toObject();
    if (!['ACCEPTED', 'COMPLETED'].includes(obj.status)) {
      if (obj.customer) {
        delete obj.customer.phone;
      }
      obj.customerAddress = 'Address hidden until request is accepted';
    }
    return obj;
  });

  res.status(200).json({
    success: true,
    data: sanitized,
  });
});

// GET /requests/:id (customer or provider on that request only)
export const getRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid request ID');
  }

  const request = await ServiceRequest.findById(id)
    .populate('customer', 'name phone')
    .populate('provider', 'name phone');

  if (!request) {
    throw new ApiError(404, 'Service request not found');
  }

  const userId = req.user._id.toString();
  const isCustomer = request.customer._id.toString() === userId;
  const isProvider = request.provider._id.toString() === userId;

  if (!isCustomer && !isProvider) {
    throw new ApiError(403, 'Forbidden: you are not authorized to view this request');
  }

  const obj = request.toObject();

  // Privacy filters
  if (!['ACCEPTED', 'COMPLETED'].includes(obj.status)) {
    if (isProvider) {
      if (obj.customer) delete obj.customer.phone;
      obj.customerAddress = 'Address hidden until request is accepted';
    }
    if (isCustomer && obj.provider) {
      delete obj.provider.phone;
    }
  }

  res.status(200).json({
    success: true,
    data: obj,
  });
});

// PATCH /requests/:id/status (protected)
export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, note } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid request ID');
  }

  const request = await ServiceRequest.findById(id);
  if (!request) {
    throw new ApiError(404, 'Service request not found');
  }

  const userId = req.user._id.toString();
  const isCustomer = request.customer.toString() === userId;
  const isProvider = request.provider.toString() === userId;

  if (!isCustomer && !isProvider) {
    throw new ApiError(403, 'Forbidden: you are not party to this request');
  }

  // Specific role verification
  if (req.user.role === 'customer' && !isCustomer) {
    throw new ApiError(403, 'Forbidden: you are not the customer for this request');
  }
  if (req.user.role === 'provider' && !isProvider) {
    throw new ApiError(403, 'Forbidden: you are not the provider for this request');
  }

  // State machine transition verification
  const { to } = getTransition(request.status, action, req.user.role);

  // Additional rule: verify actor identity
  if (action === 'accept' || action === 'decline' || action === 'complete') {
    if (!isProvider) {
      throw new ApiError(403, `Only the designated provider can ${action} this request`);
    }
  }

  const updateSet = { status: to };
  if (to === 'COMPLETED') {
    updateSet.completedAt = new Date();
  }

  // Atomic and race-safe update
  const updatedRequest = await ServiceRequest.findOneAndUpdate(
    { _id: id, status: request.status },
    {
      $set: updateSet,
      $push: {
        statusHistory: {
          status: to,
          changedBy: req.user._id,
          at: new Date(),
          note: note || `Action: ${action}`,
        },
      },
    },
    { new: true }
  );

  if (!updatedRequest) {
    throw new ApiError(409, 'Request status changed, please refresh');
  }

  res.status(200).json({
    success: true,
    data: updatedRequest,
  });
});

export default {
  createRequest,
  getMyCustomerRequests,
  getIncomingRequests,
  getRequestById,
  updateRequestStatus,
};
