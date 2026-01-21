import { Types } from 'mongoose';
import { Room, RoomType, Hotel, RoomAvailability, IRoom, IRoomType, RoomStatus } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/index.js';

/**
 * ROOM & ROOM TYPE SERVICE
 *
 * Manages room inventory - the core product hotels sell.
 *
 * REVENUE IMPACT:
 * - Accurate room inventory = no overbooking = no refunds
 * - Room types with proper pricing = revenue optimization
 * - Room status tracking = operational efficiency
 */

// ==================== ROOM TYPE OPERATIONS ====================

interface CreateRoomTypeInput {
  hotelId: string;
  name: string;
  code: string;
  description?: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren?: number;
  bedConfiguration: string;
  roomSize?: number;
  basePrice: number;
  weekendPrice?: number;
  extraPersonCharge?: number;
  childCharge?: number;
  amenities?: string[];
  images?: string[];
}

/**
 * Create a new room type
 */
export const createRoomType = async (input: CreateRoomTypeInput): Promise<IRoomType> => {
  // Check hotel subscription limits
  const hotel = await Hotel.findById(input.hotelId);
  if (!hotel) {
    throw ApiError.notFound('Hotel not found');
  }

  // Create room type
  const roomType = await RoomType.create({
    hotelId: input.hotelId,
    name: input.name,
    code: input.code.toUpperCase(),
    description: input.description,
    maxOccupancy: input.maxOccupancy,
    maxAdults: input.maxAdults,
    maxChildren: input.maxChildren || 0,
    bedConfiguration: input.bedConfiguration,
    roomSize: input.roomSize,
    pricing: {
      basePrice: input.basePrice,
      weekendPrice: input.weekendPrice,
      extraPersonCharge: input.extraPersonCharge || 0,
      childCharge: input.childCharge || 0,
    },
    amenities: input.amenities || [],
    images: input.images || [],
  });

  return roomType;
};

/**
 * Get all room types for a hotel
 */
export const getRoomTypes = async (hotelId: string): Promise<IRoomType[]> => {
  const roomTypes = await RoomType.find({ hotelId, isActive: true })
    .sort({ sortOrder: 1, name: 1 });

  return roomTypes;
};

/**
 * Get single room type
 */
export const getRoomType = async (hotelId: string, roomTypeId: string): Promise<IRoomType> => {
  const roomType = await RoomType.findOne({
    _id: roomTypeId,
    hotelId,
  });

  if (!roomType) {
    throw ApiError.notFound('Room type not found');
  }

  return roomType;
};

/**
 * Update room type
 */
export const updateRoomType = async (
  hotelId: string,
  roomTypeId: string,
  updates: Partial<CreateRoomTypeInput>
): Promise<IRoomType> => {
  const roomType = await RoomType.findOne({ _id: roomTypeId, hotelId });

  if (!roomType) {
    throw ApiError.notFound('Room type not found');
  }

  // Update allowed fields
  if (updates.name) roomType.name = updates.name;
  if (updates.description !== undefined) roomType.description = updates.description;
  if (updates.maxOccupancy) roomType.maxOccupancy = updates.maxOccupancy;
  if (updates.maxAdults) roomType.maxAdults = updates.maxAdults;
  if (updates.maxChildren !== undefined) roomType.maxChildren = updates.maxChildren;
  if (updates.bedConfiguration) roomType.bedConfiguration = updates.bedConfiguration;
  if (updates.roomSize !== undefined) roomType.roomSize = updates.roomSize;
  if (updates.basePrice) roomType.pricing.basePrice = updates.basePrice;
  if (updates.weekendPrice !== undefined) roomType.pricing.weekendPrice = updates.weekendPrice;
  if (updates.extraPersonCharge !== undefined) roomType.pricing.extraPersonCharge = updates.extraPersonCharge;
  if (updates.childCharge !== undefined) roomType.pricing.childCharge = updates.childCharge;
  if (updates.amenities) roomType.amenities = updates.amenities;
  if (updates.images) roomType.images = updates.images;

  await roomType.save();
  return roomType;
};

/**
 * Delete (deactivate) room type
 */
export const deleteRoomType = async (hotelId: string, roomTypeId: string): Promise<void> => {
  const roomType = await RoomType.findOne({ _id: roomTypeId, hotelId });

  if (!roomType) {
    throw ApiError.notFound('Room type not found');
  }

  // Check if any rooms exist for this type
  const roomCount = await Room.countDocuments({ roomTypeId, isActive: true });
  if (roomCount > 0) {
    throw ApiError.conflict(
      `Cannot delete room type with ${roomCount} active rooms. Remove rooms first.`
    );
  }

  roomType.isActive = false;
  await roomType.save();
};

// ==================== ROOM OPERATIONS ====================

interface CreateRoomInput {
  hotelId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  building?: string;
  attributes?: {
    view?: string;
    hasBalcony?: boolean;
    isAccessible?: boolean;
    isConnecting?: boolean;
    isSmoking?: boolean;
  };
  priceAdjustment?: {
    type: 'fixed' | 'percentage';
    value: number;
    reason?: string;
  };
  notes?: string;
}

/**
 * Create a new room
 */
export const createRoom = async (input: CreateRoomInput): Promise<IRoom> => {
  // Verify hotel and room type exist
  const [hotel, roomType] = await Promise.all([
    Hotel.findById(input.hotelId),
    RoomType.findOne({ _id: input.roomTypeId, hotelId: input.hotelId }),
  ]);

  if (!hotel) {
    throw ApiError.notFound('Hotel not found');
  }

  if (!roomType) {
    throw ApiError.notFound('Room type not found');
  }

  // Check subscription limit
  const tierLimits = config.subscriptionTiers[hotel.subscription.tier];
  if (tierLimits.maxRooms !== -1 && hotel.stats.totalRooms >= tierLimits.maxRooms) {
    throw ApiError.hotelLimitReached('room');
  }

  // Check for duplicate room number
  const existingRoom = await Room.findOne({
    hotelId: input.hotelId,
    roomNumber: input.roomNumber,
    isActive: true,
  });

  if (existingRoom) {
    throw ApiError.conflict(`Room ${input.roomNumber} already exists`);
  }

  // Create room
  const room = await Room.create({
    hotelId: input.hotelId,
    roomTypeId: input.roomTypeId,
    roomNumber: input.roomNumber,
    floor: input.floor,
    building: input.building,
    attributes: input.attributes || {},
    priceAdjustment: input.priceAdjustment || { type: 'fixed', value: 0 },
    notes: input.notes,
  });

  // Update hotel and room type stats
  await Promise.all([
    Hotel.updateOne({ _id: input.hotelId }, { $inc: { 'stats.totalRooms': 1 } }),
    RoomType.updateOne({ _id: input.roomTypeId }, { $inc: { totalRooms: 1 } }),
  ]);

  return room;
};

/**
 * Create multiple rooms at once (bulk)
 */
export const createRoomsBulk = async (
  hotelId: string,
  roomTypeId: string,
  rooms: Array<{ roomNumber: string; floor: number; building?: string }>
) => {
  // Verify hotel and room type
  const [hotel, roomType] = await Promise.all([
    Hotel.findById(hotelId),
    RoomType.findOne({ _id: roomTypeId, hotelId }),
  ]);

  if (!hotel) throw ApiError.notFound('Hotel not found');
  if (!roomType) throw ApiError.notFound('Room type not found');

  // Check subscription limit
  const tierLimits = config.subscriptionTiers[hotel.subscription.tier];
  if (tierLimits.maxRooms !== -1) {
    const newTotal = hotel.stats.totalRooms + rooms.length;
    if (newTotal > tierLimits.maxRooms) {
      throw ApiError.hotelLimitReached(
        `room (max ${tierLimits.maxRooms}, trying to add ${rooms.length})`
      );
    }
  }

  // Check for duplicates
  const roomNumbers = rooms.map((r) => r.roomNumber);
  const existingRooms = await Room.find({
    hotelId,
    roomNumber: { $in: roomNumbers },
    isActive: true,
  });

  if (existingRooms.length > 0) {
    const duplicates = existingRooms.map((r) => r.roomNumber).join(', ');
    throw ApiError.conflict(`These room numbers already exist: ${duplicates}`);
  }

  // Create rooms
  const roomDocs = rooms.map((r) => ({
    hotelId,
    roomTypeId,
    roomNumber: r.roomNumber,
    floor: r.floor,
    building: r.building,
  }));

  const createdRooms = await Room.insertMany(roomDocs);

  // Update stats
  await Promise.all([
    Hotel.updateOne({ _id: hotelId }, { $inc: { 'stats.totalRooms': rooms.length } }),
    RoomType.updateOne({ _id: roomTypeId }, { $inc: { totalRooms: rooms.length } }),
  ]);

  return createdRooms;
};

/**
 * Get all rooms for a hotel
 */
export const getRooms = async (
  hotelId: string,
  filters?: {
    roomTypeId?: string;
    floor?: number;
    status?: RoomStatus;
  }
): Promise<IRoom[]> => {
  const query: Record<string, unknown> = { hotelId, isActive: true };

  if (filters?.roomTypeId) query.roomTypeId = filters.roomTypeId;
  if (filters?.floor) query.floor = filters.floor;
  if (filters?.status) query.status = filters.status;

  const rooms = await Room.find(query)
    .populate('roomType')
    .sort({ floor: 1, roomNumber: 1 });

  return rooms;
};

/**
 * Get single room
 */
export const getRoom = async (hotelId: string, roomId: string): Promise<IRoom> => {
  const room = await Room.findOne({ _id: roomId, hotelId }).populate('roomType');

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  return room;
};

/**
 * Update room
 */
export const updateRoom = async (
  hotelId: string,
  roomId: string,
  updates: Partial<CreateRoomInput>
): Promise<IRoom> => {
  const room = await Room.findOne({ _id: roomId, hotelId });

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  // Don't allow changing room type if room has active booking
  if (updates.roomTypeId && updates.roomTypeId !== room.roomTypeId.toString()) {
    if (room.currentBookingId) {
      throw ApiError.conflict('Cannot change room type while room has an active booking');
    }

    // Update room type counts
    await Promise.all([
      RoomType.updateOne({ _id: room.roomTypeId }, { $inc: { totalRooms: -1 } }),
      RoomType.updateOne({ _id: updates.roomTypeId }, { $inc: { totalRooms: 1 } }),
    ]);

    room.roomTypeId = new Types.ObjectId(updates.roomTypeId);
  }

  if (updates.roomNumber) room.roomNumber = updates.roomNumber;
  if (updates.floor !== undefined) room.floor = updates.floor;
  if (updates.building !== undefined) room.building = updates.building;
  if (updates.attributes) room.attributes = { ...room.attributes, ...updates.attributes };
  if (updates.priceAdjustment) room.priceAdjustment = updates.priceAdjustment;
  if (updates.notes !== undefined) room.notes = updates.notes;

  await room.save();
  return room;
};

/**
 * Update room status
 */
export const updateRoomStatus = async (
  hotelId: string,
  roomId: string,
  status: RoomStatus,
  housekeepingStatus?: 'clean' | 'dirty' | 'inspected' | 'in_progress'
): Promise<IRoom> => {
  const room = await Room.findOne({ _id: roomId, hotelId });

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  room.status = status;

  if (housekeepingStatus) {
    room.housekeepingStatus = housekeepingStatus;
    if (housekeepingStatus === 'clean') {
      room.lastCleanedAt = new Date();
    }
    if (housekeepingStatus === 'inspected') {
      room.lastInspectedAt = new Date();
    }
  }

  await room.save();
  return room;
};

/**
 * Delete (deactivate) room
 */
export const deleteRoom = async (hotelId: string, roomId: string): Promise<void> => {
  const room = await Room.findOne({ _id: roomId, hotelId });

  if (!room) {
    throw ApiError.notFound('Room not found');
  }

  if (room.currentBookingId) {
    throw ApiError.conflict('Cannot delete room with active booking');
  }

  room.isActive = false;
  await room.save();

  // Update stats
  await Promise.all([
    Hotel.updateOne({ _id: hotelId }, { $inc: { 'stats.totalRooms': -1 } }),
    RoomType.updateOne({ _id: room.roomTypeId }, { $inc: { totalRooms: -1 } }),
  ]);
};

/**
 * Get room status summary (for dashboard)
 */
export const getRoomStatusSummary = async (hotelId: string) => {
  const rooms = await Room.find({ hotelId, isActive: true });

  const summary = {
    total: rooms.length,
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0,
    maintenance: 0,
    blocked: 0,
    housekeeping: {
      clean: 0,
      dirty: 0,
      inspected: 0,
      inProgress: 0,
    },
  };

  for (const room of rooms) {
    // Status counts
    switch (room.status) {
      case 'available':
        summary.available++;
        break;
      case 'occupied':
        summary.occupied++;
        break;
      case 'reserved':
        summary.reserved++;
        break;
      case 'cleaning':
        summary.cleaning++;
        break;
      case 'maintenance':
        summary.maintenance++;
        break;
      case 'blocked':
        summary.blocked++;
        break;
    }

    // Housekeeping counts
    switch (room.housekeepingStatus) {
      case 'clean':
        summary.housekeeping.clean++;
        break;
      case 'dirty':
        summary.housekeeping.dirty++;
        break;
      case 'inspected':
        summary.housekeeping.inspected++;
        break;
      case 'in_progress':
        summary.housekeeping.inProgress++;
        break;
    }
  }

  return summary;
};
