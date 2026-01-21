import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  Building,
  Clock,
  CreditCard,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Users,
} from 'lucide-react';

/**
 * Hotel Settings Page
 *
 * Manage hotel configuration, branding, and operational settings.
 *
 * REVENUE IMPACT:
 * - Correct settings = proper pricing = accurate revenue
 * - Good branding = professional image = more bookings
 */

interface HotelSettings {
  _id: string;
  name: string;
  code: string;
  slug: string;
  type: string;
  starRating: number;
  contact: {
    phone: string;
    email: string;
    website?: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode?: string;
    };
  };
  settings: {
    currency: string;
    timezone: string;
    checkInTime: string;
    checkOutTime: string;
    taxRate: number;
  };
  branding: {
    logo?: string;
    primaryColor: string;
    description?: string;
  };
  policies: {
    cancellationHours: number;
    depositPercentage: number;
    allowChildren: boolean;
    allowPets: boolean;
  };
}

interface StaffMember {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  addedAt: string;
}

export function SettingsPage() {
  const { hotel, setHotel } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');

  // Fetch hotel settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['hotelSettings', hotel?._id],
    queryFn: () => apiClient.get<HotelSettings>(`/hotels/${hotel?._id}?hotelId=${hotel?._id}`),
    enabled: !!hotel?._id,
  });

  // Fetch staff
  const { data: staffData } = useQuery({
    queryKey: ['staff', hotel?._id],
    queryFn: () => apiClient.get<StaffMember[]>(`/hotels/${hotel?._id}/staff?hotelId=${hotel?._id}`),
    enabled: !!hotel?._id,
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: (data: Partial<HotelSettings>) =>
      apiClient.put(`/hotels/${hotel?._id}?hotelId=${hotel?._id}`, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['hotelSettings', hotel?._id] });
      // Update the auth store with new hotel data
      if (response.data) {
        setHotel(response.data);
      }
    },
  });

  const settings = settingsData?.data;
  const staff = staffData?.data || [];

  // Form states
  const [generalForm, setGeneralForm] = useState({
    name: '',
    type: '',
    starRating: 0,
  });

  const [contactForm, setContactForm] = useState({
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  });

  const [operationalForm, setOperationalForm] = useState({
    currency: '',
    timezone: '',
    checkInTime: '',
    checkOutTime: '',
    taxRate: 0,
  });

  const [policyForm, setPolicyForm] = useState({
    cancellationHours: 24,
    depositPercentage: 0,
    allowChildren: true,
    allowPets: false,
  });

  // Initialize forms when settings load
  useState(() => {
    if (settings) {
      setGeneralForm({
        name: settings.name,
        type: settings.type,
        starRating: settings.starRating,
      });
      setContactForm({
        phone: settings.contact?.phone || '',
        email: settings.contact?.email || '',
        website: settings.contact?.website || '',
        street: settings.contact?.address?.street || '',
        city: settings.contact?.address?.city || '',
        state: settings.contact?.address?.state || '',
        country: settings.contact?.address?.country || '',
        postalCode: settings.contact?.address?.postalCode || '',
      });
      setOperationalForm({
        currency: settings.settings?.currency || 'NGN',
        timezone: settings.settings?.timezone || 'Africa/Lagos',
        checkInTime: settings.settings?.checkInTime || '14:00',
        checkOutTime: settings.settings?.checkOutTime || '11:00',
        taxRate: settings.settings?.taxRate || 7.5,
      });
      setPolicyForm({
        cancellationHours: settings.policies?.cancellationHours || 24,
        depositPercentage: settings.policies?.depositPercentage || 0,
        allowChildren: settings.policies?.allowChildren ?? true,
        allowPets: settings.policies?.allowPets ?? false,
      });
    }
  });

  const handleSaveGeneral = () => {
    updateSettings.mutate({
      name: generalForm.name,
      type: generalForm.type,
      starRating: generalForm.starRating,
    } as any);
  };

  const handleSaveContact = () => {
    updateSettings.mutate({
      contact: {
        phone: contactForm.phone,
        email: contactForm.email,
        website: contactForm.website,
        address: {
          street: contactForm.street,
          city: contactForm.city,
          state: contactForm.state,
          country: contactForm.country,
          postalCode: contactForm.postalCode,
        },
      },
    } as any);
  };

  const handleSaveOperational = () => {
    updateSettings.mutate({
      settings: {
        currency: operationalForm.currency,
        timezone: operationalForm.timezone,
        checkInTime: operationalForm.checkInTime,
        checkOutTime: operationalForm.checkOutTime,
        taxRate: operationalForm.taxRate,
      },
    } as any);
  };

  const handleSavePolicies = () => {
    updateSettings.mutate({
      policies: {
        cancellationHours: policyForm.cancellationHours,
        depositPercentage: policyForm.depositPercentage,
        allowChildren: policyForm.allowChildren,
        allowPets: policyForm.allowPets,
      },
    } as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your hotel configuration and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="operational">Operations</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Hotel Information
              </CardTitle>
              <CardDescription>
                Basic information about your hotel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hotelName">Hotel Name</Label>
                  <Input
                    id="hotelName"
                    value={generalForm.name || settings?.name || ''}
                    onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hotelCode">Hotel Code</Label>
                  <Input
                    id="hotelCode"
                    value={settings?.code || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hotelType">Property Type</Label>
                  <select
                    id="hotelType"
                    className="w-full h-10 px-3 border rounded-md"
                    value={generalForm.type || settings?.type || ''}
                    onChange={(e) => setGeneralForm({ ...generalForm, type: e.target.value })}
                  >
                    <option value="hotel">Hotel</option>
                    <option value="resort">Resort</option>
                    <option value="motel">Motel</option>
                    <option value="guesthouse">Guesthouse</option>
                    <option value="boutique">Boutique Hotel</option>
                    <option value="apartment">Serviced Apartment</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starRating">Star Rating</Label>
                  <select
                    id="starRating"
                    className="w-full h-10 px-3 border rounded-md"
                    value={generalForm.starRating || settings?.starRating || 0}
                    onChange={(e) => setGeneralForm({ ...generalForm, starRating: parseInt(e.target.value) })}
                  >
                    {[0, 1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating === 0 ? 'Not Rated' : `${rating} Star${rating > 1 ? 's' : ''}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bookingUrl">Direct Booking URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="bookingUrl"
                    value={`${window.location.origin}/book/${settings?.slug || ''}`}
                    disabled
                    className="bg-muted"
                  />
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/book/${settings?.slug || ''}`)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link for direct bookings (no OTA commission!)
                </p>
              </div>

              <Button onClick={handleSaveGeneral} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Settings */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                How guests and staff can reach you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      className="pl-10"
                      value={contactForm.phone || settings?.contact?.phone || ''}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={contactForm.email || settings?.contact?.email || ''}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    className="pl-10"
                    placeholder="https://..."
                    value={contactForm.website || settings?.contact?.website || ''}
                    onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-4">
                  <MapPin className="h-4 w-4" />
                  Address
                </h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={contactForm.street || settings?.contact?.address?.street || ''}
                      onChange={(e) => setContactForm({ ...contactForm, street: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={contactForm.city || settings?.contact?.address?.city || ''}
                        onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Region</Label>
                      <Input
                        id="state"
                        value={contactForm.state || settings?.contact?.address?.state || ''}
                        onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={contactForm.country || settings?.contact?.address?.country || ''}
                        onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={contactForm.postalCode || settings?.contact?.address?.postalCode || ''}
                        onChange={(e) => setContactForm({ ...contactForm, postalCode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveContact} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operational Settings */}
        <TabsContent value="operational" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operational Settings
              </CardTitle>
              <CardDescription>
                Configure check-in/out times, currency, and taxes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="checkInTime">Check-in Time</Label>
                  <Input
                    id="checkInTime"
                    type="time"
                    value={operationalForm.checkInTime || settings?.settings?.checkInTime || '14:00'}
                    onChange={(e) => setOperationalForm({ ...operationalForm, checkInTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOutTime">Check-out Time</Label>
                  <Input
                    id="checkOutTime"
                    type="time"
                    value={operationalForm.checkOutTime || settings?.settings?.checkOutTime || '11:00'}
                    onChange={(e) => setOperationalForm({ ...operationalForm, checkOutTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    className="w-full h-10 px-3 border rounded-md"
                    value={operationalForm.currency || settings?.settings?.currency || 'NGN'}
                    onChange={(e) => setOperationalForm({ ...operationalForm, currency: e.target.value })}
                  >
                    <option value="NGN">Nigerian Naira (NGN)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                    <option value="GHS">Ghanaian Cedi (GHS)</option>
                    <option value="KES">Kenyan Shilling (KES)</option>
                    <option value="ZAR">South African Rand (ZAR)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    className="w-full h-10 px-3 border rounded-md"
                    value={operationalForm.timezone || settings?.settings?.timezone || 'Africa/Lagos'}
                    onChange={(e) => setOperationalForm({ ...operationalForm, timezone: e.target.value })}
                  >
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Africa/Accra">Africa/Accra (GMT)</option>
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={operationalForm.taxRate || settings?.settings?.taxRate || 7.5}
                  onChange={(e) => setOperationalForm({ ...operationalForm, taxRate: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  This tax rate will be applied to all bookings
                </p>
              </div>

              <Button onClick={handleSaveOperational} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Booking Policies
              </CardTitle>
              <CardDescription>
                Configure cancellation and deposit policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cancellationHours">Cancellation Window (hours)</Label>
                  <Input
                    id="cancellationHours"
                    type="number"
                    min="0"
                    value={policyForm.cancellationHours}
                    onChange={(e) => setPolicyForm({ ...policyForm, cancellationHours: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hours before check-in when free cancellation ends
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depositPercentage">Deposit Required (%)</Label>
                  <Input
                    id="depositPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={policyForm.depositPercentage}
                    onChange={(e) => setPolicyForm({ ...policyForm, depositPercentage: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of total to collect as deposit
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Allow Children</p>
                    <p className="text-sm text-muted-foreground">Accept bookings with children</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyForm.allowChildren}
                      onChange={(e) => setPolicyForm({ ...policyForm, allowChildren: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Allow Pets</p>
                    <p className="text-sm text-muted-foreground">Accept bookings with pets</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyForm.allowPets}
                      onChange={(e) => setPolicyForm({ ...policyForm, allowPets: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              <Button onClick={handleSavePolicies} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Management */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Members
              </CardTitle>
              <CardDescription>
                Manage your hotel staff and their access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold">No staff members yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add staff members to help manage your hotel
                  </p>
                  <Button>Add Staff Member</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {staff.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded capitalize">
                          {member.role}
                        </span>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button className="w-full" variant="outline">
                    Add Staff Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
