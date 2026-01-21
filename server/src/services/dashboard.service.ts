import { Types } from 'mongoose';
import { Booking, Room, Hotel, Guest, RoomType } from '../models/index.js';
import { dateUtils, revenueUtils } from '../utils/helpers.js';

/**
 * DASHBOARD & ANALYTICS SERVICE
 *
 * Shows hotel owners their ROI. This is what SELLS the software.
 *
 * REVENUE IMPACT:
 * - Clear metrics = proven value = subscription retention
 * - Revenue visibility = trust = upsell opportunity
 * - Comparison data = urgency to improve = engagement
 */

interface DashboardSummary {
  // Today's snapshot
  today: {
    arrivals: number;
    departures: number;
    inHouse: number;
    revenue: number;
    newBookings: number;
  };
  // Occupancy
  occupancy: {
    current: number;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    outOfOrder: number;
  };
  // Financial
  financial: {
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    pendingPayments: number;
    averageDailyRate: number;
    revPar: number;
  };
  // Booking channels - shows value of direct booking
  channels: Array<{
    channel: string;
    bookings: number;
    revenue: number;
    percentage: number;
  }>;
  // Quick stats
  quickStats: {
    totalGuests: number;
    repeatGuests: number;
    averageStayLength: number;
    cancellationRate: number;
  };
}

/**
 * Get comprehensive dashboard data
 */
export const getDashboardSummary = async (hotelId: string): Promise<DashboardSummary> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const hotelObjectId = new Types.ObjectId(hotelId);

  // Parallel queries for performance
  const [
    hotel,
    rooms,
    todayArrivals,
    todayDepartures,
    inHouseBookings,
    todayNewBookings,
    weekBookings,
    monthBookings,
    pendingPaymentsData,
    channelData,
    guestStats,
  ] = await Promise.all([
    // Hotel info
    Hotel.findById(hotelId),

    // All active rooms
    Room.find({ hotelId, isActive: true }),

    // Today's arrivals
    Booking.countDocuments({
      hotelId,
      checkInDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'checked_in'] },
    }),

    // Today's departures
    Booking.countDocuments({
      hotelId,
      checkOutDate: { $gte: today, $lt: tomorrow },
      status: 'checked_in',
    }),

    // Currently in-house
    Booking.find({
      hotelId,
      status: 'checked_in',
    }),

    // Bookings created today
    Booking.find({
      hotelId,
      createdAt: { $gte: today, $lt: tomorrow },
    }),

    // This week's completed bookings
    Booking.find({
      hotelId,
      status: { $in: ['checked_in', 'checked_out'] },
      checkInDate: { $gte: weekAgo },
    }),

    // This month's completed bookings
    Booking.find({
      hotelId,
      status: { $in: ['checked_in', 'checked_out'] },
      checkInDate: { $gte: monthAgo },
    }),

    // Pending payments
    Booking.aggregate([
      {
        $match: {
          hotelId: hotelObjectId,
          status: { $in: ['confirmed', 'checked_in'] },
          balanceDue: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$balanceDue' },
        },
      },
    ]),

    // Bookings by channel (this month)
    Booking.aggregate([
      {
        $match: {
          hotelId: hotelObjectId,
          createdAt: { $gte: monthAgo },
          status: { $nin: ['cancelled'] },
        },
      },
      {
        $group: {
          _id: '$channel',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.grandTotal' },
        },
      },
      { $sort: { revenue: -1 } },
    ]),

    // Guest stats
    Guest.aggregate([
      {
        $match: {
          'hotelHistory.hotelId': hotelObjectId,
        },
      },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: 1 },
          repeatGuests: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $reduce: {
                        input: '$hotelHistory',
                        initialValue: 0,
                        in: {
                          $cond: [
                            { $eq: ['$$this.hotelId', hotelObjectId] },
                            '$$this.totalStays',
                            '$$value',
                          ],
                        },
                      },
                    },
                    1,
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalNights: { $sum: '$stats.totalNights' },
          totalBookings: { $sum: '$stats.totalBookings' },
        },
      },
    ]),
  ]);

  // Calculate room status
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const outOfOrder = rooms.filter((r) =>
    ['maintenance', 'blocked'].includes(r.status)
  ).length;
  const availableRooms = totalRooms - occupiedRooms - outOfOrder;

  // Calculate revenue figures
  const todayRevenue = todayNewBookings.reduce(
    (sum, b) => sum + b.pricing.grandTotal,
    0
  );
  const weekRevenue = weekBookings.reduce(
    (sum, b) => sum + b.pricing.grandTotal,
    0
  );
  const monthRevenue = monthBookings.reduce(
    (sum, b) => sum + b.pricing.grandTotal,
    0
  );

  // Calculate KPIs
  const roomsSoldThisMonth = monthBookings.reduce((sum, b) => sum + b.nights, 0);
  const availableRoomNights = totalRooms * 30; // Simplified for month

  const adr = revenueUtils.calculateADR(monthRevenue, roomsSoldThisMonth);
  const revPar = revenueUtils.calculateRevPAR(monthRevenue, availableRoomNights);

  // Format channel data
  const totalChannelBookings = channelData.reduce((sum, c) => sum + c.count, 0);
  const channels = channelData.map((c) => ({
    channel: c._id,
    bookings: c.count,
    revenue: c.revenue,
    percentage: totalChannelBookings > 0
      ? Math.round((c.count / totalChannelBookings) * 100)
      : 0,
  }));

  // Guest stats
  const guestData = guestStats[0] || {
    totalGuests: 0,
    repeatGuests: 0,
    totalNights: 0,
    totalBookings: 0,
  };

  const averageStayLength = guestData.totalBookings > 0
    ? Math.round((guestData.totalNights / guestData.totalBookings) * 10) / 10
    : 0;

  // Cancellation rate
  const cancelledThisMonth = await Booking.countDocuments({
    hotelId,
    status: 'cancelled',
    createdAt: { $gte: monthAgo },
  });
  const totalBookingsThisMonth = monthBookings.length + cancelledThisMonth;
  const cancellationRate = totalBookingsThisMonth > 0
    ? Math.round((cancelledThisMonth / totalBookingsThisMonth) * 100)
    : 0;

  return {
    today: {
      arrivals: todayArrivals,
      departures: todayDepartures,
      inHouse: inHouseBookings.length,
      revenue: todayRevenue,
      newBookings: todayNewBookings.length,
    },
    occupancy: {
      current: revenueUtils.occupancyRate(occupiedRooms, totalRooms - outOfOrder),
      totalRooms,
      occupiedRooms,
      availableRooms,
      outOfOrder,
    },
    financial: {
      todayRevenue,
      weekRevenue,
      monthRevenue,
      pendingPayments: pendingPaymentsData[0]?.total || 0,
      averageDailyRate: adr,
      revPar,
    },
    channels,
    quickStats: {
      totalGuests: guestData.totalGuests,
      repeatGuests: guestData.repeatGuests,
      averageStayLength,
      cancellationRate,
    },
  };
};

/**
 * Get revenue breakdown by date range
 */
export const getRevenueReport = async (
  hotelId: string,
  startDate: Date,
  endDate: Date
) => {
  const hotelObjectId = new Types.ObjectId(hotelId);

  // Daily revenue
  const dailyRevenue = await Booking.aggregate([
    {
      $match: {
        hotelId: hotelObjectId,
        checkInDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['checked_in', 'checked_out'] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkInDate' } },
        bookings: { $sum: 1 },
        roomRevenue: { $sum: '$pricing.totalRoomCharges' },
        addOnsRevenue: { $sum: '$pricing.addOnsTotal' },
        totalRevenue: { $sum: '$pricing.grandTotal' },
        platformFees: { $sum: '$pricing.platformFee' },
        netRevenue: { $sum: '$pricing.netRevenue' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Revenue by room type
  const revenueByRoomType = await Booking.aggregate([
    {
      $match: {
        hotelId: hotelObjectId,
        checkInDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['checked_in', 'checked_out'] },
      },
    },
    {
      $group: {
        _id: '$roomTypeId',
        bookings: { $sum: 1 },
        nights: { $sum: '$nights' },
        revenue: { $sum: '$pricing.grandTotal' },
      },
    },
  ]);

  // Populate room type names
  const roomTypes = await RoomType.find({
    _id: { $in: revenueByRoomType.map((r) => r._id) },
  });

  const roomTypeMap = new Map(roomTypes.map((rt) => [rt._id.toString(), rt.name]));

  return {
    daily: dailyRevenue,
    byRoomType: revenueByRoomType.map((r) => ({
      ...r,
      roomTypeName: roomTypeMap.get(r._id.toString()) || 'Unknown',
    })),
    summary: {
      totalRevenue: dailyRevenue.reduce((sum, d) => sum + d.totalRevenue, 0),
      totalBookings: dailyRevenue.reduce((sum, d) => sum + d.bookings, 0),
      platformFees: dailyRevenue.reduce((sum, d) => sum + d.platformFees, 0),
      netRevenue: dailyRevenue.reduce((sum, d) => sum + d.netRevenue, 0),
    },
  };
};

/**
 * Get occupancy trend data
 */
export const getOccupancyTrend = async (
  hotelId: string,
  startDate: Date,
  endDate: Date
) => {
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) return [];

  const totalRooms = hotel.stats.totalRooms;
  const hotelObjectId = new Types.ObjectId(hotelId);

  // Get daily occupancy
  const occupancyData = await Booking.aggregate([
    {
      $match: {
        hotelId: hotelObjectId,
        status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
        checkInDate: { $lte: endDate },
        checkOutDate: { $gte: startDate },
      },
    },
    {
      $project: {
        dates: {
          $map: {
            input: { $range: [0, '$nights'] },
            as: 'day',
            in: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $dateAdd: { startDate: '$checkInDate', unit: 'day', amount: '$$day' } },
              },
            },
          },
        },
      },
    },
    { $unwind: '$dates' },
    {
      $group: {
        _id: '$dates',
        roomsOccupied: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return occupancyData.map((d) => ({
    date: d._id,
    roomsOccupied: d.roomsOccupied,
    totalRooms,
    occupancyRate: revenueUtils.occupancyRate(d.roomsOccupied, totalRooms),
  }));
};

/**
 * Get channel performance comparison
 * Shows ROI of direct bookings vs OTAs
 */
export const getChannelPerformance = async (
  hotelId: string,
  startDate: Date,
  endDate: Date
) => {
  const hotelObjectId = new Types.ObjectId(hotelId);

  const channelStats = await Booking.aggregate([
    {
      $match: {
        hotelId: hotelObjectId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled'] },
      },
    },
    {
      $group: {
        _id: '$channel',
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.grandTotal' },
        platformFees: { $sum: '$pricing.platformFee' },
        netRevenue: { $sum: '$pricing.netRevenue' },
        averageBookingValue: { $avg: '$pricing.grandTotal' },
        totalNights: { $sum: '$nights' },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  // Calculate OTA commissions separately (they're not our platform fee)
  const otaBookings = await Booking.find({
    hotelId,
    channel: 'ota',
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $nin: ['cancelled'] },
  });

  const otaCommissions = otaBookings.reduce(
    (sum, b) => sum + (b.channelDetails?.otaCommission || 0),
    0
  );

  return {
    channels: channelStats.map((c) => ({
      channel: c._id,
      bookings: c.totalBookings,
      revenue: c.totalRevenue,
      platformFees: c.platformFees,
      netRevenue: c.netRevenue,
      averageBookingValue: Math.round(c.averageBookingValue * 100) / 100,
      nights: c.totalNights,
    })),
    insights: {
      otaCommissionsPaid: otaCommissions,
      directBookingSavings:
        channelStats
          .filter((c) => ['direct', 'website', 'whatsapp'].includes(c._id))
          .reduce((sum, c) => sum + c.totalRevenue, 0) * 0.15, // Estimated OTA commission saved
    },
  };
};
