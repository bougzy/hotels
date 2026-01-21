import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/index.js';

/**
 * ERROR HANDLING MIDDLEWARE
 *
 * Centralized error handling for consistent API responses.
 *
 * REVENUE IMPACT:
 * - Good error messages reduce support tickets
 * - Proper logging helps debug production issues faster
 * - Consistent errors make frontend development faster
 */

interface MongooseValidationError {
  name: string;
  errors: Record<string, { message: string }>;
}

interface MongooseDuplicateKeyError {
  code: number;
  keyPattern: Record<string, number>;
  keyValue: Record<string, unknown>;
}

interface MongooseCastError {
  name: string;
  kind: string;
  path: string;
  value: unknown;
}

/**
 * Convert various error types to ApiError
 */
const normalizeError = (err: unknown): ApiError => {
  // Already an ApiError
  if (err instanceof ApiError) {
    return err;
  }

  // Mongoose Validation Error
  if ((err as MongooseValidationError).name === 'ValidationError') {
    const mongooseErr = err as MongooseValidationError;
    const messages = Object.values(mongooseErr.errors).map((e) => e.message);
    return ApiError.badRequest(messages.join(', '), 'VALIDATION_ERROR');
  }

  // Mongoose Duplicate Key Error
  if ((err as MongooseDuplicateKeyError).code === 11000) {
    const mongooseErr = err as MongooseDuplicateKeyError;
    const field = Object.keys(mongooseErr.keyPattern)[0];
    return ApiError.conflict(`${field} already exists`, 'DUPLICATE_KEY');
  }

  // Mongoose Cast Error (invalid ObjectId, etc.)
  if ((err as MongooseCastError).name === 'CastError') {
    const castErr = err as MongooseCastError;
    return ApiError.badRequest(
      `Invalid ${castErr.path}: ${castErr.value}`,
      'INVALID_ID'
    );
  }

  // Generic Error
  if (err instanceof Error) {
    return ApiError.internal(err.message);
  }

  return ApiError.internal('An unexpected error occurred');
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const apiError = normalizeError(err);

  // Log error in development
  if (config.env === 'development') {
    console.error('Error:', {
      message: apiError.message,
      code: apiError.code,
      stack: apiError.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    // In production, only log server errors
    if (apiError.statusCode >= 500) {
      console.error('Server Error:', {
        message: apiError.message,
        code: apiError.code,
        url: req.originalUrl,
        method: req.method,
        userId: req.userId,
        hotelId: req.hotelId,
      });
    }
  }

  // Send response
  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    code: apiError.code,
    ...(config.env === 'development' && { stack: apiError.stack }),
  });
};

/**
 * Async handler wrapper to catch errors
 * Eliminates try-catch in every route handler
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
