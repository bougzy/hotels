import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/**
 * VALIDATION MIDDLEWARE
 *
 * Input validation is CRITICAL for security and data integrity.
 *
 * REVENUE IMPACT:
 * - Prevents garbage data in database
 * - Blocks injection attacks
 * - Ensures booking data is accurate (affects revenue calculations)
 */

/**
 * Run validation chains and handle errors
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map((err) => ({
      field: 'path' in err ? err.path : 'unknown',
      message: err.msg,
    }));

    next(
      ApiError.badRequest(
        `Validation failed: ${formattedErrors.map((e) => e.message).join(', ')}`,
        'VALIDATION_ERROR'
      )
    );
  };
};
