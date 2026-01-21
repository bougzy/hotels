import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * ROOM TYPE MODEL
 *
 * Room types define categories of rooms (Deluxe, Standard, Suite, etc.)
 * Each room type has base pricing and amenities.
 *
 * REVENUE IMPACT:
 * - Proper room categorization enables dynamic pricing strategies
 * - Amenity differentiation justifies premium pricing
 * - Max occupancy affects upsell opportunities
 */

export interface IRoomTypePricing {
  basePrice: number;
  weekendPrice?: number; // Higher rate for weekends
  seasonalPrices?: Array<{
    name: string;
    startDate: Date;
    endDate: Date;
    price: number;
  }>;
  extraPersonCharge: number;
  childCharge: number;
}

export interface IRoomType extends Document {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  name: string;
  code: string; // Short code like "DLX", "STD", "STE"
  description?: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  bedConfiguration: string; // e.g., "1 King" or "2 Queens"
  roomSize?: number; // in sqm
  pricing: IRoomTypePricing;
  amenities: string[];
  images: string[];
  isActive: boolean;
  sortOrder: number;
  totalRooms: number; // Count of rooms of this type
  createdAt: Date;
  updatedAt: Date;
}

const RoomTypeSchema = new Schema<IRoomType>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Room type name is required'],
      trim: true,
      maxlength: [50, 'Room type name cannot exceed 50 characters'],
    },
    code: {
      type: String,
      required: [true, 'Room type code is required'],
      uppercase: true,
      trim: true,
      maxlength: [10, 'Room type code cannot exceed 10 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    maxOccupancy: {
      type: Number,
      required: true,
      min: [1, 'Max occupancy must be at least 1'],
      max: [20, 'Max occupancy cannot exceed 20'],
    },
    maxAdults: {
      type: Number,
      required: true,
      min: [1, 'Max adults must be at least 1'],
    },
    maxChildren: {
      type: Number,
      default: 0,
      min: 0,
    },
    bedConfiguration: {
      type: String,
      required: true,
      trim: true,
    },
    roomSize: {
      type: Number,
      min: 0,
    },
    pricing: {
      basePrice: {
        type: Number,
        required: [true, 'Base price is required'],
        min: [0, 'Price cannot be negative'],
      },
      weekendPrice: {
        type: Number,
        min: [0, 'Weekend price cannot be negative'],
      },
      seasonalPrices: [
        {
          name: { type: String, required: true },
          startDate: { type: Date, required: true },
          endDate: { type: Date, required: true },
          price: { type: Number, required: true, min: 0 },
        },
      ],
      extraPersonCharge: {
        type: Number,
        default: 0,
        min: 0,
      },
      childCharge: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    amenities: [String],
    images: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    totalRooms: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for hotel + code uniqueness
RoomTypeSchema.index({ hotelId: 1, code: 1 }, { unique: true });
RoomTypeSchema.index({ hotelId: 1, isActive: 1, sortOrder: 1 });

// Virtual for display name with hotel context
RoomTypeSchema.virtual('displayName').get(function () {
  return `${this.name} (${this.code})`;
});

export const RoomType = mongoose.model<IRoomType>('RoomType', RoomTypeSchema);
