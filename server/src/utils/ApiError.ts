/**
 * Custom API Error class for consistent error handling
 *
 * WHY: Consistent error responses build trust with hotel staff
 * Clear error messages = less support tickets = lower operational costs
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    isOperational = true,
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Factory methods for common errors
  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'Unauthorized access'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Access forbidden'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string, code?: string): ApiError {
    return new ApiError(409, message, code);
  }

  static tooManyRequests(message = 'Too many requests'): ApiError {
    return new ApiError(429, message, 'RATE_LIMITED');
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR', false);
  }

  // Business-specific errors
  static roomNotAvailable(roomId: string, dates: string): ApiError {
    return new ApiError(
      409,
      `Room ${roomId} is not available for ${dates}`,
      'ROOM_NOT_AVAILABLE'
    );
  }

  static bookingConflict(message: string): ApiError {
    return new ApiError(409, message, 'BOOKING_CONFLICT');
  }

  static paymentFailed(message: string): ApiError {
    return new ApiError(402, message, 'PAYMENT_FAILED');
  }

  static subscriptionRequired(feature: string): ApiError {
    return new ApiError(
      403,
      `Your subscription does not include ${feature}. Please upgrade.`,
      'SUBSCRIPTION_REQUIRED'
    );
  }

  static hotelLimitReached(limit: string): ApiError {
    return new ApiError(
      403,
      `You have reached your ${limit} limit. Please upgrade your subscription.`,
      'LIMIT_REACHED'
    );
  }
}
