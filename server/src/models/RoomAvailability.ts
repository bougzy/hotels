import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * ROOM AVAILABILITY MODEL
 *
 * Daily availability and pricing by room type.
 * This is the KEY to dynamic pricing and accurate availability.
 *
 * REVENUE IMPACT:
 * - Daily rate adjustments maximize revenue (revenue management)
 * - Accurate availability prevents overbooking
 * - Restrictions enable strategic inventory control
 * - This is how hotels squeeze more money from the same rooms
 */

export interface IRoomAvailability extends Document {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  roomTypeId: Types.ObjectId;
  date: Date;
  // Inventory management
  totalRooms: number;          // Total rooms of this type
  bookedRooms: number;         // Currently booked
  blockedRooms: number;        // Manually blocked
  availableRooms: number;      // What can be sold
  // Dynamic pricing
  baseRate: number;            // Standard rate for this date
  sellingRate: number;         // Actual rate being sold
  rateType: 'standard' | 'weekend' | 'seasonal' | 'promotional' | 'dynamic';
  rateName?: string;           // e.g., "Summer Special"
  // Restrictions (revenue management tools)
  restrictions: {
    minStay: number;           // Minimum nights required
    maxStay: number;           // Maximum nights allowed
    closedToArrival: boolean;  // Can't check in on this day
    closedToDeparture: boolean;// Can't check out on this day
    stopSell: boolean;         // Don't sell (even if available)
  };
  // Tracking
  lastUpdated: Date;
  updatedBy?: Types.ObjectId;
  source: 'manual' | 'dynamic_pricing' | 'channel_manager' | 'system';
}

const RoomAvailabilitySchema = new Schema<IRoomAvailability>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
    },
    roomTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'RoomType',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalRooms: {
      type: Number,
      required: true,
      min: 0,
    },
    bookedRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    blockedRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    baseRate: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingRate: {
      type: Number,
      required: true,
      min: 0,
    },
    rateType: {
      type: String,
      enum: ['standard', 'weekend', 'seasonal', 'promotional', 'dynamic'],
      default: 'standard',
    },
    rateName: String,
    restrictions: {
      minStay: { type: Number, default: 1, min: 1 },
      maxStay: { type: Number, default: 30, min: 1 },
      closedToArrival: { type: Boolean, default: false },
      closedToDeparture: { type: Boolean, default: false },
      stopSell: { type: Boolean, default: false },
    },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    source: {
      type: String,
      enum: ['manual', 'dynamic_pricing', 'channel_manager', 'system'],
      default: 'system',
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL INDEX: This is the most queried collection
// Compound index for efficient availability lookups
RoomAvailabilitySchema.index(
  { hotelId: 1, roomTypeId: 1, date: 1 },
  { unique: true }
);
RoomAvailabilitySchema.index({ hotelId: 1, date: 1 });
RoomAvailabilitySchema.index({ roomTypeId: 1, date: 1 });

// Pre-save to calculate available rooms
RoomAvailabilitySchema.pre('save', function (next) {
  this.availableRooms = Math.max(0, this.totalRooms - this.bookedRooms - this.blockedRooms);
  this.lastUpdated = new Date();
  next();
});

// Static method to get or create availability for a date range
RoomAvailabilitySchema.statics.getOrCreateForDateRange = async function (
  hotelId: Types.ObjectId,
  roomTypeId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
  defaultRate: number,
  totalRooms: number
) {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current < endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const results = [];
  for (const date of dates) {
    let availability = await this.findOne({
      hotelId,
      roomTypeId,
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });

    if (!availability) {
      availability = await this.create({
        hotelId,
        roomTypeId,
        date,
        totalRooms,
        baseRate: defaultRate,
        sellingRate: defaultRate,
        availableRooms: totalRooms,
      });
    }

    results.push(availability);
  }

  return results;
};

export const RoomAvailability = mongoose.model<IRoomAvailability>(
  'RoomAvailability',
  RoomAvailabilitySchema
);
