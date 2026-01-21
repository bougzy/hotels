/**
 * Model exports
 * Centralized exports for cleaner imports throughout the application
 */

export { Hotel, type IHotel, type IHotelSettings, type IHotelSubscription } from './Hotel.js';
export { User, type IUser, type UserRole, DEFAULT_ROLE_PERMISSIONS } from './User.js';
export { RoomType, type IRoomType, type IRoomTypePricing } from './RoomType.js';
export { Room, type IRoom, type RoomStatus } from './Room.js';
export { Guest, type IGuest, type IGuestPreferences } from './Guest.js';
export {
  Booking,
  type IBooking,
  type BookingStatus,
  type PaymentStatus,
  type BookingChannel,
  type IBookingPayment,
  type IBookingAddOn,
} from './Booking.js';
export { RoomAvailability, type IRoomAvailability } from './RoomAvailability.js';
