import mongoose, { Document, Schema, Types } from 'mongoose';
import { generateId, dateUtils } from '../utils/helpers.js';

/**
 * BOOKING MODEL
 *
 * The CORE revenue-generating entity. Every booking = revenue.
 * Tracks the entire lifecycle from reservation to checkout.
 *
 * REVENUE IMPACT:
 * - Accurate booking tracking = accurate revenue reporting
 * - Status management prevents double bookings
 * - Channel tracking identifies most profitable sources
 * - Add-ons and upsells captured here increase revenue per booking
 */

export type BookingStatus =
  | 'pending'       // Just created, awaiting payment/confirmation
  | 'confirmed'     // Payment received or manually confirmed
  | 'checked_in'    // Guest has arrived
  | 'checked_out'   // Stay completed
  | 'cancelled'     // Booking cancelled
  | 'no_show';      // Guest didn't arrive

export type PaymentStatus =
  | 'pending'
  | 'partial'       // Partial payment received
  | 'paid'          // Fully paid
  | 'refunded'
  | 'failed';

export type BookingChannel =
  | 'direct'        // Direct booking (website, phone, walk-in)
  | 'website'       // Booking widget on hotel's website
  | 'whatsapp'      // WhatsApp booking (HUGE in Africa)
  | 'ota'           // Online Travel Agency
  | 'corporate'     // Corporate booking
  | 'agent'         // Travel agent
  | 'gds';          // Global Distribution System

export interface IBookingAddOn {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: Date;
  addedBy?: Types.ObjectId;
}

export interface IBookingPayment {
  paymentId: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'paystack' | 'flutterwave' | 'stripe';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  reference?: string;
  transactionId?: string;
  paidAt?: Date;
  receivedBy?: Types.ObjectId;
  notes?: string;
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  bookingCode: string; // Human-readable booking reference
  confirmationCode: string; // What guest receives
  guestId: Types.ObjectId;
  roomId: Types.ObjectId;
  roomTypeId: Types.ObjectId;
  // Stay details
  checkInDate: Date;
  checkOutDate: Date;
  actualCheckIn?: Date;
  actualCheckOut?: Date;
  nights: number;
  adults: number;
  children: number;
  // Pricing breakdown - CRITICAL for revenue tracking
  pricing: {
    roomRate: number;           // Per night rate
    totalRoomCharges: number;   // roomRate * nights
    addOnsTotal: number;
    taxAmount: number;
    serviceCharge: number;
    discountAmount: number;
    discountCode?: string;
    subtotal: number;
    grandTotal: number;
    currency: string;
    // Platform fee tracking
    platformFee: number;
    netRevenue: number;         // What hotel actually receives
  };
  // Status tracking
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  // Channel attribution - WHERE the booking came from
  channel: BookingChannel;
  channelDetails?: {
    otaName?: string;           // e.g., "Booking.com", "Expedia"
    otaBookingId?: string;
    otaCommission?: number;
    corporateName?: string;
    corporateCode?: string;
    agentName?: string;
    agentCode?: string;
  };
  // Guest requests & notes
  specialRequests?: string;
  internalNotes?: string;
  // Add-ons (extra revenue!)
  addOns: IBookingAddOn[];
  // Payments
  payments: IBookingPayment[];
  amountPaid: number;
  balanceDue: number;
  // Cancellation
  cancellation?: {
    cancelledAt: Date;
    cancelledBy: Types.ObjectId;
    reason: string;
    refundAmount: number;
    refundStatus: 'pending' | 'processed' | 'denied';
    penalty: number;
  };
  // Audit trail
  createdBy?: Types.ObjectId;
  modifiedBy?: Types.ObjectId;
  history: Array<{
    action: string;
    performedBy?: Types.ObjectId;
    performedAt: Date;
    details?: string;
    previousStatus?: string;
    newStatus?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },
    bookingCode: {
      type: String,
      unique: true,
      default: () => generateId.booking(),
    },
    confirmationCode: {
      type: String,
      unique: true,
      default: () => generateId.confirmation(),
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
      required: true,
      index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    roomTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'RoomType',
      required: true,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },
    actualCheckIn: Date,
    actualCheckOut: Date,
    nights: {
      type: Number,
      required: true,
      min: [1, 'Minimum stay is 1 night'],
    },
    adults: {
      type: Number,
      required: true,
      min: [1, 'At least 1 adult required'],
      default: 1,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricing: {
      roomRate: { type: Number, required: true, min: 0 },
      totalRoomCharges: { type: Number, required: true, min: 0 },
      addOnsTotal: { type: Number, default: 0, min: 0 },
      taxAmount: { type: Number, default: 0, min: 0 },
      serviceCharge: { type: Number, default: 0, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
      discountCode: String,
      subtotal: { type: Number, required: true, min: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'NGN' },
      platformFee: { type: Number, default: 0, min: 0 },
      netRevenue: { type: Number, required: true, min: 0 },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    channel: {
      type: String,
      enum: ['direct', 'website', 'whatsapp', 'ota', 'corporate', 'agent', 'gds'],
      default: 'direct',
    },
    channelDetails: {
      otaName: String,
      otaBookingId: String,
      otaCommission: Number,
      corporateName: String,
      corporateCode: String,
      agentName: String,
      agentCode: String,
    },
    specialRequests: String,
    internalNotes: String,
    addOns: [
      {
        name: { type: String, required: true },
        description: String,
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    payments: [
      {
        paymentId: { type: String, default: () => generateId.transaction() },
        amount: { type: Number, required: true, min: 0 },
        method: {
          type: String,
          enum: ['cash', 'card', 'bank_transfer', 'mobile_money', 'paystack', 'flutterwave', 'stripe'],
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'completed', 'failed', 'refunded'],
          default: 'pending',
        },
        reference: String,
        transactionId: String,
        paidAt: Date,
        receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },
    cancellation: {
      cancelledAt: Date,
      cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      refundAmount: { type: Number, default: 0 },
      refundStatus: {
        type: String,
        enum: ['pending', 'processed', 'denied'],
      },
      penalty: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    history: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        details: String,
        previousStatus: String,
        newStatus: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common queries
// Note: bookingCode and confirmationCode already have unique: true which creates indexes
BookingSchema.index({ hotelId: 1, status: 1 });
BookingSchema.index({ hotelId: 1, checkInDate: 1 });
BookingSchema.index({ hotelId: 1, checkOutDate: 1 });
BookingSchema.index({ hotelId: 1, createdAt: -1 });
BookingSchema.index({ roomId: 1, checkInDate: 1, checkOutDate: 1 });
BookingSchema.index({ 'channelDetails.otaBookingId': 1 }, { sparse: true });

// Pre-save hook to calculate nights and balance
BookingSchema.pre('save', function (next) {
  // Calculate nights if dates changed
  if (this.isModified('checkInDate') || this.isModified('checkOutDate')) {
    this.nights = dateUtils.calculateNights(this.checkInDate, this.checkOutDate);
  }

  // Update balance due
  this.balanceDue = Math.max(0, this.pricing.grandTotal - this.amountPaid);

  // Update payment status based on amounts
  if (this.amountPaid >= this.pricing.grandTotal) {
    this.paymentStatus = 'paid';
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'partial';
  }

  next();
});

// Virtual to populate room details
BookingSchema.virtual('room', {
  ref: 'Room',
  localField: 'roomId',
  foreignField: '_id',
  justOne: true,
});

BookingSchema.virtual('guest', {
  ref: 'Guest',
  localField: 'guestId',
  foreignField: '_id',
  justOne: true,
});

BookingSchema.virtual('roomType', {
  ref: 'RoomType',
  localField: 'roomTypeId',
  foreignField: '_id',
  justOne: true,
});

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
