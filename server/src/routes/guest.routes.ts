import { Router } from 'express';
import { Types } from 'mongoose';
import { Guest } from '../models/Guest.js';
import { Booking } from '../models/Booking.js';
import { authenticate, requireHotelAccess, requireRole, asyncHandler } from '../middleware/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * GUEST ROUTES
 *
 * Guest management for hotel operations.
 *
 * REVENUE IMPACT:
 * - Guest profiles enable personalization (higher satisfaction)
 * - Contact info enables direct marketing (reduces OTA dependency)
 * - History tracking identifies VIPs for special treatment
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /guests/search/quick
 * Quick search for guests (used in booking forms)
 * NOTE: This must be before /:guestId to avoid conflict
 */
router.get(
  '/search/quick',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const search = req.query.q as string;

    if (!search || search.length < 2) {
      return ApiResponse.success(res, []);
    }

    const guests = await Guest.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    })
      .select('guestCode firstName lastName email phone')
      .limit(10)
      .lean();

    return ApiResponse.success(res, guests);
  })
);

/**
 * GET /guests
 * List guests for the hotel with search and filters
 */
router.get(
  '/',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const hotelId = req.hotelId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    // Build query - find guests who have stayed at this hotel
    const query: any = {
      'hotelHistory.hotelId': new Types.ObjectId(hotelId),
    };

    // Search by name, email, or phone
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { guestCode: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by VIP status
    if (req.query.isVip === 'true') {
      query['hotelHistory.isVip'] = true;
    }

    // Filter by blacklist status
    if (req.query.isBlacklisted !== undefined) {
      query.isBlacklisted = req.query.isBlacklisted === 'true';
    }

    const [guests, total] = await Promise.all([
      Guest.find(query)
        .select('guestCode firstName lastName email phone stats hotelHistory isBlacklisted blacklistReason tags createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Guest.countDocuments(query),
    ]);

    // Add hotel-specific stats to each guest
    const guestsWithHotelStats = guests.map((guest: any) => {
      const hotelStats = guest.hotelHistory?.find(
        (h: any) => h.hotelId.toString() === hotelId
      );
      return {
        ...guest,
        isVip: hotelStats?.isVip || false,
        stats: {
          totalBookings: hotelStats?.totalStays || 0,
          totalSpent: hotelStats?.totalSpent || 0,
          lastVisit: hotelStats?.lastStayDate,
          averageStay: guest.stats?.averageStayLength || 0,
        },
      };
    });

    return ApiResponse.paginated(res, guestsWithHotelStats, page, limit, total);
  })
);

/**
 * GET /guests/:guestId
 * Get single guest profile with full details
 */
router.get(
  '/:guestId',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const { guestId } = req.params;
    const hotelId = req.hotelId!;

    const guest = await Guest.findById(guestId).lean();

    if (!guest) {
      throw ApiError.notFound('Guest not found');
    }

    // Get booking history for this hotel
    const bookings = await Booking.find({
      guestId: new Types.ObjectId(guestId),
      hotelId: new Types.ObjectId(hotelId),
    })
      .select('bookingCode confirmationCode checkInDate checkOutDate status pricing.grandTotal roomType')
      .populate('roomType', 'name')
      .sort({ checkInDate: -1 })
      .limit(20)
      .lean();

    // Get hotel-specific stats
    const hotelStats = (guest as any).hotelHistory?.find(
      (h: any) => h.hotelId.toString() === hotelId
    );

    return ApiResponse.success(res, {
      ...guest,
      hotelStats,
      recentBookings: bookings,
    });
  })
);

/**
 * POST /guests
 * Create a new guest profile
 */
router.post(
  '/',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager', 'receptionist'),
  asyncHandler(async (req, res) => {
    const hotelId = req.hotelId!;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      nationality,
      address,
      document,
      preferences,
      source,
      sourceDetails,
    } = req.body;

    // Check if guest with same phone exists
    let guest = await Guest.findOne({ phone });

    if (guest) {
      // Check if already associated with this hotel
      const existingHotelHistory = guest.hotelHistory.find(
        (h) => h.hotelId.toString() === hotelId
      );

      if (!existingHotelHistory) {
        // Add hotel to guest's history
        guest.hotelHistory.push({
          hotelId: new Types.ObjectId(hotelId),
          totalStays: 0,
          totalSpent: 0,
          firstStayDate: new Date(),
        } as any);
        await guest.save();
      }

      return ApiResponse.success(res, guest, 'Existing guest found and linked to hotel');
    }

    // Create new guest
    guest = new Guest({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      nationality,
      address,
      document,
      preferences: preferences || {
        communicationPreference: 'whatsapp',
        language: 'en',
      },
      source: source || 'direct',
      sourceDetails,
      hotelHistory: [
        {
          hotelId: new Types.ObjectId(hotelId),
          totalStays: 0,
          totalSpent: 0,
          firstStayDate: new Date(),
        },
      ],
      stats: {
        totalBookings: 0,
        totalSpent: 0,
        totalNights: 0,
        cancellations: 0,
        noShows: 0,
        averageStayLength: 0,
      },
    });

    await guest.save();

    return ApiResponse.created(res, guest, 'Guest created successfully');
  })
);

/**
 * PUT /guests/:guestId
 * Update guest profile
 */
router.put(
  '/:guestId',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager', 'receptionist'),
  asyncHandler(async (req, res) => {
    const { guestId } = req.params;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated directly
    delete updateData.guestCode;
    delete updateData.hotelHistory;
    delete updateData.stats;
    delete updateData.hotelId;

    const guest = await Guest.findByIdAndUpdate(
      guestId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!guest) {
      throw ApiError.notFound('Guest not found');
    }

    return ApiResponse.success(res, guest, 'Guest updated successfully');
  })
);

/**
 * PUT /guests/:guestId/notes
 * Update hotel-specific notes for a guest
 */
router.put(
  '/:guestId/notes',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager', 'receptionist'),
  asyncHandler(async (req, res) => {
    const { guestId } = req.params;
    const hotelId = req.hotelId!;
    const { notes, tags } = req.body;

    const guest = await Guest.findOneAndUpdate(
      {
        _id: guestId,
        'hotelHistory.hotelId': new Types.ObjectId(hotelId),
      },
      {
        $set: {
          'hotelHistory.$.notes': notes,
          'hotelHistory.$.tags': tags,
        },
      },
      { new: true }
    );

    if (!guest) {
      throw ApiError.notFound('Guest not found');
    }

    return ApiResponse.success(res, guest, 'Guest notes updated');
  })
);

/**
 * POST /guests/:guestId/blacklist
 * Blacklist or unblacklist a guest
 */
router.post(
  '/:guestId/blacklist',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { guestId } = req.params;
    const { isBlacklisted, reason } = req.body;

    const guest = await Guest.findByIdAndUpdate(
      guestId,
      {
        $set: {
          isBlacklisted,
          blacklistReason: isBlacklisted ? reason : undefined,
        },
      },
      { new: true }
    );

    if (!guest) {
      throw ApiError.notFound('Guest not found');
    }

    return ApiResponse.success(
      res,
      guest,
      isBlacklisted ? 'Guest blacklisted' : 'Guest removed from blacklist'
    );
  })
);

export { router as guestRoutes };
