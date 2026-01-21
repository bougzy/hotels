import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

// Layouts
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Auth pages
import { LoginPage } from '@/pages/auth/Login';
import { RegisterPage } from '@/pages/auth/Register';

// Dashboard pages
import { DashboardPage } from '@/pages/dashboard/Dashboard';
import { BookingsPage } from '@/pages/bookings/Bookings';
import { RoomsPage } from '@/pages/rooms/Rooms';
import { GuestsPage } from '@/pages/guests/Guests';
import { SettingsPage } from '@/pages/settings/Settings';
import { ReportsPage } from '@/pages/reports/Reports';

// Public pages
import { BookingWidgetPage } from '@/pages/booking-widget/BookingWidget';
import { PaymentCallbackPage } from '@/pages/payment/PaymentCallback';

/**
 * Main App Router
 *
 * Handles routing and authentication guards.
 * Protected routes require authentication.
 */

// Auth guard component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Guest guard (redirect to dashboard if already logged in)
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />

        {/* Public booking widget - NO AUTH REQUIRED (this is how hotels get direct bookings!) */}
        <Route path="/book/:slug" element={<BookingWidgetPage />} />

        {/* Payment callback - handles Paystack redirect */}
        <Route path="/payment/callback" element={<PaymentCallbackPage />} />

        {/* Protected dashboard routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="guests" element={<GuestsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
