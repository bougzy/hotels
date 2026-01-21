import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  BedDouble,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  LogIn,
  LogOut,
  AlertCircle,
} from 'lucide-react';

/**
 * Main Dashboard
 *
 * THE MONEY VIEW - This is what hotel owners see first.
 * Must clearly show ROI and key metrics.
 *
 * REVENUE IMPACT:
 * - Clear value = subscription retention
 * - Actionable insights = engaged users
 */

interface DashboardSummary {
  today: {
    arrivals: number;
    departures: number;
    inHouse: number;
    revenue: number;
    newBookings: number;
  };
  occupancy: {
    current: number;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    outOfOrder: number;
  };
  financial: {
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    pendingPayments: number;
    averageDailyRate: number;
    revPar: number;
  };
  channels: Array<{
    channel: string;
    bookings: number;
    revenue: number;
    percentage: number;
  }>;
  quickStats: {
    totalGuests: number;
    repeatGuests: number;
    averageStayLength: number;
    cancellationRate: number;
  };
}

export function DashboardPage() {
  const { hotel } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', hotel?._id],
    queryFn: () =>
      apiClient.get<DashboardSummary>(`/dashboard/summary?hotelId=${hotel?._id}`),
    enabled: !!hotel?._id,
  });

  const summary = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's how {hotel?.name} is performing.
        </p>
      </div>

      {/* Today's Operations */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Arrivals</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.today.arrivals || 0}</div>
            <p className="text-xs text-muted-foreground">Expected check-ins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Departures</CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.today.departures || 0}</div>
            <p className="text-xs text-muted-foreground">Expected check-outs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-House Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.today.inHouse || 0}</div>
            <p className="text-xs text-muted-foreground">Currently staying</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.today.newBookings || 0}</div>
            <p className="text-xs text-muted-foreground">Booked today</p>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy & Revenue */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Occupancy Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {summary?.occupancy.current || 0}%
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Rooms</span>
                <span className="font-medium">{summary?.occupancy.totalRooms || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Occupied</span>
                <span className="font-medium text-green-600">
                  {summary?.occupancy.occupiedRooms || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium text-blue-600">
                  {summary?.occupancy.availableRooms || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Out of Order</span>
                <span className="font-medium text-red-600">
                  {summary?.occupancy.outOfOrder || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.financial.todayRevenue || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.financial.weekRevenue || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.financial.monthRevenue || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(summary?.financial.pendingPayments || 0)}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ADR (Avg Daily Rate)</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(summary?.financial.averageDailyRate || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">RevPAR</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(summary?.financial.revPar || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Booking Channels (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.channels && summary.channels.length > 0 ? (
              <div className="space-y-4">
                {summary.channels.map((channel) => (
                  <div key={channel.channel} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{channel.channel}</span>
                        <Badge variant="secondary">{channel.percentage}%</Badge>
                      </div>
                      <span className="text-sm">
                        {channel.bookings} bookings
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${channel.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-24 text-right">
                        {formatCurrency(channel.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No booking data yet</p>
                <p className="text-sm">Start accepting bookings to see channel performance</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guest Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Total Guests</p>
                  <p className="text-sm text-muted-foreground">All time</p>
                </div>
                <span className="text-2xl font-bold">
                  {summary?.quickStats.totalGuests || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Repeat Guests</p>
                  <p className="text-sm text-muted-foreground">Stayed more than once</p>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {summary?.quickStats.repeatGuests || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Avg Stay Length</p>
                  <p className="text-sm text-muted-foreground">Nights per booking</p>
                </div>
                <span className="text-2xl font-bold">
                  {summary?.quickStats.averageStayLength || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Cancellation Rate</p>
                  <p className="text-sm text-muted-foreground">This month</p>
                </div>
                <span className={`text-2xl font-bold ${
                  (summary?.quickStats.cancellationRate || 0) > 10
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {summary?.quickStats.cancellationRate || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
