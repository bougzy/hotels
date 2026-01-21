import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  asyncHandler,
  validate,
  authenticate,
  requireHotelAccess,
  requireRole,
  optionalAuth,
} from '../middleware/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as bookingService from '../services/booking.service.js';
import { sendBookingConfirmation } from '../services/notification.service.js';
import { Hotel, Guest, RoomType, Room } from '../models/index.js';
import { dateUtils } from '../utils/helpers.js';

/**
 * BOOKING ROUTES
 *
 * THE REVENUE ENGINE ENDPOINTS.
 * Handles booking creation, management, and operations.
 *
 * REVENUE IMPACT:
 * - Every booking = revenue
 * - Fast availability checks = better conversion
 * - Smooth check-in/out = happy guests = return bookings
 */

const router = Router();

// ==================== PUBLIC ROUTES (Booking Widget) ====================

/**
 * GET /bookings/availability
 * Check room availability - PUBLIC for booking widget
 */
router.get(
  '/availability',
  validate([
    query('hotelId').isMongoId().withMessage('Valid hotel ID required'),
    query('checkIn').isISO8601().withMessage('Valid check-in date required'),
    query('checkOut').isISO8601().withMessage('Valid check-out date required'),
  ]),
  asyncHandler(async (req, res) => {
    const availability = await bookingService.checkAvailability({
      hotelId: req.query.hotelId as string,
      checkIn: new Date(req.query.checkIn as string),
      checkOut: new Date(req.query.checkOut as string),
      roomTypeId: req.query.roomTypeId as string | undefined,
      adults: req.query.adults ? parseInt(req.query.adults as string) : undefined,
      children: req.query.children ? parseInt(req.query.children as string) : undefined,
    });

    return ApiResponse.success(res, availability);
  })
);

/**
 * POST /bookings/public
 * Create booking from public widget - Needs hotel ID in body
 */
router.post(
  '/public',
  validate([
    body('hotelId').isMongoId().withMessage('Valid hotel ID required'),
    body('roomTypeId').isMongoId().withMessage('Valid room type ID required'),
    body('checkIn').isISO8601().withMessage('Valid check-in date required'),
    body('checkOut').isISO8601().withMessage('Valid check-out date required'),
    body('adults').isInt({ min: 1 }).withMessage('At least 1 adult required'),
    body('guest.firstName').trim().notEmpty().withMessage('Guest first name required'),
    body('guest.lastName').trim().notEmpty().withMessage('Guest last name required'),
    body('guest.phone').trim().notEmpty().withMessage('Guest phone required'),
  ]),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.createBooking({
      ...req.body,
      channel: 'website',
    });

    // Send booking confirmation notification (async, don't block response)
    try {
      const hotel = await Hotel.findById(req.body.hotelId);
      const guest = await Guest.findById(booking.guestId);
      const roomType = await RoomType.findById(booking.roomTypeId);
      const room = await Room.findById(booking.roomId);

      if (hotel && guest && roomType) {
        sendBookingConfirmation({
          guestName: `${guest.firstName} ${guest.lastName}`,
          guestPhone: guest.phone,
          guestEmail: guest.email,
          hotelName: hotel.name,
          hotelPhone: hotel.contact?.phone || '',
          bookingCode: booking.bookingCode,
          confirmationCode: booking.confirmationCode,
          roomType: roomType.name,
          roomNumber: room?.roomNumber,
          checkInDate: dateUtils.format(booking.checkInDate),
          checkOutDate: dateUtils.format(booking.checkOutDate),
          totalAmount: booking.pricing.grandTotal.toLocaleString(),
          currency: booking.pricing.currency,
        }).catch(err => console.error('[Notification] Failed to send booking confirmation:', err));
      }
    } catch (err) {
      console.error('[Notification] Error preparing booking confirmation:', err);
    }

    return ApiResponse.created(res, {
      bookingCode: booking.bookingCode,
      confirmationCode: booking.confirmationCode,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      totalAmount: booking.pricing.grandTotal,
      currency: booking.pricing.currency,
    }, 'Booking created successfully');
  })
);

/**
 * GET /bookings/lookup/:confirmationCode
 * Look up booking by confirmation code - for guests
 */
router.get(
  '/lookup/:confirmationCode',
  asyncHandler(async (req, res) => {
    const booking = await bookingService.getBookingByConfirmation(
      req.params.confirmationCode
    );

    return ApiResponse.success(res, booking);
  })
);

// ==================== PROTECTED ROUTES ====================

router.use(authenticate);

/**
 * POST /bookings
 * Create booking from dashboard
 */
router.post(
  '/',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager', 'receptionist'),
  validate([
    body('roomTypeId').isMongoId().withMessage('Valid room type ID required'),
    body('checkIn').isISO8601().withMessage('Valid check-in date required'),
    body('checkOut').isISO8601().withMessage('Valid check-out date required'),
    body('adults').isInt({ min: 1 }).withMessage('At least 1 adult required'),
    body('channel').isIn(['direct', 'website', 'whatsapp', 'ota', 'corporate', 'agent', 'gds'])
      .withMessage('Valid channel required'),
  ]),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.createBooking({
      hotelId: req.hotelId!,
      ...req.body,
      createdBy: req.userId,
    });

    // Send booking confirmation notification (async, don't block response)
    try {
      const hotel = await Hotel.findById(req.hotelId);
      const guest = await Guest.findById(booking.guestId);
      const roomType = await RoomType.findById(booking.roomTypeId);
      const room = await Room.findById(booking.roomId);

      if (hotel && guest && roomType) {
        sendBookingConfirmation({
          guestName: `${guest.firstName} ${guest.lastName}`,
          guestPhone: guest.phone,
          guestEmail: guest.email,
          hotelName: hotel.name,
          hotelPhone: hotel.contact?.phone || '',
          bookingCode: booking.bookingCode,
          confirmationCode: booking.confirmationCode,
          roomType: roomType.name,
          roomNumber: room?.roomNumber,
          checkInDate: dateUtils.format(booking.checkInDate),
          checkOutDate: dateUtils.format(booking.checkOutDate),
          totalAmount: booking.pricing.grandTotal.toLocaleString(),
          currency: booking.pricing.currency,
        }).catch(err => console.error('[Notification] Failed to send booking confirmation:', err));
      }
    } catch (err) {
      console.error('[Notification] Error preparing booking confirmation:', err);
    }

    return ApiResponse.created(res, booking, 'Booking created');
  })
);

/**
 * GET /bookings
 * Get bookings list with filters
 */
router.get(
  '/',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const result = await bookingService.getBookings({
      hotelId: req.hotelId!,
      status: req.query.status as any,
      channel: req.query.channel as any,
      checkInFrom: req.query.checkInFrom ? new Date(req.query.checkInFrom as string) : undefined,
      checkInTo: req.query.checkInTo ? new Date(req.query.checkInTo as string) : undefined,
      guestId: req.query.guestId as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });

    return ApiResponse.paginated(
      res,
      result.bookings,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total
    );
  })
);

/**
 * GET /bookings/today
 * Get today's operations (arrivals, departures, in-house)
 */
router.get(
  '/today',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const operations = await bookingService.getTodayOperations(req.hotelId!);

    return ApiResponse.success(res, operations);
  })
);

/**
 * GET /bookings/:bookingId
 * Get single booking details
 */
router.get(
  '/:bookingId',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const booking = await bookingService.getBooking(req.hotelId!, req.params.bookingId);

    return ApiResponse.success(res, booking);
  })
);

/**
 * POST /bookings/:bookingId/check-in
 * Check in a guest
 */
router.post(
  '/:bookingId/check-in',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager', 'receptionist'),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.checkIn(
      req.hotelId!,
      req.params.bookingId,
      req.userId!
    );

    return ApiResponse.success(res, booking, 'Guest checked in');
  })
);

/**
 * POST /bookings/:bookingId/check-out
 * Check out a guest
 */
router.post(
  '/:bookingId/check-out',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager', 'receptionist'),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.checkOut(
      req.hotelId!,
      req.params.bookingId,
      req.userId!
    );

    return ApiResponse.success(res, booking, 'Guest checked out');
  })
);

/**
 * POST /bookings/:bookingId/cancel
 * Cancel a booking
 */
router.post(
  '/:bookingId/cancel',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  validate([
    body('reason').trim().notEmpty().withMessage('Cancellation reason required'),
  ]),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.cancelBooking(
      req.hotelId!,
      req.params.bookingId,
      req.body.reason,
      req.userId!
    );

    return ApiResponse.success(res, booking, 'Booking cancelled');
  })
);

/**
 * POST /bookings/:bookingId/payment
 * Record a payment
 */
router.post(
  '/:bookingId/payment',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager', 'receptionist', 'accountant'),
  validate([
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    body('method')
      .isIn(['cash', 'card', 'bank_transfer', 'mobile_money', 'paystack', 'flutterwave', 'stripe'])
      .withMessage('Valid payment method required'),
  ]),
  asyncHandler(async (req, res) => {
    const booking = await bookingService.recordPayment(
      req.hotelId!,
      req.params.bookingId,
      {
        ...req.body,
        receivedBy: req.userId!,
      }
    );

    return ApiResponse.success(res, booking, 'Payment recorded');
  })
);

export { router as bookingRoutes };
