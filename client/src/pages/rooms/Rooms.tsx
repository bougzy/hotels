import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  BedDouble,
  Plus,
  Search,
  Loader2,
} from 'lucide-react';

/**
 * Room Management Page
 *
 * REVENUE IMPACT:
 * - Proper room setup = accurate inventory = more bookings
 * - Visual room status = faster operations = better guest experience
 */

interface RoomType {
  _id: string;
  name: string;
  code: string;
  maxOccupancy: number;
  pricing: {
    basePrice: number;
  };
  totalRooms: number;
}

interface Room {
  _id: string;
  roomNumber: string;
  floor: number;
  status: string;
  housekeepingStatus: string;
  roomType: RoomType;
}

export function RoomsPage() {
  const { hotel } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for new room
  const [newRoom, setNewRoom] = useState({
    roomTypeId: '',
    roomNumber: '',
    floor: 1,
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: (data: { roomTypeId: string; roomNumber: string; floor: number }) =>
      apiClient.post(`/rooms?hotelId=${hotel?._id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['roomSummary'] });
      queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
      setShowAddModal(false);
      setNewRoom({ roomTypeId: '', roomNumber: '', floor: 1 });
    },
  });

  // Fetch room types
  const { data: roomTypesData } = useQuery({
    queryKey: ['roomTypes', hotel?._id],
    queryFn: () => apiClient.get<RoomType[]>(`/rooms/types?hotelId=${hotel?._id}`),
    enabled: !!hotel?._id,
  });

  // Fetch rooms
  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['rooms', hotel?._id, statusFilter],
    queryFn: () => {
      let url = `/rooms?hotelId=${hotel?._id}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      return apiClient.get<Room[]>(url);
    },
    enabled: !!hotel?._id,
  });

  // Fetch room summary
  const { data: summaryData } = useQuery({
    queryKey: ['roomSummary', hotel?._id],
    queryFn: () => apiClient.get<{
      total: number;
      available: number;
      occupied: number;
      cleaning: number;
      maintenance: number;
    }>(`/rooms/summary?hotelId=${hotel?._id}`),
    enabled: !!hotel?._id,
  });

  const roomTypes = roomTypesData?.data || [];
  const rooms = roomsData?.data || [];
  const summary = summaryData?.data;

  // Filter rooms by search
  const filteredRooms = rooms.filter((room) =>
    room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.roomType?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group rooms by floor
  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    const floor = room.floor;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  const statusColors: Record<string, string> = {
    available: 'bg-green-500',
    occupied: 'bg-blue-500',
    reserved: 'bg-purple-500',
    cleaning: 'bg-yellow-500',
    maintenance: 'bg-orange-500',
    blocked: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">
            Manage your room inventory and status
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{summary?.total || 0}</p>
              </div>
              <div className="w-3 h-3 rounded-full bg-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">{summary?.available || 0}</p>
              </div>
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold text-blue-600">{summary?.occupied || 0}</p>
              </div>
              <div className="w-3 h-3 rounded-full bg-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cleaning</p>
                <p className="text-2xl font-bold text-yellow-600">{summary?.cleaning || 0}</p>
              </div>
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold text-orange-600">{summary?.maintenance || 0}</p>
              </div>
              <div className="w-3 h-3 rounded-full bg-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'available', 'occupied', 'cleaning', 'maintenance'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Room Types Overview */}
      {roomTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Room Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roomTypes.map((type) => (
                <div
                  key={type._id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{type.name}</h4>
                    <Badge variant="secondary">{type.code}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Max Occupancy: {type.maxOccupancy}</p>
                    <p>Base Rate: {formatCurrency(type.pricing.basePrice)}</p>
                    <p>Rooms: {type.totalRooms}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rooms Grid by Floor */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BedDouble className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No rooms found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {rooms.length === 0
                ? 'Add your first room to start managing your inventory'
                : 'No rooms match your search criteria'}
            </p>
            {rooms.length === 0 && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(roomsByFloor)
            .sort((a, b) => Number(a) - Number(b))
            .map((floor) => (
              <Card key={floor}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Floor {floor}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {roomsByFloor[Number(floor)].map((room) => (
                      <button
                        key={room._id}
                        className={cn(
                          'relative p-4 rounded-lg border-2 transition-all hover:shadow-md text-left',
                          room.status === 'available' && 'border-green-200 bg-green-50',
                          room.status === 'occupied' && 'border-blue-200 bg-blue-50',
                          room.status === 'reserved' && 'border-purple-200 bg-purple-50',
                          room.status === 'cleaning' && 'border-yellow-200 bg-yellow-50',
                          room.status === 'maintenance' && 'border-orange-200 bg-orange-50',
                          room.status === 'blocked' && 'border-red-200 bg-red-50'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold">{room.roomNumber}</span>
                          <div
                            className={cn(
                              'w-2.5 h-2.5 rounded-full',
                              statusColors[room.status]
                            )}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {room.roomType?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize mt-1">
                          {room.status.replace('_', ' ')}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Cleaning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Blocked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Room Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>
              Create a new room in your hotel inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roomType">Room Type</Label>
              <select
                id="roomType"
                className="w-full h-10 px-3 border rounded-md"
                value={newRoom.roomTypeId}
                onChange={(e) => setNewRoom({ ...newRoom, roomTypeId: e.target.value })}
              >
                <option value="">Select a room type</option>
                {roomTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name} ({type.code})
                  </option>
                ))}
              </select>
              {roomTypes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No room types found. Please create a room type first.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Number</Label>
              <Input
                id="roomNumber"
                placeholder="e.g., 101, 102A"
                value={newRoom.roomNumber}
                onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                type="number"
                min={0}
                max={100}
                value={newRoom.floor}
                onChange={(e) => setNewRoom({ ...newRoom, floor: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRoomMutation.mutate(newRoom)}
              disabled={!newRoom.roomTypeId || !newRoom.roomNumber || createRoomMutation.isPending}
            >
              {createRoomMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
