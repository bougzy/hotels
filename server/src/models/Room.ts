import mongoose, { Document, Schema, Types } from 'mongoose';
import { generateId } from '../utils/helpers.js';

/**
 * ROOM MODEL
 *
 * Individual room instances within a hotel.
 * Links to RoomType for pricing and amenities.
 *
 * REVENUE IMPACT:
 * - Room status tracking prevents double bookings (protects revenue)
 * - Maintenance status prevents booking broken rooms (protects reputation)
 * - Floor/view attributes enable premium pricing for better rooms
 */

export type RoomStatus =
  | 'available'      // Ready to book and check-in
  | 'occupied'       // Guest currently staying
  | 'reserved'       // Booked but not checked in
  | 'cleaning'       // Housekeeping in progress
  | 'maintenance'    // Under repair
  | 'blocked';       // Blocked from booking (various reasons)

export interface IRoom extends Document {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  roomTypeId: Types.ObjectId;
  roomNumber: string;
  floor: number;
  building?: string; // For hotels with multiple buildings
  status: RoomStatus;
  housekeepingStatus: 'clean' | 'dirty' | 'inspected' | 'in_progress';
  lastCleanedAt?: Date;
  lastInspectedAt?: Date;
  currentBookingId?: Types.ObjectId;
  currentGuestId?: Types.ObjectId;
  attributes: {
    view?: string; // 'pool', 'garden', 'city', 'sea'
    hasBalcony?: boolean;
    isAccessible?: boolean; // Disability-friendly
    isConnecting?: boolean; // Can connect to adjacent room
    connectingRoomId?: Types.ObjectId;
    isSmoking?: boolean;
  };
  priceAdjustment: {
    type: 'fixed' | 'percentage';
    value: number; // Positive for premium, negative for discount
    reason?: string;
  };
  notes?: string; // Internal notes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },
    roomTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'RoomType',
      required: true,
      index: true,
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      maxlength: [20, 'Room number cannot exceed 20 characters'],
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required'],
      min: [-5, 'Floor cannot be below -5'], // Basement support
      max: [200, 'Floor cannot exceed 200'],
    },
    building: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked'],
      default: 'available',
    },
    housekeepingStatus: {
      type: String,
      enum: ['clean', 'dirty', 'inspected', 'in_progress'],
      default: 'clean',
    },
    lastCleanedAt: Date,
    lastInspectedAt: Date,
    currentBookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    currentGuestId: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
    },
    attributes: {
      view: {
        type: String,
        enum: ['pool', 'garden', 'city', 'sea', 'mountain', 'parking', 'none'],
      },
      hasBalcony: { type: Boolean, default: false },
      isAccessible: { type: Boolean, default: false },
      isConnecting: { type: Boolean, default: false },
      connectingRoomId: { type: Schema.Types.ObjectId, ref: 'Room' },
      isSmoking: { type: Boolean, default: false },
    },
    priceAdjustment: {
      type: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed',
      },
      value: { type: Number, default: 0 },
      reason: String,
    },
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
RoomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
RoomSchema.index({ hotelId: 1, status: 1 });
RoomSchema.index({ hotelId: 1, roomTypeId: 1, status: 1 });
RoomSchema.index({ hotelId: 1, floor: 1 });
RoomSchema.index({ currentBookingId: 1 });

// Virtual populate for room type
RoomSchema.virtual('roomType', {
  ref: 'RoomType',
  localField: 'roomTypeId',
  foreignField: '_id',
  justOne: true,
});

// Static method to get available rooms for a date range
RoomSchema.statics.findAvailable = async function (
  hotelId: Types.ObjectId,
  checkIn: Date,
  checkOut: Date,
  roomTypeId?: Types.ObjectId
) {
  // This will be enhanced with booking conflict checks
  const query: Record<string, unknown> = {
    hotelId,
    status: { $in: ['available', 'reserved'] },
    isActive: true,
  };

  if (roomTypeId) {
    query.roomTypeId = roomTypeId;
  }

  return this.find(query).populate('roomType');
};

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
