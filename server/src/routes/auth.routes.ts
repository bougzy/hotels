import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler, validate, authenticate } from '../middleware/index.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as authService from '../services/auth.service.js';

/**
 * AUTHENTICATION ROUTES
 *
 * Public routes for registration and login.
 * Protected routes for profile and token refresh.
 *
 * REVENUE IMPACT:
 * - Fast onboarding = faster first booking
 * - Secure auth protects hotel revenue data
 */

const router = Router();

/**
 * POST /auth/register
 * Register new user with new hotel (primary onboarding)
 */
router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name required'),
    body('lastName').trim().notEmpty().withMessage('Last name required'),
    body('hotelName').trim().notEmpty().withMessage('Hotel name required'),
    body('hotelPhone').trim().notEmpty().withMessage('Hotel phone required'),
    body('address.street').trim().notEmpty().withMessage('Street address required'),
    body('address.city').trim().notEmpty().withMessage('City required'),
    body('address.state').trim().notEmpty().withMessage('State required'),
    body('address.country').trim().notEmpty().withMessage('Country required'),
  ]),
  asyncHandler(async (req, res) => {
    const result = await authService.registerWithHotel(req.body);

    return ApiResponse.created(res, result, 'Registration successful. Welcome to HHOS!');
  })
);

/**
 * POST /auth/login
 * Login existing user
 */
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ]),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    return ApiResponse.success(res, result, 'Login successful');
  })
);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  validate([
    body('refreshToken').notEmpty().withMessage('Refresh token required'),
  ]),
  asyncHandler(async (req, res) => {
    const tokens = await authService.refreshTokens(req.body.refreshToken);

    return ApiResponse.success(res, tokens, 'Tokens refreshed');
  })
);

/**
 * POST /auth/logout
 * Logout user (invalidate refresh token)
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await authService.logout(req.userId!, req.body.refreshToken);

    return ApiResponse.success(res, null, 'Logged out successfully');
  })
);

/**
 * GET /auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.userId!);

    return ApiResponse.success(res, user, 'Profile retrieved');
  })
);

export { router as authRoutes };
