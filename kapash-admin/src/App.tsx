import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PitchesPendingPage } from './pages/PitchesPendingPage';
import { PitchesAllPage } from './pages/PitchesAllPage';
import { PitchDetailPage } from './pages/PitchDetailPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { UserFormPage } from './pages/UserFormPage';
import { BookingsPage } from './pages/BookingsPage';
import { BookingDetailPage } from './pages/BookingDetailPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { BroadcastsPage } from './pages/BroadcastsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { AmenitiesPage } from './pages/AmenitiesPage';
import { AdminsPage } from './pages/AdminsPage';
import { CorporatesPage } from './pages/CorporatesPage';
import { CorporateDetailPage } from './pages/CorporateDetailPage';
import { CorporateFormPage } from './pages/CorporateFormPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailPage } from './pages/InvoiceDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { PitchFormPage } from './pages/PitchFormPage';
import { BookingFormPage } from './pages/BookingFormPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index                       element={<DashboardPage />} />
              <Route path="analytics"            element={<AnalyticsPage />} />

              <Route path="pitches/pending"      element={<PitchesPendingPage />} />
              <Route path="pitches"              element={<PitchesAllPage />} />
              <Route path="pitches/new"          element={<PitchFormPage />} />
              <Route path="pitches/:id"          element={<PitchDetailPage />} />
              <Route path="pitches/:id/edit"     element={<PitchFormPage />} />

              <Route path="users"                element={<UsersPage />} />
              <Route path="users/new"            element={<UserFormPage />} />
              <Route path="users/:id"            element={<UserDetailPage />} />
              <Route path="users/:id/edit"       element={<UserFormPage />} />

              <Route path="bookings"             element={<BookingsPage />} />
              <Route path="bookings/new"         element={<BookingFormPage />} />
              <Route path="bookings/:id"         element={<BookingDetailPage />} />

              <Route path="payouts"              element={<PayoutsPage />} />
              <Route path="reviews"              element={<ReviewsPage />} />
              <Route path="broadcasts"           element={<BroadcastsPage />} />
              <Route path="audit-log"            element={<AuditLogPage />} />
              <Route path="settings"             element={<SettingsPage />} />

              <Route path="amenities"            element={<AmenitiesPage />} />
              <Route path="admins"               element={<AdminsPage />} />

              <Route path="corporates"           element={<CorporatesPage />} />
              <Route path="corporates/new"       element={<CorporateFormPage />} />
              <Route path="corporates/:id"       element={<CorporateDetailPage />} />
              <Route path="corporates/:id/edit"  element={<CorporateFormPage />} />

              <Route path="events"               element={<EventsPage />} />
              <Route path="events/:id"           element={<EventDetailPage />} />

              <Route path="invoices"             element={<InvoicesPage />} />
              <Route path="invoices/:id"         element={<InvoiceDetailPage />} />

              <Route path="reports"              element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
