import mongoose, { Document, Schema, Types } from 'mongoose';
import { generateId } from '../utils/helpers.js';

/**
 * GUEST MODEL
 *
 * Guest profiles enable personalization, loyalty, and targeted marketing.
 * Guests can exist across multiple hotels (platform-wide profile).
 *
 * REVENUE IMPACT:
 * - Guest history enables personalized upsells (higher conversion)
 * - Contact info enables direct marketing (reduces OTA dependency)
 * - Preferences reduce complaints (better reviews = more bookings)
 * - Lifetime value tracking identifies VIP guests
 */

export interface IGuestPreferences {
  roomPreferences?: {
    floorPreference?: 'high' | 'low' | 'none';
    bedType?: string;
    smokingRoom?: boolean;
    quietRoom?: boolean;
    view?: string;
  };
  dietaryRestrictions?: string[];
  specialRequests?: string[];
  communicationPreference: 'email' | 'sms' | 'whatsapp' | 'phone';
  language: string;
}

export interface IGuestDocument {
  type: 'passport' | 'national_id' | 'drivers_license' | 'other';
  number: string;
  issuingCountry?: string;
  expiryDate?: Date;
  verified: boolean;
  verifiedAt?: Date;
}

export interface IGuest extends Document {
  _id: Types.ObjectId;
  guestCode: string;
  email?: string;
  phone: string; // Primary contact - required for African market
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  document?: IGuestDocument;
  preferences: IGuestPreferences;
  // Hotel-specific data
  hotelHistory: Array<{
    hotelId: Types.ObjectId;
    totalStays: number;
    totalSpent: number;
    lastStayDate?: Date;
    firstStayDate: Date;
    averageRating?: number;
    notes?: string;
    tags?: string[];
    loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
    loyaltyPoints?: number;
  }>;
  // Platform-wide stats
  stats: {
    totalBookings: number;
    totalSpent: number;
    totalNights: number;
    cancellations: number;
    noShows: number;
    averageStayLength: number;
  };
  // Marketing consent
  marketingConsent: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    consentDate?: Date;
  };
  source: 'direct' | 'ota' | 'walk_in' | 'referral' | 'corporate' | 'website' | 'whatsapp';
  sourceDetails?: string; // e.g., "Booking.com", "Referral from John Doe"
  isBlacklisted: boolean;
  blacklistReason?: string;
  createdAt: Date;
  updatedAt: Date;
  // Methods
  getHotelStats(hotelId: Types.ObjectId): IGuest['hotelHistory'][0] | undefined;
  fullName: string;
}

const GuestSchema = new Schema<IGuest>(
  {
    guestCode: {
      type: String,
      unique: true,
      default: () => generateId.guest(),
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // Allows multiple nulls while being unique when present
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
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
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    nationality: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    document: {
      type: {
        type: String,
        enum: ['passport', 'national_id', 'drivers_license', 'other'],
      },
      number: String,
      issuingCountry: String,
      expiryDate: Date,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
    },
    preferences: {
      roomPreferences: {
        floorPreference: {
          type: String,
          enum: ['high', 'low', 'none'],
        },
        bedType: String,
        smokingRoom: Boolean,
        quietRoom: Boolean,
        view: String,
      },
      dietaryRestrictions: [String],
      specialRequests: [String],
      communicationPreference: {
        type: String,
        enum: ['email', 'sms', 'whatsapp', 'phone'],
        default: 'whatsapp', // Most common in Africa
      },
      language: {
        type: String,
        default: 'en',
      },
    },
    hotelHistory: [
      {
        hotelId: {
          type: Schema.Types.ObjectId,
          ref: 'Hotel',
          required: true,
        },
        totalStays: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        lastStayDate: Date,
        firstStayDate: { type: Date, default: Date.now },
        averageRating: Number,
        notes: String,
        tags: [String],
        loyaltyTier: {
          type: String,
          enum: ['bronze', 'silver', 'gold', 'platinum'],
          default: 'bronze',
        },
        loyaltyPoints: { type: Number, default: 0 },
      },
    ],
    stats: {
      totalBookings: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      totalNights: { type: Number, default: 0 },
      cancellations: { type: Number, default: 0 },
      noShows: { type: Number, default: 0 },
      averageStayLength: { type: Number, default: 0 },
    },
    marketingConsent: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: true }, // Default true for Africa
      consentDate: Date,
    },
    source: {
      type: String,
      enum: ['direct', 'ota', 'walk_in', 'referral', 'corporate', 'website', 'whatsapp'],
      default: 'direct',
    },
    sourceDetails: String,
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for searching guests
GuestSchema.index({ phone: 1 });
GuestSchema.index({ email: 1 }, { sparse: true });
GuestSchema.index({ guestCode: 1 });
GuestSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
GuestSchema.index({ 'hotelHistory.hotelId': 1 });
GuestSchema.index({ isBlacklisted: 1 });

// Virtual for full name
GuestSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Method to get hotel-specific stats
GuestSchema.methods.getHotelStats = function (this: IGuest, hotelId: Types.ObjectId) {
  return this.hotelHistory.find(
    (h) => h.hotelId.toString() === hotelId.toString()
  );
};

export const Guest = mongoose.model<IGuest>('Guest', GuestSchema);
