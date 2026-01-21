import { Types } from 'mongoose';
import {
  Booking,
  IBooking,
  BookingStatus,
  BookingChannel,
  Room,
  RoomType,
  Guest,
  Hotel,
  RoomAvailability,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/index.js';
import { dateUtils, generateId, revenueUtils } from '../utils/helpers.js';

/**
 * BOOKING SERVICE
 *
 * THE CORE REVENUE ENGINE. Every booking = money.
 *
 * REVENUE IMPACT:
 * - Accurate availability = no double bookings = no refunds
 * - Proper pricing = maximized revenue per room
 * - Channel tracking = identify best revenue sources
 * - Upsells through add-ons = increased average booking value
 */

// ==================== AVAILABILITY CHECK ====================

interface AvailabilityCheckInput {
  hotelId: string;
  checkIn: Date;
  checkOut: Date;
  roomTypeId?: string;
  adults?: number;
  children?: number;
}

interface AvailabilityResult {
  roomTypeId: string;
  roomTypeName: string;
  available: number;
  rate: number;
  totalPrice: number;
  nights: number;
}

/**
 * Check availability for a date range
 * This is called CONSTANTLY - must be fast
 */
export const checkAvailability = async (
  input: AvailabilityCheckInput
): Promise<AvailabilityResult[]> => {
  const { hotelId, checkIn, checkOut, roomTypeId, adults = 1, children = 0 } = input;

  // Validate dates
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkInDate >= checkOutDate) {
    throw ApiError.badRequest('Check-out must be after check-in');
  }

  if (dateUtils.isPast(checkInDate)) {
    throw ApiError.badRequest('Check-in date cannot be in the past');
  }

  const nights = dateUtils.calculateNights(checkInDate, checkOutDate);

  // Get room types for hotel
  const query: Record<string, unknown> = { hotelId, isActive: true };
  if (roomTypeId) query._id = roomTypeId;

  const roomTypes = await RoomType.find(query);

  const results: AvailabilityResult[] = [];

  for (const roomType of roomTypes) {
    // Check occupancy limits
    const totalGuests = adults + children;
    if (totalGuests > roomType.maxOccupancy) continue;
    if (adults > roomType.maxAdults) continue;
    if (children > roomType.maxChildren) continue;

    // Get all rooms of this type
    const rooms = await Room.find({
      hotelId,
      roomTypeId: roomType._id,
      isActive: true,
      status: { $nin: ['maintenance', 'blocked'] },
    });

    if (rooms.length === 0) continue;

    // Check each room for conflicts
    let availableCount = 0;

    for (const room of rooms) {
      // Check if room has any conflicting bookings
      const conflictingBooking = await Booking.findOne({
        roomId: room._id,
        status: { $in: ['confirmed', 'checked_in'] },
        $or: [
          {
            checkInDate: { $lt: checkOutDate },
            checkOutDate: { $gt: checkInDate },
          },
        ],
      });

      if (!conflictingBooking) {
        availableCount++;
      }
    }

    if (availableCount > 0) {
      // Calculate rate (simple for now - will enhance with dynamic pricing)
      const isWeekend = [0, 6].includes(checkInDate.getDay());
      const rate = isWeekend && roomType.pricing.weekendPrice
        ? roomType.pricing.weekendPrice
        : roomType.pricing.basePrice;

      results.push({
        roomTypeId: roomType._id.toString(),
        roomTypeName: roomType.name,
        available: availableCount,
        rate,
        totalPrice: rate * nights,
        nights,
      });
    }
  }

  return results;
};

// ==================== BOOKING CREATION ====================

interface CreateBookingInput {
  hotelId: string;
  roomTypeId: string;
  roomId?: string; // Optional - can auto-assign
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children?: number;
  // Guest info
  guestId?: string;
  guest?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
  };
  // Booking details
  channel: BookingChannel;
  channelDetails?: {
    otaName?: string;
    otaBookingId?: string;
    corporateName?: string;
    corporateCode?: string;
  };
  specialRequests?: string;
  // Pricing overrides (for OTA/corporate rates)
  roomRate?: number;
  discountCode?: string;
  discountAmount?: number;
  // Who's creating this
  createdBy?: string;
}

/**
 * Create a new booking
 * This is where revenue happens!
 */
export const createBooking = async (input: CreateBookingInput): Promise<IBooking> => {
  const {
    hotelId,
    roomTypeId,
    checkIn,
    checkOut,
    adults,
    children = 0,
    channel,
  } = input;

  // Get hotel for settings
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw ApiError.notFound('Hotel not found');

  // Get room type for pricing
  const roomType = await RoomType.findOne({ _id: roomTypeId, hotelId });
  if (!roomType) throw ApiError.notFound('Room type not found');

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = dateUtils.calculateNights(checkInDate, checkOutDate);

  // Validate occupancy
  const totalGuests = adults + children;
  if (totalGuests > roomType.maxOccupancy) {
    throw ApiError.badRequest(
      `Room type ${roomType.name} max occupancy is ${roomType.maxOccupancy}`
    );
  }

  // Find or assign a room
  let room;
  if (input.roomId) {
    // Specific room requested
    room = await Room.findOne({
      _id: input.roomId,
      hotelId,
      roomTypeId,
      isActive: true,
    });

    if (!room) throw ApiError.notFound('Room not found');
  } else {
    // Auto-assign first available room
    const rooms = await Room.find({
      hotelId,
      roomTypeId,
      isActive: true,
      status: { $nin: ['maintenance', 'blocked'] },
    });

    for (const r of rooms) {
      const conflict = await Booking.findOne({
        roomId: r._id,
        status: { $in: ['pending', 'confirmed', 'checked_in'] },
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate },
      });

      if (!conflict) {
        room = r;
        break;
      }
    }
  }

  if (!room) {
    throw ApiError.roomNotAvailable(
      roomTypeId,
      `${dateUtils.format(checkInDate)} - ${dateUtils.format(checkOutDate)}`
    );
  }

  // Verify room is actually available
  const existingBooking = await Booking.findOne({
    roomId: room._id,
    status: { $in: ['pending', 'confirmed', 'checked_in'] },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  });

  if (existingBooking) {
    throw ApiError.bookingConflict(
      `Room ${room.roomNumber} is already booked for these dates`
    );
  }

  // Get or create guest
  let guest;
  if (input.guestId) {
    guest = await Guest.findById(input.guestId);
    if (!guest) throw ApiError.notFound('Guest not found');
  } else if (input.guest) {
    // Try to find existing guest by phone
    guest = await Guest.findOne({ phone: input.guest.phone });

    if (!guest) {
      // Create new guest
      guest = await Guest.create({
        firstName: input.guest.firstName,
        lastName: input.guest.lastName,
        email: input.guest.email,
        phone: input.guest.phone,
        source: channel === 'direct' ? 'direct' : channel === 'ota' ? 'ota' : 'website',
        hotelHistory: [
          {
            hotelId: new Types.ObjectId(hotelId),
            totalStays: 0,
            totalSpent: 0,
            firstStayDate: new Date(),
          },
        ],
      });
    }
  } else {
    throw ApiError.badRequest('Guest information required');
  }

  // Calculate pricing
  const isWeekend = [0, 6].includes(checkInDate.getDay());
  const baseRate = input.roomRate ??
    (isWeekend && roomType.pricing.weekendPrice
      ? roomType.pricing.weekendPrice
      : roomType.pricing.basePrice);

  // Apply room-specific adjustments
  let roomRate = baseRate;
  if (room.priceAdjustment.value !== 0) {
    if (room.priceAdjustment.type === 'fixed') {
      roomRate += room.priceAdjustment.value;
    } else {
      roomRate *= 1 + room.priceAdjustment.value / 100;
    }
  }

  const totalRoomCharges = roomRate * nights;
  const discountAmount = input.discountAmount || 0;
  const subtotal = totalRoomCharges - discountAmount;
  const taxAmount = subtotal * (hotel.settings.taxRate / 100);
  const serviceCharge = subtotal * (hotel.settings.serviceChargeRate / 100);
  const grandTotal = subtotal + taxAmount + serviceCharge;

  // Calculate platform fee (our revenue!)
  const platformFeePercentage =
    channel === 'direct' || channel === 'website' || channel === 'whatsapp'
      ? config.platform.directBookingFeePercentage
      : config.platform.feePercentage;
  const platformFee = revenueUtils.calculatePlatformFee(grandTotal, platformFeePercentage);
  const netRevenue = grandTotal - platformFee;

  // Create the booking
  const booking = await Booking.create({
    hotelId,
    guestId: guest._id,
    roomId: room._id,
    roomTypeId,
    checkInDate,
    checkOutDate,
    nights,
    adults,
    children,
    pricing: {
      roomRate,
      totalRoomCharges,
      addOnsTotal: 0,
      taxAmount,
      serviceCharge,
      discountAmount,
      discountCode: input.discountCode,
      subtotal,
      grandTotal,
      currency: hotel.settings.currency,
      platformFee,
      netRevenue,
    },
    status: hotel.settings.autoConfirmBookings ? 'confirmed' : 'pending',
    paymentStatus: 'pending',
    channel,
    channelDetails: input.channelDetails,
    specialRequests: input.specialRequests,
    createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
    history: [
      {
        action: 'booking_created',
        performedBy: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
        performedAt: new Date(),
        details: `Booking created via ${channel}`,
      },
    ],
  });

  // Update room status
  room.status = 'reserved';
  room.currentBookingId = booking._id;
  room.currentGuestId = guest._id;
  await room.save();

  // Update hotel stats
  await Hotel.updateOne(
    { _id: hotelId },
    {
      $inc: {
        'stats.totalBookings': 1,
        'stats.totalRevenue': grandTotal,
      },
    }
  );

  // Update guest stats
  const hotelHistory = guest.hotelHistory.find(
    (h) => h.hotelId.toString() === hotelId
  );
  if (hotelHistory) {
    hotelHistory.totalStays += 1;
    hotelHistory.totalSpent += grandTotal;
  }
  guest.stats.totalBookings += 1;
  guest.stats.totalSpent += grandTotal;
  guest.stats.totalNights += nights;
  await guest.save();

  // Populate and return
  const populatedBooking = await Booking.findById(booking._id)
    .populate('guest')
    .populate('room')
    .populate('roomType');

  return populatedBooking!;
};

// ==================== BOOKING RETRIEVAL ====================

interface GetBookingsInput {
  hotelId: string;
  status?: BookingStatus | BookingStatus[];
  channel?: BookingChannel;
  checkInFrom?: Date;
  checkInTo?: Date;
  guestId?: string;
  page?: number;
  limit?: number;
}

export const getBookings = async (input: GetBookingsInput) => {
  const {
    hotelId,
    status,
    channel,
    checkInFrom,
    checkInTo,
    guestId,
    page = 1,
    limit = 20,
  } = input;

  const query: Record<string, unknown> = { hotelId };

  if (status) {
    query.status = Array.isArray(status) ? { $in: status } : status;
  }

  if (channel) {
    query.channel = channel;
  }

  if (checkInFrom || checkInTo) {
    query.checkInDate = {};
    if (checkInFrom) (query.checkInDate as Record<string, Date>).$gte = new Date(checkInFrom);
    if (checkInTo) (query.checkInDate as Record<string, Date>).$lte = new Date(checkInTo);
  }

  if (guestId) {
    query.guestId = guestId;
  }

  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('guest', 'firstName lastName email phone')
      .populate('room', 'roomNumber floor')
      .populate('roomType', 'name code')
      .sort({ checkInDate: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(query),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single booking
 */
export const getBooking = async (
  hotelId: string,
  bookingId: string
): Promise<IBooking> => {
  const booking = await Booking.findOne({ _id: bookingId, hotelId })
    .populate('guest')
    .populate('room')
    .populate('roomType');

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  return booking;
};

/**
 * Get booking by confirmation code (for guest lookup)
 */
export const getBookingByConfirmation = async (
  confirmationCode: string
): Promise<IBooking> => {
  const booking = await Booking.findOne({ confirmationCode })
    .populate('guest', 'firstName lastName email phone')
    .populate('room', 'roomNumber floor')
    .populate('roomType', 'name')
    .populate('hotelId', 'name contact.address contact.phone');

  if (!booking) {
    throw ApiError.notFound('Booking not found');
  }

  return booking;
};

// ==================== BOOKING STATUS UPDATES ====================

/**
 * Check in a guest
 */
export const checkIn = async (
  hotelId: string,
  bookingId: string,
  performedBy: string
): Promise<IBooking> => {
  const booking = await Booking.findOne({ _id: bookingId, hotelId });

  if (!booking) throw ApiError.notFound('Booking not found');

  if (booking.status !== 'confirmed') {
    throw ApiError.badRequest(`Cannot check in booking with status: ${booking.status}`);
  }

  booking.status = 'checked_in';
  booking.actualCheckIn = new Date();
  booking.modifiedBy = new Types.ObjectId(performedBy);
  booking.history.push({
    action: 'checked_in',
    performedBy: new Types.ObjectId(performedBy),
    performedAt: new Date(),
    previousStatus: 'confirmed',
    newStatus: 'checked_in',
  });

  await booking.save();

  // Update room status
  await Room.updateOne(
    { _id: booking.roomId },
    { status: 'occupied' }
  );

  return booking;
};

/**
 * Check out a guest
 */
export const checkOut = async (
  hotelId: string,
  bookingId: string,
  performedBy: string
): Promise<IBooking> => {
  const booking = await Booking.findOne({ _id: bookingId, hotelId });

  if (!booking) throw ApiError.notFound('Booking not found');

  if (booking.status !== 'checked_in') {
    throw ApiError.badRequest(`Cannot check out booking with status: ${booking.status}`);
  }

  // Check if balance is paid
  if (booking.balanceDue > 0) {
    throw ApiError.badRequest(
      `Outstanding balance of ${booking.pricing.currency} ${booking.balanceDue}. Collect payment first.`
    );
  }

  booking.status = 'checked_out';
  booking.actualCheckOut = new Date();
  booking.modifiedBy = new Types.ObjectId(performedBy);
  booking.history.push({
    action: 'checked_out',
    performedBy: new Types.ObjectId(performedBy),
    performedAt: new Date(),
    previousStatus: 'checked_in',
    newStatus: 'checked_out',
  });

  await booking.save();

  // Update room status - needs cleaning
  await Room.updateOne(
    { _id: booking.roomId },
    {
      status: 'cleaning',
      housekeepingStatus: 'dirty',
      currentBookingId: null,
      currentGuestId: null,
    }
  );

  return booking;
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (
  hotelId: string,
  bookingId: string,
  reason: string,
  performedBy: string
): Promise<IBooking> => {
  const booking = await Booking.findOne({ _id: bookingId, hotelId });

  if (!booking) throw ApiError.notFound('Booking not found');

  if (['checked_out', 'cancelled', 'no_show'].includes(booking.status)) {
    throw ApiError.badRequest(`Cannot cancel booking with status: ${booking.status}`);
  }

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw ApiError.notFound('Hotel not found');

  // Calculate refund based on cancellation policy
  let refundAmount = 0;
  let penalty = 0;
  const hoursUntilCheckIn =
    (booking.checkInDate.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hotel.settings.cancellationPolicy === 'flexible') {
    // Full refund if > 24 hours
    refundAmount = hoursUntilCheckIn > 24 ? booking.amountPaid : 0;
    penalty = booking.amountPaid - refundAmount;
  } else if (hotel.settings.cancellationPolicy === 'moderate') {
    // Full refund if > 5 days, 50% if > 24 hours
    if (hoursUntilCheckIn > 120) {
      refundAmount = booking.amountPaid;
    } else if (hoursUntilCheckIn > 24) {
      refundAmount = booking.amountPaid * 0.5;
    }
    penalty = booking.amountPaid - refundAmount;
  } else if (hotel.settings.cancellationPolicy === 'strict') {
    // 50% refund if > 7 days
    refundAmount = hoursUntilCheckIn > 168 ? booking.amountPaid * 0.5 : 0;
    penalty = booking.amountPaid - refundAmount;
  }
  // non_refundable = no refund

  booking.status = 'cancelled';
  booking.cancellation = {
    cancelledAt: new Date(),
    cancelledBy: new Types.ObjectId(performedBy),
    reason,
    refundAmount,
    refundStatus: refundAmount > 0 ? 'pending' : 'denied',
    penalty,
  };
  booking.modifiedBy = new Types.ObjectId(performedBy);
  booking.history.push({
    action: 'cancelled',
    performedBy: new Types.ObjectId(performedBy),
    performedAt: new Date(),
    details: reason,
    previousStatus: booking.status,
    newStatus: 'cancelled',
  });

  await booking.save();

  // Free up the room
  await Room.updateOne(
    { _id: booking.roomId },
    {
      status: 'available',
      currentBookingId: null,
      currentGuestId: null,
    }
  );

  // Update guest stats
  await Guest.updateOne(
    { _id: booking.guestId },
    { $inc: { 'stats.cancellations': 1 } }
  );

  return booking;
};

// ==================== PAYMENT RECORDING ====================

interface RecordPaymentInput {
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'paystack' | 'flutterwave' | 'stripe';
  reference?: string;
  transactionId?: string;
  notes?: string;
  receivedBy: string;
}

export const recordPayment = async (
  hotelId: string,
  bookingId: string,
  payment: RecordPaymentInput
): Promise<IBooking> => {
  const booking = await Booking.findOne({ _id: bookingId, hotelId });

  if (!booking) throw ApiError.notFound('Booking not found');

  if (['cancelled', 'no_show'].includes(booking.status)) {
    throw ApiError.badRequest('Cannot record payment for cancelled/no-show booking');
  }

  if (payment.amount <= 0) {
    throw ApiError.badRequest('Payment amount must be positive');
  }

  // Add payment record
  booking.payments.push({
    paymentId: generateId.transaction(),
    amount: payment.amount,
    method: payment.method,
    status: 'completed',
    reference: payment.reference,
    transactionId: payment.transactionId,
    paidAt: new Date(),
    receivedBy: new Types.ObjectId(payment.receivedBy),
    notes: payment.notes,
  });

  // Update totals
  booking.amountPaid += payment.amount;
  booking.balanceDue = Math.max(0, booking.pricing.grandTotal - booking.amountPaid);

  // Update payment status
  if (booking.amountPaid >= booking.pricing.grandTotal) {
    booking.paymentStatus = 'paid';
  } else {
    booking.paymentStatus = 'partial';
  }

  booking.history.push({
    action: 'payment_recorded',
    performedBy: new Types.ObjectId(payment.receivedBy),
    performedAt: new Date(),
    details: `Payment of ${booking.pricing.currency} ${payment.amount} via ${payment.method}`,
  });

  await booking.save();

  return booking;
};

// ==================== TODAY'S OPERATIONS ====================

/**
 * Get today's arrivals, departures, and in-house guests
 */
export const getTodayOperations = async (hotelId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [arrivals, departures, inHouse] = await Promise.all([
    // Today's arrivals (check-ins due)
    Booking.find({
      hotelId,
      checkInDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'checked_in'] },
    })
      .populate('guest', 'firstName lastName phone')
      .populate('room', 'roomNumber')
      .populate('roomType', 'name'),

    // Today's departures (check-outs due)
    Booking.find({
      hotelId,
      checkOutDate: { $gte: today, $lt: tomorrow },
      status: 'checked_in',
    })
      .populate('guest', 'firstName lastName phone')
      .populate('room', 'roomNumber')
      .populate('roomType', 'name'),

    // Currently in-house
    Booking.find({
      hotelId,
      status: 'checked_in',
    })
      .populate('guest', 'firstName lastName phone')
      .populate('room', 'roomNumber')
      .populate('roomType', 'name'),
  ]);

  return {
    arrivals: {
      total: arrivals.length,
      checkedIn: arrivals.filter((b) => b.status === 'checked_in').length,
      pending: arrivals.filter((b) => b.status === 'confirmed').length,
      bookings: arrivals,
    },
    departures: {
      total: departures.length,
      bookings: departures,
    },
    inHouse: {
      total: inHouse.length,
      bookings: inHouse,
    },
  };
};
