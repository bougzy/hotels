import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { formatCurrency, calculateNights, cn } from '@/lib/utils';
import {
  BedDouble,
  Check,
  Loader2,
  Hotel,
} from 'lucide-react';

/**
 * Public Booking Widget
 *
 * This is the DIRECT REVENUE channel - every booking here
 * saves the hotel 15-30% in OTA commissions!
 *
 * REVENUE IMPACT:
 * - Direct bookings = no OTA commission
 * - Simple flow = higher conversion
 * - Mobile-first = captures more bookings
 */

interface RoomAvailability {
  roomTypeId: string;
  roomTypeName: string;
  available: number;
  rate: number;
  totalPrice: number;
  nights: number;
}

// HotelInfo interface will be used when public hotel endpoint is implemented
// interface HotelInfo {
//   _id: string;
//   name: string;
//   slug: string;
//   contact: { phone: string; email: string; address: {...} };
//   branding: { logo?: string; primaryColor: string; description?: string };
//   settings: { currency: string; checkInTime: string; checkOutTime: string };
// }

type Step = 'dates' | 'rooms' | 'guest' | 'confirm' | 'success';

export function BookingWidgetPage() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<Step>('dates');

  // Form state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<RoomAvailability | null>(null);

  // Guest info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Booking result
  const [bookingResult, setBookingResult] = useState<{
    confirmationCode: string;
    bookingCode: string;
  } | null>(null);

  // Fetch hotel info by slug
  // Will be used when public hotel endpoint is implemented
  useQuery({
    queryKey: ['hotelBySlug', slug],
    queryFn: async () => {
      // In real implementation, would have a public endpoint to get hotel by slug
      // For now, we'll show a placeholder
      return null;
    },
    enabled: !!slug,
  });

  // Check availability
  const {
    data: availabilityData,
    isLoading: availabilityLoading,
    refetch: checkAvailability,
  } = useQuery({
    queryKey: ['availability', checkIn, checkOut, adults, children],
    queryFn: () =>
      apiClient.get<RoomAvailability[]>(
        `/bookings/availability?hotelId=HOTEL_ID&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`
      ),
    enabled: false,
  });

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: (data: any) => apiClient.post('/bookings/public', data),
    onSuccess: (response: any) => {
      setBookingResult({
        confirmationCode: response.data.confirmationCode,
        bookingCode: response.data.bookingCode,
      });
      setStep('success');
    },
  });

  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;
  const availability = availabilityData?.data || [];

  const handleSearchAvailability = () => {
    if (checkIn && checkOut) {
      checkAvailability();
      setStep('rooms');
    }
  };

  const handleSelectRoom = (room: RoomAvailability) => {
    setSelectedRoom(room);
    setStep('guest');
  };

  const handleSubmitBooking = () => {
    setStep('confirm');
  };

  const handleConfirmBooking = () => {
    createBooking.mutate({
      hotelId: 'HOTEL_ID', // Would come from hotelData
      roomTypeId: selectedRoom?.roomTypeId,
      checkIn,
      checkOut,
      adults,
      children,
      guest: {
        firstName,
        lastName,
        email,
        phone,
      },
      specialRequests,
    });
  };

  // Success screen
  if (step === 'success' && bookingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-100 rounded-full">
                <Check className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Confirmation Code</p>
              <p className="text-2xl font-bold font-mono">{bookingResult.confirmationCode}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              A confirmation has been sent to your email/phone. Please save your confirmation code.
            </p>

            <div className="text-left space-y-2 p-4 border rounded-lg">
              <p><strong>Check-in:</strong> {checkIn}</p>
              <p><strong>Check-out:</strong> {checkOut}</p>
              <p><strong>Room:</strong> {selectedRoom?.roomTypeName}</p>
              <p><strong>Total:</strong> {formatCurrency(selectedRoom?.totalPrice || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Hotel className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold">Hotel Name</h1>
              <p className="text-xs text-muted-foreground">Book your stay</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b py-4">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2">
            {['dates', 'rooms', 'guest', 'confirm'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    step === s || ['rooms', 'guest', 'confirm'].indexOf(step) > ['dates', 'rooms', 'guest', 'confirm'].indexOf(s)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div className="w-12 h-0.5 bg-muted mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Step 1: Dates */}
        {step === 'dates' && (
          <Card>
            <CardHeader>
              <CardTitle>Select Your Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkIn">Check-in Date</Label>
                  <Input
                    id="checkIn"
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOut">Check-out Date</Label>
                  <Input
                    id="checkOut"
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adults">Adults</Label>
                  <Input
                    id="adults"
                    type="number"
                    min={1}
                    max={10}
                    value={adults}
                    onChange={(e) => setAdults(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min={0}
                    max={10}
                    value={children}
                    onChange={(e) => setChildren(parseInt(e.target.value))}
                  />
                </div>
              </div>

              {nights > 0 && (
                <p className="text-center text-muted-foreground">
                  {nights} night{nights > 1 ? 's' : ''}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSearchAvailability}
                disabled={!checkIn || !checkOut}
              >
                Search Availability
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Room Selection */}
        {step === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Available Rooms</h2>
              <Button variant="outline" size="sm" onClick={() => setStep('dates')}>
                Change Dates
              </Button>
            </div>

            {availabilityLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
              </Card>
            ) : availability.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BedDouble className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold">No rooms available</h3>
                  <p className="text-muted-foreground">Try different dates</p>
                </CardContent>
              </Card>
            ) : (
              availability.map((room) => (
                <Card key={room.roomTypeId}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{room.roomTypeName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {room.available} room{room.available > 1 ? 's' : ''} left
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(room.rate)} / night
                        </p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(room.totalPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total for {room.nights} nights
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={() => handleSelectRoom(room)}
                    >
                      Select Room
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Step 3: Guest Information */}
        {step === 'guest' && selectedRoom && (
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Guest Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requests">Special Requests</Label>
                  <textarea
                    id="requests"
                    className="w-full p-3 border rounded-md text-sm"
                    rows={3}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requests?"
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmitBooking}
                  disabled={!firstName || !lastName || !phone}
                >
                  Continue to Review
                </Button>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room</span>
                    <span className="font-medium">{selectedRoom.roomTypeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in</span>
                    <span>{checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out</span>
                    <span>{checkOut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nights</span>
                    <span>{selectedRoom.nights}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Guests</span>
                    <span>{adults} Adults, {children} Children</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedRoom.totalPrice)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && selectedRoom && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Confirm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Booking Details</h4>
                  <div className="space-y-1 text-sm">
                    <p>{selectedRoom.roomTypeName}</p>
                    <p>{checkIn} to {checkOut}</p>
                    <p>{selectedRoom.nights} nights</p>
                    <p>{adults} Adults, {children} Children</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Guest Details</h4>
                  <div className="space-y-1 text-sm">
                    <p>{firstName} {lastName}</p>
                    <p>{phone}</p>
                    <p>{email || 'No email provided'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total Amount</span>
                  <span>{formatCurrency(selectedRoom.totalPrice)}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep('guest')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleConfirmBooking}
                  loading={createBooking.isPending}
                >
                  Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>Powered by HHOS - Hotel Operating System</p>
        </div>
      </footer>
    </div>
  );
}
