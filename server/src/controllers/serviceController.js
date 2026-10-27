import { z } from 'zod';
import mongoose from 'mongoose';
import Service from '../models/Service.js';
import ServiceRequest from '../models/ServiceRequest.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import escapeRegex from '../utils/escapeRegex.js';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const CATEGORIES = [
  'electrician',
  'plumber',
  'tutor',
  'tailor',
  'carpenter',
  'painter',
  'cleaner',
  'mechanic',
  'other',
];

export const createServiceSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(80, 'Title cannot exceed 80 characters'),
  category: z.enum(CATEGORIES, {
    required_error: 'Category is required',
    invalid_type_error: 'Invalid category',
  }),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  price: z
    .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a number' })
    .min(0, 'Price must be 0 or higher'),
  priceUnit: z.enum(['per_hour', 'per_job'], {
    required_error: 'Price unit is required',
    invalid_type_error: 'Price unit must be per_hour or per_job',
  }),
  address: z
    .string({ required_error: 'Address is required' })
    .trim()
    .max(200, 'Address cannot exceed 200 characters'),
  latitude: z
    .number({ required_error: 'Latitude is required', invalid_type_error: 'Latitude must be a number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number({ required_error: 'Longitude is required', invalid_type_error: 'Longitude must be a number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

export const updateServiceSchema = createServiceSchema.partial();

export const nearbyQuerySchema = z.object({
  lat: z.coerce
    .number({ required_error: 'Latitude is required', invalid_type_error: 'Latitude must be a valid number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce
    .number({ required_error: 'Longitude is required', invalid_type_error: 'Longitude must be a valid number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  radiusKm: z.coerce
    .number()
    .min(0.1, 'Radius must be at least 0.1 km')
    .max(50, 'Radius cannot exceed 50 km')
    .default(10),
  category: z.enum(CATEGORIES).optional(),
  q: z.string().trim().max(100).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['distance', 'rating', 'price']).default('distance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

// GET /services/nearby (public)
export const getNearbyServices = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, category, q, minRating, maxPrice, sort, page, limit } = req.query;

  // Build the filter inside $geoNear query parameter
  const geoQuery = { isActive: true };

  if (category) {
    geoQuery.category = category;
  }

  if (maxPrice !== undefined) {
    geoQuery.price = { $lte: Number(maxPrice) };
  }

  if (minRating !== undefined) {
    geoQuery.avgRating = { $gte: Number(minRating) };
  }

  // Pipeline begins with $geoNear as strictly required by MongoDB for 2dsphere index queries
  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
        distanceField: 'distanceMeters',
        maxDistance: Number(radiusKm) * 1000,
        spherical: true,
        query: geoQuery,
      },
    },
  ];

  // If keyword search `q` is provided, apply case-insensitive regex match stage after $geoNear
  if (q && q.trim().length > 0) {
    const escaped = escapeRegex(q.trim());
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
        ],
      },
    });
  }

  // Lookup provider details (project only name)
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'provider',
        foreignField: '_id',
        as: 'provider',
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $unwind: '$provider',
    }
  );

  // Sorting
  if (sort === 'rating') {
    pipeline.push({ $sort: { avgRating: -1, distanceMeters: 1 } });
  } else if (sort === 'price') {
    pipeline.push({ $sort: { price: 1, distanceMeters: 1 } });
  } else {
    // Default: distance
    pipeline.push({ $sort: { distanceMeters: 1 } });
  }

  // Facet stage for pagination & total count
  const skip = (page - 1) * limit;

  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      data: [
        { $skip: skip },
        { $limit: Number(limit) },
        {
          $addFields: {
            distanceKm: {
              $round: [{ $divide: ['$distanceMeters', 1000] }, 1],
            },
          },
        },
      ],
    },
  });

  const [result] = await Service.aggregate(pipeline);

  const total = result.metadata[0] ? result.metadata[0].total : 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const services = result.data || [];

  res.status(200).json({
    success: true,
    data: services,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  });
});

// GET /services/mine (provider only)
export const getMyServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ provider: req.user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: services,
  });
});

// GET /services/:id (public)
export const getServiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid service ID');
  }

  const service = await Service.findOne({ _id: id, isActive: true }).populate('provider', 'name phone');

  if (!service) {
    throw new ApiError(404, 'Service not found or is currently inactive');
  }

  // Check if phone should be visible:
  // "provider {name, phone hidden unless the requester has an ACCEPTED request with this provider}"
  let canViewPhone = false;

  // Check token if present in headers
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (decoded && decoded.id) {
        // If requester is the provider themselves, they can view their own phone
        if (decoded.id.toString() === service.provider._id.toString()) {
          canViewPhone = true;
        } else {
          // Check if customer has an ACCEPTED request with this provider
          const acceptedRequest = await ServiceRequest.findOne({
            customer: decoded.id,
            provider: service.provider._id,
            status: { $in: ['ACCEPTED', 'COMPLETED'] },
          });
          if (acceptedRequest) {
            canViewPhone = true;
          }
        }
      }
    } catch {
      // Invalid/expired token: phone remains hidden
      canViewPhone = false;
    }
  }

  const serviceObj = service.toObject();
  if (!canViewPhone && serviceObj.provider) {
    delete serviceObj.provider.phone;
  }

  res.status(200).json({
    success: true,
    data: serviceObj,
  });
});

// POST /services (provider only)
export const createService = asyncHandler(async (req, res) => {
  const { title, category, description, price, priceUnit, address, latitude, longitude } = req.body;

  const service = await Service.create({
    provider: req.user._id,
    title,
    category,
    description,
    price,
    priceUnit,
    address,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  });

  res.status(201).json({
    success: true,
    data: service,
  });
});

// PATCH /services/:id (provider only, must own it)
export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid service ID');
  }

  const service = await Service.findById(id);

  if (!service) {
    throw new ApiError(404, 'Service not found');
  }

  if (service.provider.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Forbidden: you do not own this service');
  }

  const updates = { ...req.body };

  if (updates.latitude !== undefined && updates.longitude !== undefined) {
    updates.location = {
      type: 'Point',
      coordinates: [updates.longitude, updates.latitude],
    };
    delete updates.latitude;
    delete updates.longitude;
  }

  const updatedService = await Service.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

  res.status(200).json({
    success: true,
    data: updatedService,
  });
});

// DELETE /services/:id (provider only, soft delete isActive=false)
export const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid service ID');
  }

  const service = await Service.findById(id);

  if (!service) {
    throw new ApiError(404, 'Service not found');
  }

  if (service.provider.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Forbidden: you do not own this service');
  }

  // Block if the service has PENDING or ACCEPTED requests
  const activeRequests = await ServiceRequest.findOne({
    service: id,
    status: { $in: ['PENDING', 'ACCEPTED'] },
  });

  if (activeRequests) {
    throw new ApiError(409, 'Cannot deactivate service with pending or accepted requests');
  }

  service.isActive = false;
  await service.save();

  res.status(200).json({
    success: true,
    message: 'Service deactivated successfully',
    data: service,
  });
});

export default {
  getNearbyServices,
  getMyServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
