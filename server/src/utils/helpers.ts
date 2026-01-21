import { nanoid } from 'nanoid';
import * as slugifyModule from 'slugify';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

// Handle CommonJS/ESM interop for slugify
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const slugify: (str: string, options?: { lower?: boolean; strict?: boolean; trim?: boolean }) => string = (slugifyModule as any).default?.default || (slugifyModule as any).default || slugifyModule;

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Utility helpers for the HHOS platform
 *
 * WHY: Consistent utilities = fewer bugs = better reliability = retained customers
 */

/**
 * Generate unique IDs for various entities
 * Using nanoid for URL-safe, short unique IDs
 */
export const generateId = {
  // Booking IDs - Short, easy to read over phone (IMPORTANT for African hotels)
  booking: () => `BK-${nanoid(8).toUpperCase()}`,

  // Guest IDs
  guest: () => `GS-${nanoid(10)}`,

  // Transaction/Payment IDs
  transaction: () => `TXN-${nanoid(12).toUpperCase()}`,

  // Room IDs
  room: () => `RM-${nanoid(8)}`,

  // Hotel codes - for multi-property management
  hotelCode: () => nanoid(6).toUpperCase(),

  // Confirmation codes - what guests receive
  confirmation: () => nanoid(8).toUpperCase(),

  // API keys for integrations
  apiKey: () => `hhos_${nanoid(32)}`,

  // Short codes for QR/SMS booking links
  shortCode: () => nanoid(6),
};

/**
 * Generate URL-friendly slug from hotel/room name
 */
export const generateSlug = (text: string): string => {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
};

/**
 * Date utilities - critical for booking accuracy
 */
export const dateUtils = {
  /**
   * Get today's date in hotel's timezone
   */
  today: (timezone = 'Africa/Lagos'): dayjs.Dayjs => {
    return dayjs().tz(timezone).startOf('day');
  },

  /**
   * Parse date string to dayjs object
   */
  parse: (date: string | Date, timezone = 'Africa/Lagos'): dayjs.Dayjs => {
    return dayjs(date).tz(timezone);
  },

  /**
   * Calculate number of nights between two dates
   * CRITICAL: This determines booking price
   */
  calculateNights: (checkIn: Date | string, checkOut: Date | string): number => {
    const start = dayjs(checkIn).startOf('day');
    const end = dayjs(checkOut).startOf('day');
    return end.diff(start, 'day');
  },

  /**
   * Check if date is in the past
   */
  isPast: (date: Date | string, timezone = 'Africa/Lagos'): boolean => {
    return dayjs(date).tz(timezone).isBefore(dayjs().tz(timezone), 'day');
  },

  /**
   * Get date range for occupancy calculations
   */
  getDateRange: (start: Date | string, end: Date | string): Date[] => {
    const dates: Date[] = [];
    let current = dayjs(start);
    const endDate = dayjs(end);

    while (current.isBefore(endDate)) {
      dates.push(current.toDate());
      current = current.add(1, 'day');
    }

    return dates;
  },

  /**
   * Format date for display
   */
  format: (date: Date | string, format = 'MMM DD, YYYY'): string => {
    return dayjs(date).format(format);
  },
};

/**
 * Currency utilities
 * Supports multiple currencies for African + global markets
 */
export const currencyUtils = {
  /**
   * Format amount with currency symbol
   */
  format: (amount: number, currency = 'NGN'): string => {
    const formatters: Record<string, Intl.NumberFormat> = {
      NGN: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }),
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
      GBP: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
      KES: new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }),
      ZAR: new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }),
      GHS: new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }),
    };

    return formatters[currency]?.format(amount) || `${currency} ${amount.toFixed(2)}`;
  },

  /**
   * Convert between currencies (basic - would integrate with real rates API)
   */
  convert: (amount: number, from: string, to: string, rates: Record<string, number>): number => {
    if (from === to) return amount;
    const rate = rates[`${from}_${to}`] || 1;
    return amount * rate;
  },
};

/**
 * Occupancy and revenue calculation helpers
 * These are CORE to the hotel business
 */
export const revenueUtils = {
  /**
   * Calculate occupancy rate
   */
  occupancyRate: (occupiedRooms: number, totalRooms: number): number => {
    if (totalRooms === 0) return 0;
    return Math.round((occupiedRooms / totalRooms) * 100 * 100) / 100;
  },

  /**
   * Calculate Average Daily Rate (ADR)
   */
  calculateADR: (totalRevenue: number, roomsSold: number): number => {
    if (roomsSold === 0) return 0;
    return Math.round((totalRevenue / roomsSold) * 100) / 100;
  },

  /**
   * Calculate Revenue Per Available Room (RevPAR)
   * KEY METRIC: This is what hotel owners care about most
   */
  calculateRevPAR: (totalRevenue: number, availableRooms: number): number => {
    if (availableRooms === 0) return 0;
    return Math.round((totalRevenue / availableRooms) * 100) / 100;
  },

  /**
   * Calculate platform fee
   */
  calculatePlatformFee: (amount: number, feePercentage: number): number => {
    return Math.round(amount * (feePercentage / 100) * 100) / 100;
  },
};

/**
 * Validation helpers
 */
export const validators = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidPhone: (phone: string): boolean => {
    // Supports Nigerian and international formats
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  },

  sanitizePhone: (phone: string): string => {
    return phone.replace(/[\s-()]/g, '');
  },
};
