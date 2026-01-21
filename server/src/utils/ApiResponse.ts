import { Response } from 'express';

/**
 * Standardized API Response wrapper
 *
 * WHY: Consistent API responses make frontend development faster
 * Faster development = faster feature releases = faster revenue
 */

interface ApiResponseData<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
}

export class ApiResponse {
  /**
   * Success response
   */
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200
  ): Response {
    const response: ApiResponseData<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Success response with pagination
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message = 'Success'
  ): Response {
    const response: ApiResponseData<T[]> = {
      success: true,
      message,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    return res.status(200).json(response);
  }

  /**
   * Created response (201)
   */
  static created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * No content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Error response
   */
  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: Array<{ field?: string; message: string; code?: string }>
  ): Response {
    const response: ApiResponseData<null> = {
      success: false,
      message,
      errors,
    };
    return res.status(statusCode).json(response);
  }
}
