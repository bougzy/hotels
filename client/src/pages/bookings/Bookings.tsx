import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Calendar,
  Plus,
  Search,
  Eye,
  LogIn,
  LogOut,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/**
 * Bookings Management Page
 *
 * REVENUE IMPACT:
 * - Quick overview of all bookings = operational efficiency
 * - Easy check-in/out = better guest experience
 * - Payment tracking = no revenue leakage
 */

interface Guest {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Room {
  _id: string;
  roomNumber: string;
  floor: number;
}

interface RoomType {
  _id: string;
  name: string;
  code: string;
}

interface Booking {
  _id: string;
  bookingCode: string;
  confirmationCode: string;
  guest: Guest;
  room: Room;
  roomType: RoomType;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  status: string;
  paymentStatus: string;
  channel: string;
  pricing: {
    grandTotal: number;
    currency: string;
  };
  amountPaid: number;
  balanceDue: number;
  createdAt: string;
}

interface TodayOperations {
  arrivals: {
    total: number;
    checkedIn: number;
    pending: number;
    bookings: Booking[];
  };
  departures: {
    total: number;
    bookings: Booking[];
  };
  inHouse: {
    total: number;
    bookings: Booking[];
  };
}

type TabType = 'all' | 'arrivals' | 'departures' | 'in-house';

export function BookingsPage() {
  const { hotel } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modal states
  const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null);
  const [checkOutBooking, setCheckOutBooking] = useState<Booking | null>(null);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post(`/bookings/${bookingId}/check-in?hotelId=${hotel?._id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['todayOperations'] });
      setCheckInBooking(null);
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: (bookingId: string) =>
      apiClient.post(`/bookings/${bookingId}/check-out?hotelId=${hotel?._id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['todayOperations'] });
      setCheckOutBooking(null);
    },
  });

  // Fetch all bookings
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', hotel?._id, statusFilter, page],
    queryFn: () => {
      let url = `/bookings?hotelId=${hotel?._id}&page=${page}&limit=${limit}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      return apiClient.get<Booking[]>(url);
    },
    enabled: !!hotel?._id && activeTab === 'all',
  });

  // Fetch today's operations
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['todayOperations', hotel?._id],
    queryFn: () => apiClient.get<TodayOperations>(`/bookings/today?hotelId=${hotel?._id}`),
    enabled: !!hotel?._id,
  });

  const bookings = bookingsData?.data || [];
  const today = todayData?.data;
  const totalPages = bookingsData?.meta?.totalPages || 1;

  // Get bookings based on active tab
  const getDisplayBookings = (): Booking[] => {
    switch (activeTab) {
      case 'arrivals':
        return today?.arrivals.bookings || [];
      case 'departures':
        return today?.departures.bookings || [];
      case 'in-house':
        return today?.inHouse.bookings || [];
      default:
        return bookings;
    }
  };

  const displayBookings = getDisplayBookings().filter(
    (booking) =>
      booking.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.room?.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = activeTab === 'all' ? bookingsLoading : todayLoading;

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'info';
      case 'checked_in':
        return 'success';
      case 'checked_out':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            Manage reservations and guest check-ins
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            activeTab === 'arrivals' && 'ring-2 ring-primary'
          )}
          onClick={() => setActiveTab('arrivals')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Arrivals</p>
                <p className="text-3xl font-bold">{today?.arrivals.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {today?.arrivals.checkedIn || 0} checked in, {today?.arrivals.pending || 0} pending
                </p>
              </div>
              <LogIn className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            activeTab === 'departures' && 'ring-2 ring-primary'
          )}
          onClick={() => setActiveTab('departures')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Departures</p>
                <p className="text-3xl font-bold">{today?.departures.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expected check-outs
                </p>
              </div>
              <LogOut className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            activeTab === 'in-house' && 'ring-2 ring-primary'
          )}
          onClick={() => setActiveTab('in-house')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In-House</p>
                <p className="text-3xl font-bold">{today?.inHouse.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently staying
                </p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'all', label: 'All Bookings' },
          { key: 'arrivals', label: 'Arrivals' },
          { key: 'departures', label: 'Departures' },
          { key: 'in-house', label: 'In-House' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, guest name, or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {activeTab === 'all' && (
          <div className="flex gap-2 flex-wrap">
            {['all', 'confirmed', 'checked_in', 'pending', 'cancelled'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className="capitalize"
              >
                {status.replace('_', ' ')}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No bookings found</h3>
            <p className="text-muted-foreground text-center">
              {activeTab === 'all'
                ? 'Create your first booking to get started'
                : `No ${activeTab.replace('-', ' ')} for today`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Booking</th>
                    <th className="text-left p-4 font-medium">Guest</th>
                    <th className="text-left p-4 font-medium">Room</th>
                    <th className="text-left p-4 font-medium">Dates</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBookings.map((booking) => (
                    <tr key={booking._id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{booking.bookingCode}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {booking.channel}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {booking.guest?.firstName} {booking.guest?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.guest?.phone}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{booking.room?.roomNumber || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.roomType?.name}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm">
                            {formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.nights} night{booking.nights > 1 ? 's' : ''} · {booking.adults} adult{booking.adults > 1 ? 's' : ''}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">
                            {formatCurrency(booking.pricing.grandTotal, booking.pricing.currency)}
                          </p>
                          {booking.balanceDue > 0 && (
                            <p className="text-xs text-orange-600">
                              Due: {formatCurrency(booking.balanceDue, booking.pricing.currency)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={statusBadgeVariant(booking.status) as any} className="capitalize">
                          {booking.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {booking.status === 'confirmed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCheckInBooking(booking)}
                            >
                              <LogIn className="h-4 w-4 mr-1" />
                              Check In
                            </Button>
                          )}
                          {booking.status === 'checked_in' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCheckOutBooking(booking)}
                            >
                              <LogOut className="h-4 w-4 mr-1" />
                              Check Out
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {activeTab === 'all' && totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Check-In Confirmation Dialog */}
      <AlertDialog open={!!checkInBooking} onOpenChange={() => setCheckInBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check-In</AlertDialogTitle>
            <AlertDialogDescription>
              {checkInBooking && (
                <div className="space-y-2 mt-2">
                  <p>
                    <strong>Guest:</strong> {checkInBooking.guest?.firstName} {checkInBooking.guest?.lastName}
                  </p>
                  <p>
                    <strong>Room:</strong> {checkInBooking.room?.roomNumber || 'To be assigned'} ({checkInBooking.roomType?.name})
                  </p>
                  <p>
                    <strong>Dates:</strong> {formatDate(checkInBooking.checkInDate)} - {formatDate(checkInBooking.checkOutDate)}
                  </p>
                  <p>
                    <strong>Booking Code:</strong> {checkInBooking.bookingCode}
                  </p>
                  {checkInBooking.balanceDue > 0 && (
                    <p className="text-orange-600">
                      <strong>Balance Due:</strong> {formatCurrency(checkInBooking.balanceDue, checkInBooking.pricing.currency)}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => checkInBooking && checkInMutation.mutate(checkInBooking._id)}
              disabled={checkInMutation.isPending}
            >
              {checkInMutation.isPending ? 'Processing...' : 'Confirm Check-In'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Check-Out Confirmation Dialog */}
      <AlertDialog open={!!checkOutBooking} onOpenChange={() => setCheckOutBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check-Out</AlertDialogTitle>
            <AlertDialogDescription>
              {checkOutBooking && (
                <div className="space-y-2 mt-2">
                  <p>
                    <strong>Guest:</strong> {checkOutBooking.guest?.firstName} {checkOutBooking.guest?.lastName}
                  </p>
                  <p>
                    <strong>Room:</strong> {checkOutBooking.room?.roomNumber} ({checkOutBooking.roomType?.name})
                  </p>
                  <p>
                    <strong>Check-out Date:</strong> {formatDate(checkOutBooking.checkOutDate)}
                  </p>
                  <p>
                    <strong>Total Amount:</strong> {formatCurrency(checkOutBooking.pricing.grandTotal, checkOutBooking.pricing.currency)}
                  </p>
                  {checkOutBooking.balanceDue > 0 && (
                    <p className="text-orange-600 font-medium">
                      <strong>Outstanding Balance:</strong> {formatCurrency(checkOutBooking.balanceDue, checkOutBooking.pricing.currency)}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => checkOutBooking && checkOutMutation.mutate(checkOutBooking._id)}
              disabled={checkOutMutation.isPending}
            >
              {checkOutMutation.isPending ? 'Processing...' : 'Confirm Check-Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
