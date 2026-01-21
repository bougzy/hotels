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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Loader2,
  Plus,
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  Star,
  Ban,
} from 'lucide-react';

/**
 * Guest Management Page
 *
 * REVENUE IMPACT:
 * - Guest history = personalized service = repeat bookings
 * - VIP tracking = better treatment = loyalty
 * - Blacklist = protect from bad actors
 */

interface Guest {
  _id: string;
  guestCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
  };
  stats: {
    totalBookings: number;
    totalSpent: number;
    lastVisit?: string;
    averageStay: number;
  };
  preferences?: {
    roomType?: string;
    floorPreference?: string;
    specialRequests?: string[];
  };
  tags: string[];
  isVip: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  createdAt: string;
}

export function GuestsPage() {
  const { hotel } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'vip' | 'blacklisted'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New guest form state
  const [newGuest, setNewGuest] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    nationality: '',
    idType: '',
    idNumber: '',
    address: {
      street: '',
      city: '',
      country: '',
    },
  });

  // Create guest mutation
  const createGuestMutation = useMutation({
    mutationFn: (data: typeof newGuest) =>
      apiClient.post(`/guests?hotelId=${hotel?._id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setShowAddModal(false);
      setNewGuest({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        nationality: '',
        idType: '',
        idNumber: '',
        address: { street: '', city: '', country: '' },
      });
    },
  });

  // Fetch guests
  const { data: guestsData, isLoading } = useQuery({
    queryKey: ['guests', hotel?._id, filter, searchQuery],
    queryFn: () => {
      let url = `/guests?hotelId=${hotel?._id}`;
      if (filter === 'vip') url += '&isVip=true';
      if (filter === 'blacklisted') url += '&isBlacklisted=true';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      return apiClient.get<{ guests: Guest[]; pagination: any }>(url);
    },
    enabled: !!hotel?._id,
  });

  const guests = guestsData?.data?.guests || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guests</h1>
          <p className="text-muted-foreground">
            Manage your guest database and history
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guests by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Guests
          </Button>
          <Button
            variant={filter === 'vip' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('vip')}
          >
            <Star className="h-4 w-4 mr-1" />
            VIP
          </Button>
          <Button
            variant={filter === 'blacklisted' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('blacklisted')}
          >
            <Ban className="h-4 w-4 mr-1" />
            Blacklisted
          </Button>
        </div>
      </div>

      {/* Guests List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No guests found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? 'No guests match your search criteria'
                : 'Guests will appear here when bookings are made'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {guests.map((guest) => (
            <Card
              key={guest._id}
              className={cn(
                'hover:shadow-md transition-shadow cursor-pointer',
                guest.isBlacklisted && 'border-red-200 bg-red-50/50',
                guest.isVip && !guest.isBlacklisted && 'border-yellow-200 bg-yellow-50/50'
              )}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'h-12 w-12 rounded-full flex items-center justify-center',
                        guest.isVip ? 'bg-yellow-100' : 'bg-primary/10'
                      )}
                    >
                      {guest.isVip ? (
                        <Star className="h-6 w-6 text-yellow-600" />
                      ) : (
                        <span className="text-lg font-medium text-primary">
                          {guest.firstName?.[0]}{guest.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {guest.firstName} {guest.lastName}
                        </h3>
                        {guest.isVip && (
                          <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>
                        )}
                        {guest.isBlacklisted && (
                          <Badge variant="destructive">Blacklisted</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {guest.guestCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {guest.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{guest.phone}</span>
                      </div>
                    )}
                    {guest.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{guest.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{guest.stats?.totalBookings || 0}</p>
                      <p className="text-muted-foreground">Bookings</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{formatCurrency(guest.stats?.totalSpent || 0)}</p>
                      <p className="text-muted-foreground">Total Spent</p>
                    </div>
                    {guest.stats?.lastVisit && (
                      <div className="text-center hidden md:block">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">
                            {new Date(guest.stats.lastVisit).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-muted-foreground">Last Visit</p>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>

                {guest.isBlacklisted && guest.blacklistReason && (
                  <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                    <strong>Blacklist Reason:</strong> {guest.blacklistReason}
                  </div>
                )}

                {guest.tags && guest.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {guest.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Guest Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Guest</DialogTitle>
            <DialogDescription>
              Create a new guest profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newGuest.firstName}
                  onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newGuest.lastName}
                  onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                placeholder="+1234567890"
                value={newGuest.phone}
                onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={newGuest.dateOfBirth}
                  onChange={(e) => setNewGuest({ ...newGuest, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  placeholder="e.g., American"
                  value={newGuest.nationality}
                  onChange={(e) => setNewGuest({ ...newGuest, nationality: e.target.value })}
                />
              </div>
            </div>

            {/* ID Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idType">ID Type</Label>
                <select
                  id="idType"
                  className="w-full h-10 px-3 border rounded-md bg-background"
                  value={newGuest.idType}
                  onChange={(e) => setNewGuest({ ...newGuest, idType: e.target.value })}
                >
                  <option value="">Select ID type</option>
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID</option>
                  <option value="drivers_license">Driver's License</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number</Label>
                <Input
                  id="idNumber"
                  placeholder="ID number"
                  value={newGuest.idNumber}
                  onChange={(e) => setNewGuest({ ...newGuest, idNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Address (optional)</Label>
              <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="street" className="text-xs">Street</Label>
                  <Input
                    id="street"
                    placeholder="123 Main St"
                    value={newGuest.address.street}
                    onChange={(e) => setNewGuest({
                      ...newGuest,
                      address: { ...newGuest.address, street: e.target.value }
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-xs">City</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={newGuest.address.city}
                      onChange={(e) => setNewGuest({
                        ...newGuest,
                        address: { ...newGuest.address, city: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-xs">Country</Label>
                    <Input
                      id="country"
                      placeholder="USA"
                      value={newGuest.address.country}
                      onChange={(e) => setNewGuest({
                        ...newGuest,
                        address: { ...newGuest.address, country: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {createGuestMutation.isError && (
              <p className="text-sm text-red-600">
                Failed to create guest. Please check all fields and try again.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createGuestMutation.mutate(newGuest)}
              disabled={
                !newGuest.firstName ||
                !newGuest.lastName ||
                !newGuest.phone ||
                createGuestMutation.isPending
              }
            >
              {createGuestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Guest'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
