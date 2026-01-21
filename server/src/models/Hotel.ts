import mongoose, { Document, Schema, Types } from 'mongoose';
import { generateId, generateSlug } from '../utils/helpers.js';

/**
 * HOTEL MODEL
 *
 * This is the ROOT entity of our multi-tenant system.
 * Every other entity (rooms, bookings, staff) belongs to a Hotel.
 *
 * REVENUE IMPACT:
 * - Subscription tier determines features & billing
 * - Hotel settings affect booking flow and conversion
 * - Contact info enables guest communication (reduces no-shows)
 */

export interface IHotelSettings {
  timezone: string;
  currency: string;
  checkInTime: string;  // e.g., "14:00"
  checkOutTime: string; // e.g., "11:00"
  cancellationPolicy: 'flexible' | 'moderate' | 'strict' | 'non_refundable';
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
}

export interface IHotelContact {
  email: string;
  phone: string;
  alternatePhone?: string;
  whatsapp?: string;
  website?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export interface IHotelBranding {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  coverImage?: string;
  gallery: string[];
  description?: string;
  tagline?: string;
}

export interface IHotelSubscription {
  tier: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'suspended';
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

export interface IHotel extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  code: string; // Short unique code for the hotel
  type: 'hotel' | 'motel' | 'resort' | 'guesthouse' | 'boutique' | 'apartment' | 'hostel';
  starRating?: number;
  contact: IHotelContact;
  settings: IHotelSettings;
  branding: IHotelBranding;
  subscription: IHotelSubscription;
  amenities: string[];
  policies: {
    houseRules: string[];
    petPolicy?: string;
    smokingPolicy?: string;
    childPolicy?: string;
  };
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    bankCode?: string;
  };
  integrations: {
    paystack?: { publicKey: string; secretKey: string };
    flutterwave?: { publicKey: string; secretKey: string };
    stripe?: { publicKey: string; secretKey: string };
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

const HotelSchema = new Schema<IHotel>(
  {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      maxlength: [100, 'Hotel name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    code: {
      type: String,
      unique: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['hotel', 'motel', 'resort', 'guesthouse', 'boutique', 'apartment', 'hostel'],
      default: 'hotel',
    },
    starRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    contact: {
      email: {
        type: String,
        required: [true, 'Hotel email is required'],
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        required: [true, 'Hotel phone is required'],
      },
      alternatePhone: String,
      whatsapp: String,
      website: String,
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true, default: 'Nigeria' },
        postalCode: String,
        coordinates: {
          lat: Number,
          lng: Number,
        },
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
      partialPaymentPercentage: { type: Number, default: 50, min: 10, max: 100 },
      autoConfirmBookings: { type: Boolean, default: true },
      sendConfirmationEmail: { type: Boolean, default: true },
      sendConfirmationSms: { type: Boolean, default: true },
      taxRate: { type: Number, default: 7.5 }, // Nigeria VAT
      taxName: { type: String, default: 'VAT' },
      serviceChargeRate: { type: Number, default: 0 },
    },
    branding: {
      logo: String,
      primaryColor: { type: String, default: '#1e40af' },
      secondaryColor: { type: String, default: '#3b82f6' },
      coverImage: String,
      gallery: [String],
      description: String,
      tagline: String,
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
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
    amenities: [String],
    policies: {
      houseRules: [String],
      petPolicy: String,
      smokingPolicy: String,
      childPolicy: String,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      accountName: String,
      bankCode: String,
    },
    integrations: {
      paystack: {
        publicKey: String,
        secretKey: String,
      },
      flutterwave: {
        publicKey: String,
        secretKey: String,
      },
      stripe: {
        publicKey: String,
        secretKey: String,
      },
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
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
// Note: slug and code already have unique: true which creates indexes
HotelSchema.index({ ownerId: 1 });
HotelSchema.index({ 'contact.address.city': 1, 'contact.address.country': 1 });
HotelSchema.index({ isActive: 1, 'subscription.status': 1 });

// Pre-save hook to generate slug and code
HotelSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('name')) {
    this.slug = generateSlug(this.name) + '-' + generateId.shortCode();
  }
  if (this.isNew && !this.code) {
    this.code = generateId.hotelCode();
  }
  next();
});

// Virtual for booking URL
HotelSchema.virtual('bookingUrl').get(function () {
  return `/book/${this.slug}`;
});

export const Hotel = mongoose.model<IHotel>('Hotel', HotelSchema);
