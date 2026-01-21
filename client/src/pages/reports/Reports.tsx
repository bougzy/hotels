import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

/**
 * Reports Page
 *
 * Revenue analytics and business intelligence.
 * Shows hotel owners detailed financial performance.
 */

interface RevenueReport {
  daily: Array<{
    _id: string;
    bookings: number;
    roomRevenue: number;
    addOnsRevenue: number;
    totalRevenue: number;
    platformFees: number;
    netRevenue: number;
  }>;
  byRoomType: Array<{
    _id: string;
    roomTypeName: string;
    bookings: number;
    nights: number;
    revenue: number;
  }>;
  summary: {
    totalRevenue: number;
    totalBookings: number;
    platformFees: number;
    netRevenue: number;
  };
}

interface ChannelPerformance {
  channels: Array<{
    channel: string;
    bookings: number;
    revenue: number;
    platformFees: number;
    netRevenue: number;
    averageBookingValue: number;
    nights: number;
  }>;
  insights: {
    otaCommissionsPaid: number;
    directBookingSavings: number;
  };
}

export function ReportsPage() {
  const { hotel } = useAuthStore();

  // Default to last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  // Revenue Report Query
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-report', hotel?._id, startDate, endDate],
    queryFn: () =>
      apiClient.get<RevenueReport>(
        `/dashboard/revenue?startDate=${startDate}&endDate=${endDate}`
      ),
    enabled: !!hotel?._id && !!startDate && !!endDate,
  });

  // Channel Performance Query
  const { data: channelData, isLoading: channelLoading } = useQuery({
    queryKey: ['channel-report', hotel?._id, startDate, endDate],
    queryFn: () =>
      apiClient.get<ChannelPerformance>(
        `/dashboard/channels?startDate=${startDate}&endDate=${endDate}`
      ),
    enabled: !!hotel?._id && !!startDate && !!endDate,
  });

  const revenue = revenueData?.data;
  const channels = channelData?.data;

  const isLoading = revenueLoading || channelLoading;

  // Calculate totals for channel chart
  const totalChannelRevenue = channels?.channels.reduce((sum, c) => sum + c.revenue, 0) || 0;

  // Export to CSV
  const exportToCSV = () => {
    if (!revenue?.daily) return;

    const headers = ['Date', 'Bookings', 'Room Revenue', 'Total Revenue', 'Net Revenue'];
    const rows = revenue.daily.map((d) => [
      d._id,
      d.bookings,
      d.roomRevenue,
      d.totalRevenue,
      d.netRevenue,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Revenue analytics and performance metrics for {hotel?.name}
          </p>
        </div>

        <Button onClick={exportToCSV} variant="outline" disabled={!revenue?.daily?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 7);
                  setStartDate(d.toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                }}
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 30);
                  setStartDate(d.toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                }}
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 3);
                  setStartDate(d.toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                }}
              >
                Last 90 days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(revenue?.summary.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {revenue?.summary.totalBookings || 0} bookings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(revenue?.summary.netRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">After platform fees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    revenue?.summary.totalBookings
                      ? revenue.summary.totalRevenue / revenue.summary.totalBookings
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Per booking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Direct Booking Savings</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(channels?.insights.directBookingSavings || 0)}
                </div>
                <p className="text-xs text-muted-foreground">vs OTA commissions</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Room Type */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Revenue by Room Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenue?.byRoomType && revenue.byRoomType.length > 0 ? (
                  <div className="space-y-4">
                    {revenue.byRoomType.map((rt, idx) => {
                      const percentage = revenue.summary.totalRevenue
                        ? Math.round((rt.revenue / revenue.summary.totalRevenue) * 100)
                        : 0;
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                      return (
                        <div key={rt._id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`} />
                              <span className="font-medium">{rt.roomTypeName}</span>
                              <Badge variant="secondary">{percentage}%</Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {rt.bookings} bookings
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colors[idx % colors.length]} rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-24 text-right">
                              {formatCurrency(rt.revenue)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {rt.nights} nights sold
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No room revenue data for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Channel Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Channel Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {channels?.channels && channels.channels.length > 0 ? (
                  <div className="space-y-4">
                    {channels.channels.map((ch) => {
                      const percentage = totalChannelRevenue
                        ? Math.round((ch.revenue / totalChannelRevenue) * 100)
                        : 0;
                      const isDirectChannel = ['direct', 'website', 'whatsapp'].includes(ch.channel);
                      return (
                        <div key={ch.channel} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{ch.channel}</span>
                              <Badge variant={isDirectChannel ? 'default' : 'secondary'}>
                                {percentage}%
                              </Badge>
                              {isDirectChannel && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                  No commission
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {ch.bookings} bookings
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${isDirectChannel ? 'bg-green-500' : 'bg-blue-500'} rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-24 text-right">
                              {formatCurrency(ch.revenue)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Avg booking: {formatCurrency(ch.averageBookingValue)} | {ch.nights} nights
                          </p>
                        </div>
                      );
                    })}

                    {channels.insights.otaCommissionsPaid > 0 && (
                      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700">
                          <ArrowDownRight className="h-4 w-4" />
                          <span className="font-medium">OTA Commissions Paid</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-700 mt-1">
                          {formatCurrency(channels.insights.otaCommissionsPaid)}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          Increase direct bookings to reduce this cost
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No channel data for this period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Revenue Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenue?.daily && revenue.daily.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-right py-3 px-4 font-medium">Bookings</th>
                        <th className="text-right py-3 px-4 font-medium">Room Revenue</th>
                        <th className="text-right py-3 px-4 font-medium">Add-ons</th>
                        <th className="text-right py-3 px-4 font-medium">Total</th>
                        <th className="text-right py-3 px-4 font-medium">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.daily.map((day) => (
                        <tr key={day._id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{day._id}</td>
                          <td className="text-right py-3 px-4">{day.bookings}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(day.roomRevenue)}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(day.addOnsRevenue)}</td>
                          <td className="text-right py-3 px-4 font-medium">
                            {formatCurrency(day.totalRevenue)}
                          </td>
                          <td className="text-right py-3 px-4 text-green-600 font-medium">
                            {formatCurrency(day.netRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 font-bold">
                        <td className="py-3 px-4">Total</td>
                        <td className="text-right py-3 px-4">{revenue.summary.totalBookings}</td>
                        <td className="text-right py-3 px-4">-</td>
                        <td className="text-right py-3 px-4">-</td>
                        <td className="text-right py-3 px-4">
                          {formatCurrency(revenue.summary.totalRevenue)}
                        </td>
                        <td className="text-right py-3 px-4 text-green-600">
                          {formatCurrency(revenue.summary.netRevenue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No revenue data for this period</p>
                  <p className="text-sm">Try selecting a different date range</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
