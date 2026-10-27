import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for system/cron
    },
    at: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const serviceSnapshotSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    priceUnit: { type: String, required: true },
  },
  { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Provider reference is required'],
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service reference is required'],
      index: true,
    },
    serviceSnapshot: {
      type: serviceSnapshotSchema,
      required: [true, 'Service snapshot is required'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [5, 'Message must be at least 5 characters long'],
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    preferredDate: {
      type: Date,
      required: [true, 'Preferred date is required'],
    },
    customerAddress: {
      type: String,
      required: [true, 'Customer address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    completedAt: {
      type: Date,
      default: null,
    },
    hasReview: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
serviceRequestSchema.index({ customer: 1, status: 1 });
serviceRequestSchema.index({ provider: 1, status: 1 });
serviceRequestSchema.index({ status: 1, createdAt: 1 });

// Partial unique index so a customer cannot have two active requests for the same service
serviceRequestSchema.index(
  { customer: 1, service: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['PENDING', 'ACCEPTED'] },
    },
  }
);

export const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
export default ServiceRequest;
