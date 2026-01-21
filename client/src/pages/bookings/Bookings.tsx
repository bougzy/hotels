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
  Label,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  CreditCard,
  Banknote,
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'paystack',
    receiptNumber: '',
    notes: '',
  });

  // New booking form state
  const [newBooking, setNewBooking] = useState({
    roomTypeId: '',
    guestId: '',
    checkInDate: '',
    checkOutDate: '',
    adults: 1,
    children: 0,
    channel: 'direct',
    notes: '',
    // For creating new guest inline
    createNewGuest: false,
    newGuest: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
    },
  });

  // Fetch room types for booking form
  const { data: roomTypesData } = useQuery({
    queryKey: ['roomTypes', hotel?._id],
    queryFn: () => apiClient.get<RoomType[]>(`/rooms/types?hotelId=${hotel?._id}`),
    enabled: !!hotel?._id,
  });

  // Fetch guests for booking form
  const { data: guestsData } = useQuery({
    queryKey: ['guestsForBooking', hotel?._id],
    queryFn: () => apiClient.get<{ guests: Guest[] }>(`/guests?hotelId=${hotel?._id}&limit=100`),
    enabled: !!hotel?._id,
  });

  const roomTypes = roomTypesData?.data || [];
  const guestsList = guestsData?.data?.guests || [];

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: typeof newBooking) => {
      // If creating new guest, we need to pass guest info inline
      const payload: Record<string, unknown> = {
        roomTypeId: data.roomTypeId,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        adults: data.adults,
        children: data.children,
        channel: data.channel,
        notes: data.notes,
      };

      if (data.createNewGuest) {
        payload.guest = data.newGuest;
      } else {
        payload.guestId = data.guestId;
      }

      return apiClient.post(`/bookings?hotelId=${hotel?._id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['todayOperations'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setShowAddModal(false);
      setNewBooking({
        roomTypeId: '',
        guestId: '',
        checkInDate: '',
        checkOutDate: '',
        adults: 1,
        children: 0,
        channel: 'direct',
        notes: '',
        createNewGuest: false,
        newGuest: { firstName: '', lastName: '', phone: '', email: '' },
      });
    },
  });

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

  // Manual payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (data: { bookingId: string; amount: number; method: string; receiptNumber?: string; notes?: string }) =>
      apiClient.post(`/payments/manual?hotelId=${hotel?._id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['todayOperations'] });
      setPaymentBooking(null);
      setPaymentForm({ amount: 0, method: 'cash', receiptNumber: '', notes: '' });
    },
  });

  // Initialize Paystack payment mutation
  const initPaystackMutation = useMutation({
    mutationFn: (data: { bookingId: string; amount: number }) =>
      apiClient.post<{ authorizationUrl: string; reference: string }>(`/payments/initialize?hotelId=${hotel?._id}`, data),
    onSuccess: (response) => {
      // Redirect to Paystack payment page
      if (response.data?.authorizationUrl) {
        window.location.href = response.data.authorizationUrl;
      }
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
        <Button onClick={() => setShowAddModal(true)}>
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
                          {booking.balanceDue > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPaymentBooking(booking);
                                setPaymentForm({ ...paymentForm, amount: booking.balanceDue });
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
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

      {/* New Booking Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              Fill in the booking details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Room Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="roomType">Room Type *</Label>
              <select
                id="roomType"
                className="w-full h-10 px-3 border rounded-md bg-background"
                value={newBooking.roomTypeId}
                onChange={(e) => setNewBooking({ ...newBooking, roomTypeId: e.target.value })}
              >
                <option value="">Select a room type</option>
                {roomTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name} - {formatCurrency(type.pricing?.basePrice || 0)}/night
                  </option>
                ))}
              </select>
              {roomTypes.length === 0 && (
                <p className="text-xs text-orange-600">
                  No room types available. Please create room types first.
                </p>
              )}
            </div>

            {/* Guest Selection or Creation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Guest *</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setNewBooking({
                    ...newBooking,
                    createNewGuest: !newBooking.createNewGuest,
                    guestId: '',
                  })}
                >
                  {newBooking.createNewGuest ? 'Select existing guest' : 'Create new guest'}
                </button>
              </div>

              {newBooking.createNewGuest ? (
                <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={newBooking.newGuest.firstName}
                        onChange={(e) => setNewBooking({
                          ...newBooking,
                          newGuest: { ...newBooking.newGuest, firstName: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={newBooking.newGuest.lastName}
                        onChange={(e) => setNewBooking({
                          ...newBooking,
                          newGuest: { ...newBooking.newGuest, lastName: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs">Phone *</Label>
                    <Input
                      id="phone"
                      placeholder="+1234567890"
                      value={newBooking.newGuest.phone}
                      onChange={(e) => setNewBooking({
                        ...newBooking,
                        newGuest: { ...newBooking.newGuest, phone: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={newBooking.newGuest.email}
                      onChange={(e) => setNewBooking({
                        ...newBooking,
                        newGuest: { ...newBooking.newGuest, email: e.target.value }
                      })}
                    />
                  </div>
                </div>
              ) : (
                <select
                  className="w-full h-10 px-3 border rounded-md bg-background"
                  value={newBooking.guestId}
                  onChange={(e) => setNewBooking({ ...newBooking, guestId: e.target.value })}
                >
                  <option value="">Select a guest</option>
                  {guestsList.map((guest) => (
                    <option key={guest._id} value={guest._id}>
                      {guest.firstName} {guest.lastName} - {guest.phone}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkInDate">Check-in Date *</Label>
                <Input
                  id="checkInDate"
                  type="date"
                  value={newBooking.checkInDate}
                  onChange={(e) => setNewBooking({ ...newBooking, checkInDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutDate">Check-out Date *</Label>
                <Input
                  id="checkOutDate"
                  type="date"
                  value={newBooking.checkOutDate}
                  min={newBooking.checkInDate}
                  onChange={(e) => setNewBooking({ ...newBooking, checkOutDate: e.target.value })}
                />
              </div>
            </div>

            {/* Occupancy */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adults">Adults</Label>
                <Input
                  id="adults"
                  type="number"
                  min={1}
                  max={10}
                  value={newBooking.adults}
                  onChange={(e) => setNewBooking({ ...newBooking, adults: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="children">Children</Label>
                <Input
                  id="children"
                  type="number"
                  min={0}
                  max={10}
                  value={newBooking.children}
                  onChange={(e) => setNewBooking({ ...newBooking, children: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Channel */}
            <div className="space-y-2">
              <Label htmlFor="channel">Booking Channel</Label>
              <select
                id="channel"
                className="w-full h-10 px-3 border rounded-md bg-background"
                value={newBooking.channel}
                onChange={(e) => setNewBooking({ ...newBooking, channel: e.target.value })}
              >
                <option value="direct">Direct</option>
                <option value="booking.com">Booking.com</option>
                <option value="expedia">Expedia</option>
                <option value="airbnb">Airbnb</option>
                <option value="phone">Phone</option>
                <option value="walk-in">Walk-in</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Special requests or notes..."
                value={newBooking.notes}
                onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
              />
            </div>

            {createBookingMutation.isError && (
              <p className="text-sm text-red-600">
                Failed to create booking. Please check all fields and try again.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBookingMutation.mutate(newBooking)}
              disabled={
                !newBooking.roomTypeId ||
                !newBooking.checkInDate ||
                !newBooking.checkOutDate ||
                (!newBooking.guestId && !newBooking.createNewGuest) ||
                (newBooking.createNewGuest && (!newBooking.newGuest.firstName || !newBooking.newGuest.lastName || !newBooking.newGuest.phone)) ||
                createBookingMutation.isPending
              }
            >
              {createBookingMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={!!paymentBooking} onOpenChange={() => setPaymentBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {paymentBooking && (
                <span>
                  Booking {paymentBooking.bookingCode} - Balance due: {formatCurrency(paymentBooking.balanceDue, paymentBooking.pricing.currency)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-medium">
                  {paymentBooking && formatCurrency(paymentBooking.pricing.grandTotal, paymentBooking.pricing.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Amount Paid:</span>
                <span className="font-medium text-green-600">
                  {paymentBooking && formatCurrency(paymentBooking.amountPaid, paymentBooking.pricing.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t mt-2 pt-2">
                <span>Balance Due:</span>
                <span className="font-bold text-orange-600">
                  {paymentBooking && formatCurrency(paymentBooking.balanceDue, paymentBooking.pricing.currency)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Amount to Pay *</Label>
              <Input
                id="paymentAmount"
                type="number"
                min={1}
                max={paymentBooking?.balanceDue || 0}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <select
                id="paymentMethod"
                className="w-full h-10 px-3 border rounded-md bg-background"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
              >
                <option value="cash">Cash</option>
                <option value="card">Card (POS)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="paystack">Pay Online (Paystack)</option>
              </select>
            </div>

            {paymentForm.method !== 'paystack' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="receiptNumber">Receipt Number</Label>
                  <Input
                    id="receiptNumber"
                    placeholder="Optional receipt/reference number"
                    value={paymentForm.receiptNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentNotes">Notes</Label>
                  <Input
                    id="paymentNotes"
                    placeholder="Optional payment notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
              </>
            )}

            {paymentForm.method === 'paystack' && (
              <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                <p className="font-medium">Online Payment</p>
                <p>You will be redirected to Paystack to complete the payment securely.</p>
              </div>
            )}

            {(recordPaymentMutation.isError || initPaystackMutation.isError) && (
              <p className="text-sm text-red-600">
                Failed to process payment. Please try again.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentBooking(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!paymentBooking) return;

                if (paymentForm.method === 'paystack') {
                  initPaystackMutation.mutate({
                    bookingId: paymentBooking._id,
                    amount: paymentForm.amount,
                  });
                } else {
                  recordPaymentMutation.mutate({
                    bookingId: paymentBooking._id,
                    amount: paymentForm.amount,
                    method: paymentForm.method,
                    receiptNumber: paymentForm.receiptNumber || undefined,
                    notes: paymentForm.notes || undefined,
                  });
                }
              }}
              disabled={
                !paymentForm.amount ||
                paymentForm.amount <= 0 ||
                recordPaymentMutation.isPending ||
                initPaystackMutation.isPending
              }
            >
              {(recordPaymentMutation.isPending || initPaystackMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : paymentForm.method === 'paystack' ? (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Online
                </>
              ) : (
                <>
                  <Banknote className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
