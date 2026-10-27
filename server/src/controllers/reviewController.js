import mongoose from 'mongoose';
import { z } from 'zod';
import Review from '../models/Review.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createReviewSchema = z.object({
  requestId: z.string({ required_error: 'Request ID is required' }).trim(),
  rating: z
    .number({ required_error: 'Rating is required', invalid_type_error: 'Rating must be an integer' })
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  comment: z.string().trim().max(500, 'Comment cannot exceed 500 characters').optional().default(''),
});

export const getReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

/**
 * Recomputes the average rating and review count for a service.
 */
const recomputeServiceRating = async (serviceId, session = null) => {
  const serviceObjectId = new mongoose.Types.ObjectId(String(serviceId));

  const aggregation = Review.aggregate([
    { $match: { service: serviceObjectId } },
    {
      $group: {
        _id: '$service',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (session) {
    aggregation.session(session);
  }

  const stats = await aggregation;

  const avgRating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const reviewCount = stats.length > 0 ? stats[0].reviewCount : 0;

  const updateOptions = { runValidators: true };
  if (session) {
    updateOptions.session = session;
  }

  await Service.findByIdAndUpdate(
    serviceId,
    { avgRating, reviewCount },
    updateOptions
  );
};

// POST /reviews (customer only)
export const createReview = asyncHandler(async (req, res) => {
  const { requestId, rating, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new ApiError(400, 'Invalid request ID');
  }

  const serviceRequest = await ServiceRequest.findById(requestId);
  if (!serviceRequest) {
    throw new ApiError(404, 'Service request not found');
  }

  // Check: request.customer === req.user.id
  if (serviceRequest.customer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Forbidden: you can only review requests initiated by you');
  }

  // Check: request.status === "COMPLETED"
  if (serviceRequest.status !== 'COMPLETED') {
    throw new ApiError(400, 'Reviews can only be submitted after the request is COMPLETED');
  }

  // Check: no existing review for it
  const existingReview = await Review.findOne({ request: requestId });
  if (existingReview) {
    throw new ApiError(409, 'You have already reviewed this job');
  }

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    // MongoDB standalone or local without replica set might not support transactions
    session = null;
  }

  try {
    const reviewData = {
      request: serviceRequest._id,
      service: serviceRequest.service,
      customer: req.user._id,
      provider: serviceRequest.provider,
      rating,
      comment: comment || '',
    };

    let review;
    if (session) {
      const created = await Review.create([reviewData], { session });
      review = created[0];
      serviceRequest.hasReview = true;
      await serviceRequest.save({ session });
      await recomputeServiceRating(serviceRequest.service, session);
      await session.commitTransaction();
    } else {
      review = await Review.create(reviewData);
      serviceRequest.hasReview = true;
      await serviceRequest.save();
      await recomputeServiceRating(serviceRequest.service);
    }

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    if (error.code === 11000) {
      throw new ApiError(409, 'You have already reviewed this job');
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// GET /reviews/service/:serviceId (public, paginated)
export const getServiceReviews = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const { page, limit } = req.query;

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    throw new ApiError(400, 'Invalid service ID');
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    Review.find({ service: serviceId })
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Review.countDocuments({ service: serviceId }),
  ]);

  const totalPages = Math.ceil(total / Number(limit)) || 1;

  res.status(200).json({
    success: true,
    data: reviews,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  });
});

export default {
  createReview,
  getServiceReviews,
};
