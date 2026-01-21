import { Types } from 'mongoose';
import { Payment, Booking, Hotel, Guest } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateId } from '../utils/helpers.js';
import { sendPaymentReceipt } from './notification.service.js';

/**
 * PAYSTACK PAYMENT SERVICE
 *
 * Handles all Paystack payment operations.
 * Paystack is the preferred gateway for Nigeria/Africa.
 *
 * REVENUE IMPACT:
 * - Enables online payments = more bookings
 * - Reduces cash handling fraud
 * - Automatic reconciliation
 * - Real-time payment tracking
 */

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned' | 'reversed';
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    customer: {
      id: number;
      email: string;
      customer_code: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    };
  };
}

class PaystackService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(params: {
    hotelId: string;
    bookingId: string;
    amount: number;
    email: string;
    currency?: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
  }) {
    if (!this.secretKey) {
      throw new AppError('Paystack is not configured. Please add PAYSTACK_SECRET_KEY.', 500);
    }

    const reference = `PAY-${generateId.transaction()}`;

    // Create payment record
    const payment = await Payment.create({
      hotelId: new Types.ObjectId(params.hotelId),
      bookingId: new Types.ObjectId(params.bookingId),
      type: 'booking',
      amount: params.amount,
      currency: params.currency || 'NGN',
      method: 'paystack',
      status: 'pending',
      gateway: {
        name: 'paystack',
        reference,
        status: 'pending',
      },
    });

    // Initialize with Paystack
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amount * 100), // Paystack uses kobo (smallest unit)
        currency: params.currency || 'NGN',
        reference,
        callback_url: params.callbackUrl,
        metadata: {
          hotelId: params.hotelId,
          bookingId: params.bookingId,
          paymentId: payment._id.toString(),
          ...params.metadata,
        },
      }),
    });

    const data: PaystackInitResponse = await response.json();

    if (!data.status) {
      // Update payment as failed
      payment.status = 'failed';
      payment.gateway!.status = 'failed';
      payment.gateway!.responseMessage = data.message;
      await payment.save();

      throw new AppError(`Payment initialization failed: ${data.message}`, 400);
    }

    return {
      paymentId: payment._id,
      reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
    };
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string) {
    if (!this.secretKey) {
      throw new AppError('Paystack is not configured', 500);
    }

    // Find the payment
    const payment = await Payment.findOne({ 'gateway.reference': reference });
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // Verify with Paystack
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data: PaystackVerifyResponse = await response.json();

    if (!data.status) {
      throw new AppError(`Verification failed: ${data.message}`, 400);
    }

    const txData = data.data;

    // Update payment record
    payment.gateway!.transactionId = txData.id.toString();
    payment.gateway!.status = txData.status;
    payment.gateway!.responseMessage = txData.gateway_response;
    payment.gateway!.authorizationCode = txData.authorization?.authorization_code;
    payment.gateway!.paidAt = txData.paid_at ? new Date(txData.paid_at) : undefined;
    payment.gateway!.metadata = {
      channel: txData.channel,
      cardType: txData.authorization?.card_type,
      bank: txData.authorization?.bank,
      last4: txData.authorization?.last4,
    };

    if (txData.status === 'success') {
      payment.status = 'completed';

      // Update booking payment status
      if (payment.bookingId) {
        const booking = await Booking.findById(payment.bookingId);
        if (booking) {
          // Add payment to booking's payments array
          booking.payments.push({
            paymentId: payment.paymentCode,
            amount: payment.amount,
            method: 'paystack',
            status: 'completed',
            reference: reference,
            transactionId: txData.id.toString(),
            paidAt: new Date(txData.paid_at),
          });

          // Update amount paid
          booking.amountPaid += payment.amount;
          booking.balanceDue = Math.max(0, booking.pricing.grandTotal - booking.amountPaid);

          // Update payment and booking status
          if (booking.amountPaid >= booking.pricing.grandTotal) {
            booking.paymentStatus = 'paid';
            if (booking.status === 'pending') {
              booking.status = 'confirmed';
            }
          } else {
            booking.paymentStatus = 'partial';
          }

          // Add to history
          booking.history.push({
            action: 'payment_received',
            performedAt: new Date(),
            details: `Payment of ${payment.currency} ${payment.amount} received via Paystack`,
          });

          await booking.save();

          // Send payment receipt notification
          try {
            const hotel = await Hotel.findById(payment.hotelId);
            const guest = await Guest.findById(booking.guestId);

            if (hotel && guest) {
              sendPaymentReceipt({
                guestName: `${guest.firstName} ${guest.lastName}`,
                guestEmail: guest.email,
                hotelName: hotel.name,
                hotelPhone: hotel.contact?.phone || '',
                bookingCode: booking.bookingCode,
                receiptNumber: payment.paymentCode,
                amountPaid: payment.amount.toLocaleString(),
                balanceDue: booking.balanceDue,
                paymentMethod: 'Online (Paystack)',
                paymentDate: new Date().toLocaleDateString(),
                currency: payment.currency,
              }).catch(err => console.error('[Notification] Failed to send payment receipt:', err));
            }
          } catch (err) {
            console.error('[Notification] Error preparing payment receipt:', err);
          }
        }
      }
    } else {
      payment.status = 'failed';
    }

    await payment.save();

    return {
      success: txData.status === 'success',
      payment,
      transaction: {
        reference: txData.reference,
        amount: txData.amount / 100, // Convert from kobo
        status: txData.status,
        paidAt: txData.paid_at,
        channel: txData.channel,
      },
    };
  }

  /**
   * Record a manual/cash payment
   */
  async recordManualPayment(params: {
    hotelId: string;
    bookingId: string;
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'mobile_money';
    receivedBy: string;
    receiptNumber?: string;
    notes?: string;
  }) {
    const booking = await Booking.findById(params.bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Create payment record
    const payment = await Payment.create({
      hotelId: new Types.ObjectId(params.hotelId),
      bookingId: new Types.ObjectId(params.bookingId),
      guestId: booking.guestId,
      type: 'booking',
      amount: params.amount,
      currency: booking.pricing.currency,
      method: params.method,
      status: 'completed',
      manual: {
        receivedBy: new Types.ObjectId(params.receivedBy),
        receiptNumber: params.receiptNumber,
        notes: params.notes,
      },
      createdBy: new Types.ObjectId(params.receivedBy),
    });

    // Update booking
    booking.payments.push({
      paymentId: payment.paymentCode,
      amount: params.amount,
      method: params.method,
      status: 'completed',
      paidAt: new Date(),
      receivedBy: new Types.ObjectId(params.receivedBy),
      notes: params.notes,
    });

    booking.amountPaid += params.amount;
    booking.balanceDue = Math.max(0, booking.pricing.grandTotal - booking.amountPaid);

    if (booking.amountPaid >= booking.pricing.grandTotal) {
      booking.paymentStatus = 'paid';
      if (booking.status === 'pending') {
        booking.status = 'confirmed';
      }
    } else {
      booking.paymentStatus = 'partial';
    }

    booking.history.push({
      action: 'payment_received',
      performedBy: new Types.ObjectId(params.receivedBy),
      performedAt: new Date(),
      details: `Manual payment of ${booking.pricing.currency} ${params.amount} received (${params.method})`,
    });

    await booking.save();

    return payment;
  }

  /**
   * Get payments for a booking
   */
  async getBookingPayments(bookingId: string) {
    return Payment.find({ bookingId: new Types.ObjectId(bookingId) })
      .sort({ createdAt: -1 });
  }

  /**
   * Get all payments for a hotel
   */
  async getHotelPayments(hotelId: string, options: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    method?: string;
    limit?: number;
    skip?: number;
  } = {}) {
    const query: any = { hotelId: new Types.ObjectId(hotelId) };

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }
    if (options.status) query.status = options.status;
    if (options.method) query.method = options.method;

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .populate('booking')
      .populate('guest');

    const total = await Payment.countDocuments(query);

    // Calculate summary
    const summary = await Payment.aggregate([
      { $match: { ...query, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      payments,
      total,
      summary: summary[0] || { totalAmount: 0, count: 0 },
    };
  }
}

export const paymentService = new PaystackService();
