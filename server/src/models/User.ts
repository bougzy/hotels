import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * USER MODEL (Staff & Hotel Owners)
 *
 * This handles authentication and authorization for hotel staff.
 * Multi-tenant design: Users can belong to multiple hotels with different roles.
 *
 * REVENUE IMPACT:
 * - Role-based access prevents unauthorized actions (reduces fraud)
 * - Activity logging creates accountability (reduces theft)
 * - Multi-hotel support enables enterprise accounts (higher pricing tier)
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'receptionist' | 'housekeeping' | 'accountant' | 'viewer';

export interface IUserHotelAccess {
  hotelId: Types.ObjectId;
  role: UserRole;
  permissions: string[];
  isDefault: boolean;
  addedAt: Date;
  addedBy?: Types.ObjectId;
}

export interface IUser extends Document {
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
  lastLoginIp?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshTokens: Array<{
    token: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasHotelAccess(hotelId: string | Types.ObjectId): boolean;
  getHotelRole(hotelId: string | Types.ObjectId): UserRole | null;
  hasPermission(hotelId: string | Types.ObjectId, permission: string): boolean;
  fullName: string;
}

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
      select: false, // Don't include password in queries by default
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
    phone: {
      type: String,
      trim: true,
    },
    avatar: String,
    hotels: [
      {
        hotelId: {
          type: Schema.Types.ObjectId,
          ref: 'Hotel',
          required: true,
        },
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
    lastLoginIp: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshTokens: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        userAgent: String,
        ip: String,
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
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ 'hotels.hotelId': 1 });
UserSchema.index({ isActive: 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user has access to a hotel
UserSchema.methods.hasHotelAccess = function (hotelId: string | Types.ObjectId): boolean {
  return this.hotels.some(
    (h: IUserHotelAccess) => h.hotelId.toString() === hotelId.toString()
  );
};

// Get user's role for a specific hotel
UserSchema.methods.getHotelRole = function (hotelId: string | Types.ObjectId): UserRole | null {
  const access = this.hotels.find(
    (h: IUserHotelAccess) => h.hotelId.toString() === hotelId.toString()
  );
  return access ? access.role : null;
};

// Check if user has a specific permission for a hotel
UserSchema.methods.hasPermission = function (
  hotelId: string | Types.ObjectId,
  permission: string
): boolean {
  const access = this.hotels.find(
    (h: IUserHotelAccess) => h.hotelId.toString() === hotelId.toString()
  );

  if (!access) return false;

  // Owner and admin have all permissions
  if (['owner', 'admin'].includes(access.role)) return true;

  return access.permissions.includes(permission);
};

// Role-based default permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['*'], // All permissions
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

export const User = mongoose.model<IUser>('User', UserSchema);
