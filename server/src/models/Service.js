import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Provider reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [80, 'Title cannot exceed 80 characters'],
    },
    category: {
      type: String,
      required: [true, 'Service category is required'],
      enum: {
        values: [
          'electrician',
          'plumber',
          'tutor',
          'tailor',
          'carpenter',
          'painter',
          'cleaner',
          'mechanic',
          'other',
        ],
        message: 'Invalid service category',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    priceUnit: {
      type: String,
      required: [true, 'Price unit is required'],
      enum: {
        values: ['per_hour', 'per_job'],
        message: 'Price unit must be per_hour or per_job',
      },
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates [longitude, latitude] are required'],
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              typeof val[0] === 'number' &&
              typeof val[1] === 'number' &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: 'Coordinates must be valid [longitude, latitude] with lng between -180 and 180 and lat between -90 and 90',
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ location: '2dsphere' });
serviceSchema.index({ category: 1, isActive: 1 });

export const Service = mongoose.model('Service', serviceSchema);
export default Service;
