import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler, validate, authenticate, requireHotelAccess, requireRole } from '../middleware/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as roomService from '../services/room.service.js';

/**
 * ROOM MANAGEMENT ROUTES
 *
 * CRUD operations for room types and individual rooms.
 * All routes require authentication and hotel access.
 *
 * REVENUE IMPACT:
 * - Proper room setup = accurate availability = more bookings
 * - Room status management = operational efficiency
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== ROOM TYPE ROUTES ====================

/**
 * POST /rooms/types
 * Create a new room type
 */
router.post(
  '/types',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  validate([
    body('name').trim().notEmpty().withMessage('Room type name required'),
    body('code')
      .trim()
      .notEmpty()
      .isLength({ max: 10 })
      .withMessage('Code required (max 10 chars)'),
    body('maxOccupancy').isInt({ min: 1, max: 20 }).withMessage('Max occupancy 1-20'),
    body('maxAdults').isInt({ min: 1 }).withMessage('Max adults required'),
    body('bedConfiguration').trim().notEmpty().withMessage('Bed configuration required'),
    body('basePrice').isFloat({ min: 0 }).withMessage('Base price required'),
  ]),
  asyncHandler(async (req, res) => {
    const roomType = await roomService.createRoomType({
      hotelId: req.hotelId!,
      ...req.body,
    });

    return ApiResponse.created(res, roomType, 'Room type created');
  })
);

/**
 * GET /rooms/types
 * Get all room types for hotel
 */
router.get(
  '/types',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const roomTypes = await roomService.getRoomTypes(req.hotelId!);

    return ApiResponse.success(res, roomTypes);
  })
);

/**
 * GET /rooms/types/:roomTypeId
 * Get single room type
 */
router.get(
  '/types/:roomTypeId',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const roomType = await roomService.getRoomType(req.hotelId!, req.params.roomTypeId);

    return ApiResponse.success(res, roomType);
  })
);

/**
 * PUT /rooms/types/:roomTypeId
 * Update room type
 */
router.put(
  '/types/:roomTypeId',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  asyncHandler(async (req, res) => {
    const roomType = await roomService.updateRoomType(
      req.hotelId!,
      req.params.roomTypeId,
      req.body
    );

    return ApiResponse.success(res, roomType, 'Room type updated');
  })
);

/**
 * DELETE /rooms/types/:roomTypeId
 * Delete (deactivate) room type
 */
router.delete(
  '/types/:roomTypeId',
  requireHotelAccess,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    await roomService.deleteRoomType(req.hotelId!, req.params.roomTypeId);

    return ApiResponse.success(res, null, 'Room type deleted');
  })
);

// ==================== ROOM ROUTES ====================

/**
 * POST /rooms
 * Create a new room
 */
router.post(
  '/',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  validate([
    body('roomTypeId').isMongoId().withMessage('Valid room type ID required'),
    body('roomNumber').trim().notEmpty().withMessage('Room number required'),
    body('floor').isInt().withMessage('Floor number required'),
  ]),
  asyncHandler(async (req, res) => {
    const room = await roomService.createRoom({
      hotelId: req.hotelId!,
      ...req.body,
    });

    return ApiResponse.created(res, room, 'Room created');
  })
);

/**
 * POST /rooms/bulk
 * Create multiple rooms at once
 */
router.post(
  '/bulk',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  validate([
    body('roomTypeId').isMongoId().withMessage('Valid room type ID required'),
    body('rooms').isArray({ min: 1 }).withMessage('At least one room required'),
    body('rooms.*.roomNumber').trim().notEmpty().withMessage('Room number required'),
    body('rooms.*.floor').isInt().withMessage('Floor number required'),
  ]),
  asyncHandler(async (req, res) => {
    const rooms = await roomService.createRoomsBulk(
      req.hotelId!,
      req.body.roomTypeId,
      req.body.rooms
    );

    return ApiResponse.created(res, rooms, `${rooms.length} rooms created`);
  })
);

/**
 * GET /rooms
 * Get all rooms for hotel
 */
router.get(
  '/',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const filters = {
      roomTypeId: req.query.roomTypeId as string | undefined,
      floor: req.query.floor ? parseInt(req.query.floor as string) : undefined,
      status: req.query.status as any,
    };

    const rooms = await roomService.getRooms(req.hotelId!, filters);

    return ApiResponse.success(res, rooms);
  })
);

/**
 * GET /rooms/summary
 * Get room status summary for dashboard
 */
router.get(
  '/summary',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const summary = await roomService.getRoomStatusSummary(req.hotelId!);

    return ApiResponse.success(res, summary);
  })
);

/**
 * GET /rooms/:roomId
 * Get single room
 */
router.get(
  '/:roomId',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const room = await roomService.getRoom(req.hotelId!, req.params.roomId);

    return ApiResponse.success(res, room);
  })
);

/**
 * PUT /rooms/:roomId
 * Update room
 */
router.put(
  '/:roomId',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager'),
  asyncHandler(async (req, res) => {
    const room = await roomService.updateRoom(req.hotelId!, req.params.roomId, req.body);

    return ApiResponse.success(res, room, 'Room updated');
  })
);

/**
 * PATCH /rooms/:roomId/status
 * Update room status (quick action)
 */
router.patch(
  '/:roomId/status',
  requireHotelAccess,
  requireRole('owner', 'admin', 'manager', 'receptionist', 'housekeeping'),
  validate([
    body('status')
      .isIn(['available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked'])
      .withMessage('Valid status required'),
  ]),
  asyncHandler(async (req, res) => {
    const room = await roomService.updateRoomStatus(
      req.hotelId!,
      req.params.roomId,
      req.body.status,
      req.body.housekeepingStatus
    );

    return ApiResponse.success(res, room, 'Room status updated');
  })
);

/**
 * DELETE /rooms/:roomId
 * Delete (deactivate) room
 */
router.delete(
  '/:roomId',
  requireHotelAccess,
  requireRole('owner', 'admin'),
  asyncHandler(async (req, res) => {
    await roomService.deleteRoom(req.hotelId!, req.params.roomId);

    return ApiResponse.success(res, null, 'Room deleted');
  })
);

export { router as roomRoutes };
