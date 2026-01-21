import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult, ValidationChain } from 'express-validator';
import { nanoid } from 'nanoid';

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  },
};

// =============================================================================
// API ERROR CLASS
// =============================================================================

class ApiError extends Error {
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

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR', false);
  }
}

// =============================================================================
// API RESPONSE CLASS
// =============================================================================

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
}

class ApiResponse {
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

  static created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return ApiResponse.success(res, data, message, 201);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const generateId = {
  hotelCode: () => nanoid(6).toUpperCase(),
  shortCode: () => nanoid(6),
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type UserRole = 'owner' | 'admin' | 'manager' | 'receptionist' | 'housekeeping' | 'accountant' | 'viewer';

interface IUserHotelAccess {
  hotelId: Types.ObjectId;
  role: UserRole;
  permissions: string[];
  isDefault: boolean;
  addedAt: Date;
  addedBy?: Types.ObjectId;
}

interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  hotels: IUserHotelAccess[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  refreshTokens: Array<{
    token: string;
    expiresAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasHotelAccess(hotelId: string | Types.ObjectId): boolean;
  getHotelRole(hotelId: string | Types.ObjectId): UserRole | null;
  fullName: string;
}

interface IHotel extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  code: string;
  type: string;
  contact: {
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
    };
  };
  settings: {
    timezone: string;
    currency: string;
    checkInTime: string;
    checkOutTime: string;
    cancellationPolicy: string;
    cancellationHours: number;
    allowInstantBooking: boolean;
    requireIdVerification: boolean;
    allowPartialPayment: boolean;
    partialPaymentPercentage: number;
    autoConfirmBookings: boolean;
    sendConfirmationEmail: boolean;
    sendConfirmationSms: boolean;
    taxRate: number;
    taxName: string;
    serviceChargeRate: number;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    gallery: string[];
  };
  subscription: {
    tier: string;
    status: string;
    trialEndsAt?: Date;
    cancelAtPeriodEnd: boolean;
  };
  stats: {
    totalRooms: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  };
  isActive: boolean;
  isVerified: boolean;
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['*'],
  admin: ['*'],
  manager: [
    'bookings:read', 'bookings:write',
    'rooms:read', 'rooms:write',
    'guests:read', 'guests:write',
    'reports:read',
    'staff:read',
    'settings:read',
  ],
  receptionist: [
    'bookings:read', 'bookings:write',
    'rooms:read',
    'guests:read', 'guests:write',
    'checkin:write',
  ],
  housekeeping: [
    'rooms:read',
    'rooms:status',
    'tasks:read', 'tasks:write',
  ],
  accountant: [
    'bookings:read',
    'payments:read', 'payments:write',
    'reports:read',
    'expenses:read', 'expenses:write',
  ],
  viewer: [
    'bookings:read',
    'rooms:read',
    'reports:read',
  ],
};

// =============================================================================
// MONGOOSE MODELS (INLINE)
// =============================================================================

// User Schema
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    phone: { type: String, trim: true },
    avatar: String,
    hotels: [
      {
        hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
        role: {
          type: String,
          enum: ['owner', 'admin', 'manager', 'receptionist', 'housekeeping', 'accountant', 'viewer'],
          required: true,
        },
        permissions: [String],
        isDefault: { type: Boolean, default: false },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    refreshTokens: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.refreshTokens;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

UserSchema.index({ 'hotels.hotelId': 1 });
UserSchema.index({ isActive: 1 });

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.hasHotelAccess = function (hotelId: string | Types.ObjectId): boolean {
  return this.hotels.some(
    (h: IUserHotelAccess) => h.hotelId.toString() === hotelId.toString()
  );
};

UserSchema.methods.getHotelRole = function (hotelId: string | Types.ObjectId): UserRole | null {
  const access = this.hotels.find(
    (h: IUserHotelAccess) => h.hotelId.toString() === hotelId.toString()
  );
  return access ? access.role : null;
};

// Hotel Schema
const HotelSchema = new Schema<IHotel>(
  {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      maxlength: [100, 'Hotel name cannot exceed 100 characters'],
    },
    slug: { type: String, unique: true, lowercase: true },
    code: { type: String, unique: true, uppercase: true },
    type: {
      type: String,
      enum: ['hotel', 'motel', 'resort', 'guesthouse', 'boutique', 'apartment', 'hostel'],
      default: 'hotel',
    },
    contact: {
      email: { type: String, required: [true, 'Hotel email is required'], lowercase: true, trim: true },
      phone: { type: String, required: [true, 'Hotel phone is required'] },
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true, default: 'Nigeria' },
      },
    },
    settings: {
      timezone: { type: String, default: 'Africa/Lagos' },
      currency: { type: String, default: 'NGN' },
      checkInTime: { type: String, default: '14:00' },
      checkOutTime: { type: String, default: '11:00' },
      cancellationPolicy: {
        type: String,
        enum: ['flexible', 'moderate', 'strict', 'non_refundable'],
        default: 'moderate',
      },
      cancellationHours: { type: Number, default: 24 },
      allowInstantBooking: { type: Boolean, default: true },
      requireIdVerification: { type: Boolean, default: false },
      allowPartialPayment: { type: Boolean, default: true },
      partialPaymentPercentage: { type: Number, default: 50 },
      autoConfirmBookings: { type: Boolean, default: true },
      sendConfirmationEmail: { type: Boolean, default: true },
      sendConfirmationSms: { type: Boolean, default: true },
      taxRate: { type: Number, default: 7.5 },
      taxName: { type: String, default: 'VAT' },
      serviceChargeRate: { type: Number, default: 0 },
    },
    branding: {
      primaryColor: { type: String, default: '#1e40af' },
      secondaryColor: { type: String, default: '#3b82f6' },
      gallery: [String],
    },
    subscription: {
      tier: {
        type: String,
        enum: ['starter', 'professional', 'enterprise'],
        default: 'starter',
      },
      status: {
        type: String,
        enum: ['active', 'trial', 'past_due', 'cancelled', 'suspended'],
        default: 'trial',
      },
      trialEndsAt: Date,
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
    stats: {
      totalRooms: { type: Number, default: 0 },
      totalBookings: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

HotelSchema.index({ ownerId: 1 });
HotelSchema.index({ isActive: 1, 'subscription.status': 1 });

HotelSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('name')) {
    this.slug = generateSlug(this.name) + '-' + generateId.shortCode();
  }
  if (this.isNew && !this.code) {
    this.code = generateId.hotelCode();
  }
  next();
});

// Get or create models (handle hot reload in dev)
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
const Hotel = mongoose.models.Hotel || mongoose.model<IHotel>('Hotel', HotelSchema);

// =============================================================================
// MIDDLEWARE
// =============================================================================

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

// Async handler wrapper
const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation middleware
const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

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

// Authentication middleware
interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated');
    }

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

// Error handler middleware
interface MongooseValidationError {
  name: string;
  errors: Record<string, { message: string }>;
}

interface MongooseDuplicateKeyError {
  code: number;
  keyPattern: Record<string, number>;
}

interface MongooseCastError {
  name: string;
  kind: string;
  path: string;
  value: unknown;
}

const normalizeError = (err: unknown): ApiError => {
  if (err instanceof ApiError) {
    return err;
  }

  if ((err as MongooseValidationError).name === 'ValidationError') {
    const mongooseErr = err as MongooseValidationError;
    const messages = Object.values(mongooseErr.errors).map((e) => e.message);
    return ApiError.badRequest(messages.join(', '), 'VALIDATION_ERROR');
  }

  if ((err as MongooseDuplicateKeyError).code === 11000) {
    const mongooseErr = err as MongooseDuplicateKeyError;
    const field = Object.keys(mongooseErr.keyPattern)[0];
    return ApiError.conflict(`${field} already exists`, 'DUPLICATE_KEY');
  }

  if ((err as MongooseCastError).name === 'CastError') {
    const castErr = err as MongooseCastError;
    return ApiError.badRequest(`Invalid ${castErr.path}: ${castErr.value}`, 'INVALID_ID');
  }

  if (err instanceof Error) {
    return ApiError.internal(err.message);
  }

  return ApiError.internal('An unexpected error occurred');
};

const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const apiError = normalizeError(err);

  if (config.env === 'development') {
    console.error('Error:', {
      message: apiError.message,
      code: apiError.code,
      stack: apiError.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else if (apiError.statusCode >= 500) {
    console.error('Server Error:', {
      message: apiError.message,
      code: apiError.code,
      url: req.originalUrl,
      method: req.method,
    });
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    code: apiError.code,
    ...(config.env === 'development' && { stack: apiError.stack }),
  });
};

// =============================================================================
// AUTH SERVICE FUNCTIONS
// =============================================================================

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const generateTokens = (userId: string, email: string): TokenPair => {
  const accessToken = jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: '30d' }
  );

  const decoded = jwt.decode(accessToken) as { exp: number };
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

  return { accessToken, refreshToken, expiresIn };
};

// =============================================================================
// AUTH ROUTES
// =============================================================================

const authRouter = Router();

// POST /auth/register
authRouter.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
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
    const { email, password, firstName, lastName, phone, hotelName, hotelPhone, hotelEmail, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
    }

    // Create the hotel first
    const hotel = await Hotel.create({
      name: hotelName,
      contact: {
        email: hotelEmail || email,
        phone: hotelPhone,
        address: address,
      },
      subscription: {
        tier: 'starter',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      ownerId: new Types.ObjectId(),
    });

    // Create the user (owner)
    const user = await User.create({
      email: email.toLowerCase(),
      password: password,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      hotels: [
        {
          hotelId: hotel._id,
          role: 'owner' as UserRole,
          permissions: DEFAULT_ROLE_PERMISSIONS.owner,
          isDefault: true,
          addedAt: new Date(),
        },
      ],
    });

    // Update hotel with actual owner ID
    hotel.ownerId = user._id;
    await hotel.save();

    // Generate tokens
    const tokens = generateTokens(user._id.toString(), user.email);

    // Store refresh token
    user.refreshTokens.push({
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    return ApiResponse.created(res, {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        hotels: user.hotels,
      },
      hotel: {
        _id: hotel._id,
        name: hotel.name,
        code: hotel.code,
        slug: hotel.slug,
        subscription: hotel.subscription,
      },
      tokens,
    }, 'Registration successful. Welcome to HHOS!');
  })
);

// POST /auth/login
authRouter.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ]),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Get default hotel
    const defaultHotelAccess = user.hotels.find((h) => h.isDefault) || user.hotels[0];
    let hotel: IHotel | null = null;

    if (defaultHotelAccess) {
      hotel = await Hotel.findById(defaultHotelAccess.hotelId);
    }

    // Generate tokens
    const tokens = generateTokens(user._id.toString(), user.email);

    // Update login info and store refresh token
    user.lastLoginAt = new Date();
    user.refreshTokens.push({
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Clean up expired tokens
    user.refreshTokens = user.refreshTokens.filter((t) => t.expiresAt > new Date());
    await user.save();

    return ApiResponse.success(res, {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        hotels: user.hotels,
      },
      hotel: hotel
        ? {
            _id: hotel._id,
            name: hotel.name,
            code: hotel.code,
            slug: hotel.slug,
            subscription: hotel.subscription,
          }
        : undefined,
      tokens,
    }, 'Login successful');
  })
);

// POST /auth/refresh
authRouter.post(
  '/refresh',
  validate([
    body('refreshToken').notEmpty().withMessage('Refresh token required'),
  ]),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
        userId: string;
        email: string;
        type: string;
      };

      if (decoded.type !== 'refresh') {
        throw ApiError.unauthorized('Invalid token type');
      }

      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw ApiError.unauthorized('User not found or inactive');
      }

      const storedToken = user.refreshTokens.find((t) => t.token === refreshToken);

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw ApiError.unauthorized('Invalid or expired refresh token');
      }

      // Generate new tokens
      const tokens = generateTokens(user._id.toString(), user.email);

      // Replace old refresh token with new one
      user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
      user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await user.save();

      return ApiResponse.success(res, tokens, 'Tokens refreshed');
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid refresh token');
      }
      throw error;
    }
  })
);

// POST /auth/logout
authRouter.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);

    if (user) {
      const { refreshToken } = req.body;
      if (refreshToken) {
        user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
      } else {
        user.refreshTokens = [];
      }
      await user.save();
    }

    return ApiResponse.success(res, null, 'Logged out successfully');
  })
);

// GET /auth/me
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).populate('hotels.hotelId', 'name code slug');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return ApiResponse.success(res, user, 'Profile retrieved');
  })
);

// =============================================================================
// STUB ROUTES FOR OTHER ENDPOINTS
// =============================================================================

const stubRouter = Router();

const notImplemented = (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Not implemented yet - this endpoint is coming soon',
    code: 'NOT_IMPLEMENTED',
  });
};

stubRouter.all('*', notImplemented);

// =============================================================================
// MAIN API ROUTER
// =============================================================================

const apiRoutes = Router();

// Health check
apiRoutes.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount routes
apiRoutes.use('/auth', authRouter);
apiRoutes.use('/hotels', stubRouter);
apiRoutes.use('/rooms', stubRouter);
apiRoutes.use('/bookings', stubRouter);
apiRoutes.use('/dashboard', stubRouter);
apiRoutes.use('/guests', stubRouter);

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

const app = express();

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Hotel-Id'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.set('trust proxy', 1);

// Mount API routes
app.use('/api/v1', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not set');
  }

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  isConnected = true;
}

// =============================================================================
// VERCEL SERVERLESS HANDLER
// =============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDB();

    return new Promise<void>((resolve) => {
      app(req as unknown as Request, res as unknown as Response, () => {
        resolve();
      });
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
