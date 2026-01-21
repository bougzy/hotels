import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler, validate, authenticate, requireHotelAccess, requireRole } from '../middleware/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Hotel, User, DEFAULT_ROLE_PERMISSIONS, UserRole } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import * as authService from '../services/auth.service.js';

/**
 * HOTEL MANAGEMENT ROUTES
 *
 * Hotel settings, staff management, and configuration.
 *
 * REVENUE IMPACT:
 * - Proper settings = correct pricing = accurate revenue
 * - Staff management = accountability = reduced leakage
 */

const router = Router();

// ==================== PUBLIC ROUTES (for booking widget) ====================

/**
 * GET /hotels/public/:slug
 * Get public hotel info by slug - for booking widget
 */
router.get(
  '/public/:slug',
  asyncHandler(async (req, res) => {
    const hotel = await Hotel.findOne({
      slug: req.params.slug,
      isActive: true,
    }).select('name slug type starRating contact branding settings.currency settings.checkInTime settings.checkOutTime amenities');

    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    return ApiResponse.success(res, hotel);
  })
);

// ==================== PROTECTED ROUTES ====================
router.use(authenticate);

/**
 * GET /hotels
 * Get all hotels user has access to
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const hotelIds = req.user!.hotels.map((h) => h.hotelId);

    const hotels = await Hotel.find({ _id: { $in: hotelIds } })
      .select('name code slug type starRating contact.address subscription stats isActive');

    return ApiResponse.success(res, hotels);
  })
);

/**
 * GET /hotels/:hotelId
 * Get single hotel details
 */
router.get(
  '/:hotelId',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const hotel = await Hotel.findById(req.hotelId);

    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    return ApiResponse.success(res, hotel);
  })
);

/**
 * PUT /hotels/:hotelId
 * Update hotel details
 */
router.put(
  '/:hotelId',
  requireHotelAccess,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    const hotel = await Hotel.findById(req.hotelId);

    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'type', 'starRating', 'contact', 'settings',
      'branding', 'amenities', 'policies', 'bankDetails'
    ];

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        (hotel as any)[field] = req.body[field];
      }
    }

    await hotel.save();

    return ApiResponse.success(res, hotel, 'Hotel updated');
  })
);

/**
 * PUT /hotels/:hotelId/settings
 * Update hotel operational settings
 */
router.put(
  '/:hotelId/settings',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  asyncHandler(async (req, res) => {
    const hotel = await Hotel.findById(req.hotelId);

    if (!hotel) {
      throw ApiError.notFound('Hotel not found');
    }

    // Merge settings
    hotel.settings = { ...hotel.settings, ...req.body };
    await hotel.save();

    return ApiResponse.success(res, hotel.settings, 'Settings updated');
  })
);

// ==================== STAFF MANAGEMENT ====================

/**
 * GET /hotels/:hotelId/staff
 * Get all staff members for hotel
 */
router.get(
  '/:hotelId/staff',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  asyncHandler(async (req, res) => {
    const staff = await User.find({
      'hotels.hotelId': req.hotelId,
      isActive: true,
    }).select('email firstName lastName phone avatar hotels');

    // Filter to only show this hotel's access info
    const formattedStaff = staff.map((user) => {
      const hotelAccess = user.hotels.find(
        (h) => h.hotelId.toString() === req.hotelId
      );
      return {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        role: hotelAccess?.role,
        permissions: hotelAccess?.permissions,
        addedAt: hotelAccess?.addedAt,
      };
    });

    return ApiResponse.success(res, formattedStaff);
  })
);

/**
 * POST /hotels/:hotelId/staff
 * Add staff member to hotel
 */
router.post(
  '/:hotelId/staff',
  requireHotelAccess,
  requireRole('owner', 'admin'),
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('firstName').trim().notEmpty().withMessage('First name required'),
    body('lastName').trim().notEmpty().withMessage('Last name required'),
    body('role')
      .isIn(['admin', 'manager', 'receptionist', 'housekeeping', 'accountant', 'viewer'])
      .withMessage('Valid role required'),
  ]),
  asyncHandler(async (req, res) => {
    const staff = await authService.addStaffToHotel(
      req.hotelId!,
      req.body,
      req.userId!
    );

    return ApiResponse.created(res, {
      _id: staff._id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: req.body.role,
    }, 'Staff member added');
  })
);

/**
 * PUT /hotels/:hotelId/staff/:staffId
 * Update staff member role/permissions
 */
router.put(
  '/:hotelId/staff/:staffId',
  requireHotelAccess,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    const staff = await User.findById(req.params.staffId);

    if (!staff) {
      throw ApiError.notFound('Staff member not found');
    }

    const hotelAccessIndex = staff.hotels.findIndex(
      (h) => h.hotelId.toString() === req.hotelId
    );

    if (hotelAccessIndex === -1) {
      throw ApiError.notFound('Staff member does not have access to this hotel');
    }

    // Prevent demoting owner
    if (staff.hotels[hotelAccessIndex].role === 'owner' && req.body.role !== 'owner') {
      throw ApiError.forbidden('Cannot change owner role');
    }

    // Update role and permissions
    if (req.body.role) {
      staff.hotels[hotelAccessIndex].role = req.body.role;
      staff.hotels[hotelAccessIndex].permissions =
        req.body.permissions || DEFAULT_ROLE_PERMISSIONS[req.body.role as UserRole] || [];
    }

    await staff.save();

    return ApiResponse.success(res, {
      _id: staff._id,
      email: staff.email,
      role: staff.hotels[hotelAccessIndex].role,
    }, 'Staff updated');
  })
);

/**
 * DELETE /hotels/:hotelId/staff/:staffId
 * Remove staff member from hotel
 */
router.delete(
  '/:hotelId/staff/:staffId',
  requireHotelAccess,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    const staff = await User.findById(req.params.staffId);

    if (!staff) {
      throw ApiError.notFound('Staff member not found');
    }

    const hotelAccess = staff.hotels.find(
      (h) => h.hotelId.toString() === req.hotelId
    );

    if (!hotelAccess) {
      throw ApiError.notFound('Staff member does not have access to this hotel');
    }

    // Prevent removing owner
    if (hotelAccess.role === 'owner') {
      throw ApiError.forbidden('Cannot remove hotel owner');
    }

    // Remove hotel access
    staff.hotels = staff.hotels.filter(
      (h) => h.hotelId.toString() !== req.hotelId
    );

    await staff.save();

    return ApiResponse.success(res, null, 'Staff member removed');
  })
);

export { router as hotelRoutes };
