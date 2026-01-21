import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User, IUser, UserRole } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/index.js';

/**
 * AUTHENTICATION MIDDLEWARE
 *
 * Handles JWT verification and multi-tenant authorization.
 *
 * REVENUE IMPACT:
 * - Secure auth prevents unauthorized access (protects hotel data)
 * - Role-based access prevents staff fraud
 * - Multi-hotel support enables enterprise accounts (higher revenue)
 */

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      hotelId?: string;
      userRole?: UserRole;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated');
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(ApiError.unauthorized('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Require specific hotel access
 * Use after authenticate middleware
 * Hotel ID comes from route params or body
 */
export const requireHotelAccess = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const hotelId = req.params.hotelId || req.body.hotelId || req.query.hotelId;

    if (!hotelId) {
      throw ApiError.badRequest('Hotel ID is required');
    }

    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Check if user has access to this hotel
    if (!req.user.hasHotelAccess(hotelId)) {
      throw ApiError.forbidden('You do not have access to this hotel');
    }

    // Attach hotel context to request
    req.hotelId = hotelId;
    req.userRole = req.user.getHotelRole(hotelId) || undefined;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific roles for an action
 * Use after authenticate and requireHotelAccess
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.userRole) {
        throw ApiError.forbidden('Role not determined');
      }

      // Owner and admin always have access
      if (['owner', 'admin'].includes(req.userRole)) {
        return next();
      }

      if (!allowedRoles.includes(req.userRole)) {
        throw ApiError.forbidden(
          `This action requires one of these roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require specific permission for an action
 * More granular than roles
 */
export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.hotelId) {
        throw ApiError.unauthorized('Authentication required');
      }

      if (!req.user.hasPermission(req.hotelId, permission)) {
        throw ApiError.forbidden(`Permission denied: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for public endpoints that can be enhanced with user context
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id.toString();
    }

    next();
  } catch {
    // Silently continue without auth
    next();
  }
};
