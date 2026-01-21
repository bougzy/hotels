import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { User, IUser, Hotel, IHotel, DEFAULT_ROLE_PERMISSIONS, UserRole } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/index.js';
import { generateId } from '../utils/helpers.js';

/**
 * AUTHENTICATION SERVICE
 *
 * Handles user registration, login, and token management.
 *
 * REVENUE IMPACT:
 * - Smooth onboarding = faster time to first booking
 * - Secure auth = protected hotel data
 * - Token refresh = uninterrupted user sessions = better UX
 */

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface RegisterHotelInput extends RegisterInput {
  hotelName: string;
  hotelPhone: string;
  hotelEmail?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
}

interface LoginInput {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResponse {
  user: Partial<IUser>;
  hotel?: Partial<IHotel>;
  tokens: TokenPair;
}

/**
 * Generate JWT tokens
 */
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

  // Calculate expiry in seconds for frontend
  const decoded = jwt.decode(accessToken) as { exp: number };
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

  return { accessToken, refreshToken, expiresIn };
};

/**
 * Register a new user with a new hotel
 * This is the PRIMARY onboarding flow
 */
export const registerWithHotel = async (input: RegisterHotelInput): Promise<AuthResponse> => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: input.email.toLowerCase() });
  if (existingUser) {
    throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
  }

  // Create the hotel first
  const hotel = await Hotel.create({
    name: input.hotelName,
    contact: {
      email: input.hotelEmail || input.email,
      phone: input.hotelPhone,
      address: input.address,
    },
    subscription: {
      tier: 'starter',
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
    },
    // Temporarily set ownerId, will update after user creation
    ownerId: new Types.ObjectId(),
  });

  // Create the user (owner)
  const user = await User.create({
    email: input.email.toLowerCase(),
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
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
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
  await user.save();

  return {
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
  };
};

/**
 * Login existing user
 */
export const login = async (input: LoginInput): Promise<AuthResponse> => {
  // Find user with password
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.unauthorized('Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(input.password);
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
  user.refreshTokens = user.refreshTokens.filter(
    (t) => t.expiresAt > new Date()
  );

  await user.save();

  return {
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
  };
};

/**
 * Refresh access token
 */
export const refreshTokens = async (refreshToken: string): Promise<TokenPair> => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
      userId: string;
      email: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      throw ApiError.unauthorized('Invalid token type');
    }

    // Find user and verify refresh token exists
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

    return tokens;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Logout - invalidate refresh token
 */
export const logout = async (userId: string, refreshToken?: string): Promise<void> => {
  const user = await User.findById(userId);

  if (!user) {
    return;
  }

  if (refreshToken) {
    // Remove specific token
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
  } else {
    // Remove all tokens (logout from all devices)
    user.refreshTokens = [];
  }

  await user.save();
};

/**
 * Get current user profile
 */
export const getProfile = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId).populate('hotels.hotelId', 'name code slug');

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
};

/**
 * Add staff member to hotel
 */
export const addStaffToHotel = async (
  hotelId: string,
  staffData: RegisterInput & { role: UserRole },
  addedBy: string
): Promise<IUser> => {
  // Check if hotel exists
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) {
    throw ApiError.notFound('Hotel not found');
  }

  // Check if user already exists
  let user = await User.findOne({ email: staffData.email.toLowerCase() });

  if (user) {
    // Check if already has access to this hotel
    if (user.hasHotelAccess(hotelId)) {
      throw ApiError.conflict('User already has access to this hotel');
    }

    // Add hotel access to existing user
    user.hotels.push({
      hotelId: new Types.ObjectId(hotelId),
      role: staffData.role,
      permissions: DEFAULT_ROLE_PERMISSIONS[staffData.role] || [],
      isDefault: user.hotels.length === 0,
      addedAt: new Date(),
      addedBy: new Types.ObjectId(addedBy),
    });

    await user.save();
  } else {
    // Create new user with hotel access
    const tempPassword = generateId.shortCode(); // Temporary password

    user = await User.create({
      email: staffData.email.toLowerCase(),
      password: tempPassword, // They'll need to reset
      firstName: staffData.firstName,
      lastName: staffData.lastName,
      phone: staffData.phone,
      hotels: [
        {
          hotelId: new Types.ObjectId(hotelId),
          role: staffData.role,
          permissions: DEFAULT_ROLE_PERMISSIONS[staffData.role] || [],
          isDefault: true,
          addedAt: new Date(),
          addedBy: new Types.ObjectId(addedBy),
        },
      ],
    });

    // TODO: Send welcome email with temporary password
  }

  return user;
};
