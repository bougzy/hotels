import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate, requireHotelContext, authorize } from '../middleware/auth.js';
import { paymentService } from '../services/payment.service.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { Booking, Guest, Hotel } from '../models/index.js';
import { sendPaymentReceipt } from '../services/notification.service.js';

/**
 * PAYMENT ROUTES
 *
 * Handles all payment-related operations.
 *
 * REVENUE IMPACT:
 * - Every payment = money in the bank
 * - Online payments reduce fraud
 * - Payment tracking prevents leakage
 */

const router = Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }
  next();
};

/**
 * Initialize Paystack payment
 * POST /api/v1/payments/initialize
 *
 * Creates a payment and returns Paystack authorization URL
 */
router.post(
  '/initialize',
  authenticate,
  requireHotelContext,
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('callbackUrl').optional().isURL().withMessage('Valid callback URL is required'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId, amount, email, callbackUrl } = req.body;
    const hotelId = req.hotelId!;

    // Get booking to find guest email if not provided
    const booking = await Booking.findById(bookingId).populate('guestId');
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.hotelId.toString() !== hotelId) {
      throw new AppError('Booking does not belong to this hotel', 403);
    }

    // Get guest email
    const guest = await Guest.findById(booking.guestId);
    const guestEmail = email || guest?.email || `guest-${booking.bookingCode}@placeholder.com`;

    const result = await paymentService.initializePayment({
      hotelId,
      bookingId,
      amount,
      email: guestEmail,
      currency: booking.pricing.currency,
      callbackUrl: callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        bookingCode: booking.bookingCode,
        guestName: guest ? `${guest.firstName} ${guest.lastName}` : 'Guest',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Payment initialized',
      data: result,
    });
  })
);

/**
 * Verify Paystack payment
 * GET /api/v1/payments/verify/:reference
 *
 * Verifies payment status with Paystack
 */
router.get(
  '/verify/:reference',
  asyncHandler(async (req: Request, res: Response) => {
    const { reference } = req.params;

    const result = await paymentService.verifyPayment(reference);

    res.status(200).json({
      success: true,
      message: result.success ? 'Payment verified successfully' : 'Payment verification failed',
      data: result,
    });
  })
);

/**
 * Paystack Webhook
 * POST /api/v1/payments/webhook
 *
 * Receives payment notifications from Paystack
 * This is called by Paystack servers, not by our frontend
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    // Verify webhook signature
    const crypto = await import('crypto');
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      throw new AppError('Invalid webhook signature', 401);
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      await paymentService.verifyPayment(reference);
    }

    res.status(200).json({ received: true });
  })
);

/**
 * Record manual payment (cash, card, bank transfer)
 * POST /api/v1/payments/manual
 */
router.post(
  '/manual',
  authenticate,
  requireHotelContext,
  authorize('process_payment'),
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Valid amount is required'),
    body('method')
      .isIn(['cash', 'card', 'bank_transfer', 'mobile_money'])
      .withMessage('Valid payment method is required'),
    body('receiptNumber').optional().isString(),
    body('notes').optional().isString(),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId, amount, method, receiptNumber, notes } = req.body;
    const hotelId = req.hotelId!;
    const userId = req.user!._id.toString();

    // Verify booking belongs to hotel
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.hotelId.toString() !== hotelId) {
      throw new AppError('Booking does not belong to this hotel', 403);
    }

    const payment = await paymentService.recordManualPayment({
      hotelId,
      bookingId,
      amount,
      method,
      receivedBy: userId,
      receiptNumber,
      notes,
    });

    // Send payment receipt notification (async, don't block response)
    try {
      const hotel = await Hotel.findById(hotelId);
      const guest = await Guest.findById(booking.guestId);
      const updatedBooking = await Booking.findById(bookingId);

      if (hotel && guest && updatedBooking) {
        sendPaymentReceipt({
          guestName: `${guest.firstName} ${guest.lastName}`,
          guestEmail: guest.email,
          hotelName: hotel.name,
          hotelPhone: hotel.contact?.phone || '',
          bookingCode: updatedBooking.bookingCode,
          receiptNumber: payment.paymentCode,
          amountPaid: amount.toLocaleString(),
          balanceDue: updatedBooking.balanceDue,
          paymentMethod: method,
          paymentDate: new Date().toLocaleDateString(),
          currency: updatedBooking.pricing.currency,
        }).catch(err => console.error('[Notification] Failed to send payment receipt:', err));
      }
    } catch (err) {
      console.error('[Notification] Error preparing payment receipt:', err);
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  })
);

/**
 * Get payments for a booking
 * GET /api/v1/payments/booking/:bookingId
 */
router.get(
  '/booking/:bookingId',
  authenticate,
  requireHotelContext,
  asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const hotelId = req.hotelId!;

    // Verify booking belongs to hotel
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.hotelId.toString() !== hotelId) {
      throw new AppError('Booking does not belong to this hotel', 403);
    }

    const payments = await paymentService.getBookingPayments(bookingId);

    res.status(200).json({
      success: true,
      data: {
        payments,
        booking: {
          grandTotal: booking.pricing.grandTotal,
          amountPaid: booking.amountPaid,
          balanceDue: booking.balanceDue,
          paymentStatus: booking.paymentStatus,
        },
      },
    });
  })
);

/**
 * Get all payments for hotel
 * GET /api/v1/payments
 */
router.get(
  '/',
  authenticate,
  requireHotelContext,
  authorize('view_payments'),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded']),
    query('method').optional().isIn(['cash', 'card', 'bank_transfer', 'mobile_money', 'paystack', 'flutterwave', 'stripe']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const hotelId = req.hotelId!;
    const { startDate, endDate, status, method, limit, skip } = req.query;

    const result = await paymentService.getHotelPayments(hotelId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as string,
      method: method as string,
      limit: limit ? parseInt(limit as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  })
);

export default router;
