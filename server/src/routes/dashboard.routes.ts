import { Router } from 'express';
import { query } from 'express-validator';
import { asyncHandler, validate, authenticate, requireHotelAccess } from '../middleware/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as dashboardService from '../services/dashboard.service.js';

/**
 * DASHBOARD ROUTES
 *
 * Analytics endpoints that show hotel owners their ROI.
 * This is what makes them keep paying for the software.
 *
 * REVENUE IMPACT:
 * - Clear value demonstration = subscription retention
 * - Data-driven insights = trust = upsell readiness
 */

const router = Router();

router.use(authenticate);

/**
 * GET /dashboard/summary
 * Main dashboard data - the first thing owners see
 */
router.get(
  '/summary',
  requireHotelAccess,
  asyncHandler(async (req, res) => {
    const summary = await dashboardService.getDashboardSummary(req.hotelId!);

    return ApiResponse.success(res, summary);
  })
);

/**
 * GET /dashboard/revenue
 * Revenue breakdown report
 */
router.get(
  '/revenue',
  requireHotelAccess,
  validate([
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required'),
  ]),
  asyncHandler(async (req, res) => {
    const report = await dashboardService.getRevenueReport(
      req.hotelId!,
      new Date(req.query.startDate as string),
      new Date(req.query.endDate as string)
    );

    return ApiResponse.success(res, report);
  })
);

/**
 * GET /dashboard/occupancy
 * Occupancy trend data
 */
router.get(
  '/occupancy',
  requireHotelAccess,
  validate([
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required'),
  ]),
  asyncHandler(async (req, res) => {
    const trend = await dashboardService.getOccupancyTrend(
      req.hotelId!,
      new Date(req.query.startDate as string),
      new Date(req.query.endDate as string)
    );

    return ApiResponse.success(res, trend);
  })
);

/**
 * GET /dashboard/channels
 * Channel performance - shows value of direct bookings
 */
router.get(
  '/channels',
  requireHotelAccess,
  validate([
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required'),
  ]),
  asyncHandler(async (req, res) => {
    const performance = await dashboardService.getChannelPerformance(
      req.hotelId!,
      new Date(req.query.startDate as string),
      new Date(req.query.endDate as string)
    );

    return ApiResponse.success(res, performance);
  })
);

export { router as dashboardRoutes };
