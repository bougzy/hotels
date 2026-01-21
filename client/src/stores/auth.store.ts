import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api';

/**
 * Authentication Store
 *
 * Manages user session, hotel context, and auth state.
 * Persisted to localStorage for session continuity.
 */

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  hotels: Array<{
    hotelId: string;
    role: string;
    isDefault: boolean;
  }>;
}

interface Hotel {
  _id: string;
  name: string;
  code: string;
  slug: string;
  subscription: {
    tier: string;
    status: string;
  };
}

interface AuthState {
  user: User | null;
  hotel: Hotel | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  setHotel: (hotel: Hotel) => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  hotelName: string;
  hotelPhone: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hotel: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post<{
            user: User;
            hotel?: Hotel;
            tokens: {
              accessToken: string;
              refreshToken: string;
            };
          }>('/auth/login', { email, password });

          const { user, hotel, tokens } = response.data!;

          // Store tokens
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);

          if (hotel) {
            localStorage.setItem('currentHotelId', hotel._id);
          }

          set({
            user,
            hotel: hotel || null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post<{
            user: User;
            hotel: Hotel;
            tokens: {
              accessToken: string;
              refreshToken: string;
            };
          }>('/auth/register', data);

          const { user, hotel, tokens } = response.data!;

          // Store tokens
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          localStorage.setItem('currentHotelId', hotel._id);

          set({
            user,
            hotel,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentHotelId');

        set({
          user: null,
          hotel: null,
          isAuthenticated: false,
        });
      },

      setHotel: (hotel: Hotel) => {
        localStorage.setItem('currentHotelId', hotel._id);
        set({ hotel });
      },

      refreshUser: async () => {
        try {
          const response = await apiClient.get<User>('/auth/me');
          set({ user: response.data! });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'hhos-auth',
      partialize: (state) => ({
        user: state.user,
        hotel: state.hotel,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
