import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Application configuration
 * Centralized config makes deployment across environments seamless
 * Revenue Impact: Proper config = faster deployments = faster time to market
 */
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hhos_dev',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Security
  encryption: {
    key: process.env.ENCRYPTION_KEY || '12345678901234567890123456789012',
  },

  // Rate Limiting - prevents abuse, protects revenue
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },

  // Platform fees - THIS IS HOW WE MAKE MONEY
  platform: {
    name: process.env.PLATFORM_NAME || 'HHOS',
    feePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '2.5'),
    directBookingFeePercentage: parseFloat(process.env.DIRECT_BOOKING_FEE_PERCENTAGE || '1.5'),
  },

  // Subscription tiers - Feature gating for monetization
  subscriptionTiers: {
    starter: {
      name: 'Starter',
      maxRooms: 10,
      maxStaff: 5,
      features: ['basic_booking', 'basic_reports', 'email_support'],
      priceMonthly: 49,
      priceYearly: 470,
    },
    professional: {
      name: 'Professional',
      maxRooms: 50,
      maxStaff: 20,
      features: ['basic_booking', 'advanced_reports', 'channel_manager', 'dynamic_pricing', 'priority_support'],
      priceMonthly: 149,
      priceYearly: 1430,
    },
    enterprise: {
      name: 'Enterprise',
      maxRooms: -1, // Unlimited
      maxStaff: -1,
      features: ['all'],
      priceMonthly: 399,
      priceYearly: 3830,
    }
  }
} as const;

export type SubscriptionTier = keyof typeof config.subscriptionTiers;
