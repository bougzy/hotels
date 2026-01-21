import mongoose, { Document, Schema, Types } from 'mongoose';
import { generateId } from '../utils/helpers.js';

/**
 * PAYMENT MODEL
 *
 * Standalone payment tracking for all transactions.
 * Links to bookings but can also track other payments (deposits, add-ons, etc.)
 *
 * REVENUE IMPACT:
 * - Complete payment audit trail
 * - Reconciliation made easy
 * - Fraud detection through patterns
 * - Financial reporting accuracy
 */

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'mobile_money'
  | 'paystack'
  | 'flutterwave'
  | 'stripe';

export type PaymentType =
  | 'booking'           // Payment for a booking
  | 'deposit'           // Advance deposit
  | 'addon'             // Add-on services
  | 'refund'            // Refund to guest
  | 'penalty'           // Cancellation penalty
  | 'other';

export type PaymentGatewayStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'abandoned'
  | 'reversed';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  paymentCode: string;

  // What is this payment for?
  type: PaymentType;
  bookingId?: Types.ObjectId;
  guestId?: Types.ObjectId;

  // Amount details
  amount: number;
  currency: string;

  // Payment method
  method: PaymentMethod;

  // Gateway details (for online payments)
  gateway?: {
    name: 'paystack' | 'flutterwave' | 'stripe';
    reference: string;        // Our reference sent to gateway
    transactionId?: string;   // Gateway's transaction ID
    authorizationCode?: string;
    status: PaymentGatewayStatus;
    responseCode?: string;
    responseMessage?: string;
    paidAt?: Date;
    metadata?: Record<string, any>;
  };

  // For manual payments
  manual?: {
    receivedBy: Types.ObjectId;
    receiptNumber?: string;
    notes?: string;
  };

  // Status
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

  // Refund tracking
  refund?: {
    refundedAt: Date;
    refundedBy: Types.ObjectId;
    reason: string;
    refundReference?: string;
    refundTransactionId?: string;
  };

  // Audit
  createdBy?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },
    paymentCode: {
      type: String,
      unique: true,
      default: () => generateId.transaction(),
    },
    type: {
      type: String,
      enum: ['booking', 'deposit', 'addon', 'refund', 'penalty', 'other'],
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'mobile_money', 'paystack', 'flutterwave', 'stripe'],
      required: true,
    },
    gateway: {
      name: {
        type: String,
        enum: ['paystack', 'flutterwave', 'stripe'],
      },
      reference: String,
      transactionId: String,
      authorizationCode: String,
      status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'abandoned', 'reversed'],
      },
      responseCode: String,
      responseMessage: String,
      paidAt: Date,
      metadata: Schema.Types.Mixed,
    },
    manual: {
      receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      receiptNumber: String,
      notes: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    refund: {
      refundedAt: Date,
      refundedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      refundReference: String,
      refundTransactionId: String,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
PaymentSchema.index({ hotelId: 1, createdAt: -1 });
PaymentSchema.index({ hotelId: 1, status: 1 });
PaymentSchema.index({ 'gateway.reference': 1 }, { sparse: true });
PaymentSchema.index({ 'gateway.transactionId': 1 }, { sparse: true });

// Virtual to populate booking
PaymentSchema.virtual('booking', {
  ref: 'Booking',
  localField: 'bookingId',
  foreignField: '_id',
  justOne: true,
});

PaymentSchema.virtual('guest', {
  ref: 'Guest',
  localField: 'guestId',
  foreignField: '_id',
  justOne: true,
});

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
