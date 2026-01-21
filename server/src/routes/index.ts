import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { hotelRoutes } from './hotel.routes.js';
import { roomRoutes } from './room.routes.js';
import { bookingRoutes } from './booking.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { guestRoutes } from './guest.routes.js';

/**
 * API Route Registration
 *
 * All routes are prefixed with /api/v1
 * Versioning enables graceful API evolution
 */

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/hotels', hotelRoutes);
router.use('/rooms', roomRoutes);
router.use('/bookings', bookingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/guests', guestRoutes);

export { router as apiRoutes };
