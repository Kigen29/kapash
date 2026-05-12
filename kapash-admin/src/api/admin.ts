import { api, unwrap } from './client';
import type {
  AdminStats, AdminAnalytics, AdminPitch, AdminUser, AdminBooking, AdminPayout, AdminReview,
  AuditLogEntry, Corporate, BookingEvent, Invoice, Amenity,
  PitchStatus, BookingStatus, PayoutStatus, InvoiceStatus, EventStatus, UserRole, AdminTier,
} from './types';

export const AUTH = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
  devLogin: (role: UserRole, adminTier?: AdminTier) =>
    api.post('/auth/dev-login', { role, ...(adminTier && { adminTier }) }),
  me: () => api.get('/users/me'),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

export const ADMIN = {
  stats: () => api.get('/admin/stats').then(r => unwrap<AdminStats>(r.data)),
  analytics: (params: { period?: number; groupBy?: 'day' | 'week' | 'month'; compareTo?: 'previousPeriod'; corporateId?: string; pitchType?: string; city?: string } = {}) =>
    api.get('/admin/analytics', { params }).then(r => unwrap<AdminAnalytics>(r.data)),

  pitches: {
    list: (params: { status?: PitchStatus; type?: string; ownerId?: string; search?: string; page?: number; limit?: number } = {}) =>
      api.get('/admin/pitches', { params }).then(r => unwrap<{ pitches: AdminPitch[]; total: number }>(r.data)),
    listPending: () => api.get('/admin/pitches/pending').then(r => unwrap<AdminPitch[]>(r.data)),
    get: (id: string) => api.get(`/admin/pitches/${id}`).then(r => unwrap<AdminPitch>(r.data)),
    verify: (id: string, action: 'approve' | 'reject', reason?: string) =>
      api.patch(`/admin/pitches/${id}/verify`, { action, reason }).then(r => unwrap<AdminPitch>(r.data)),
    setStatus: (id: string, status: PitchStatus, reason?: string) =>
      api.patch(`/admin/pitches/${id}/status`, { status, reason }).then(r => unwrap<AdminPitch>(r.data)),
    create: (body: any) => api.post('/admin/pitches', body).then(r => unwrap<AdminPitch>(r.data)),
    update: (id: string, body: any) => api.patch(`/admin/pitches/${id}`, body).then(r => unwrap<AdminPitch>(r.data)),
    delete: (id: string) => api.delete(`/admin/pitches/${id}`).then(r => unwrap(r.data)),
  },

  users: {
    list: (params: { role?: UserRole; search?: string; isActive?: boolean; page?: number; limit?: number } = {}) =>
      api.get('/admin/users', { params }).then(r => unwrap<{ users: AdminUser[]; total: number }>(r.data)),
    get: (id: string) => api.get(`/admin/users/${id}`).then(r => unwrap<AdminUser>(r.data)),
    create: (body: { name: string; phone: string; email?: string; role: UserRole; adminTier?: AdminTier }) =>
      api.post('/admin/users', body).then(r => unwrap<AdminUser>(r.data)),
    update: (id: string, body: { name?: string; phone?: string; email?: string | null }) =>
      api.patch(`/admin/users/${id}`, body).then(r => unwrap<AdminUser>(r.data)),
    delete: (id: string) => api.delete(`/admin/users/${id}`).then(r => unwrap(r.data)),
    deactivate: (id: string) => api.patch(`/admin/users/${id}/deactivate`).then(r => unwrap(r.data)),
    activate: (id: string) => api.patch(`/admin/users/${id}/activate`).then(r => unwrap(r.data)),
    setTier: (id: string, adminTier: AdminTier | null) =>
      api.patch(`/admin/users/${id}/tier`, { adminTier }).then(r => unwrap(r.data)),
  },

  bookings: {
    list: (params: { status?: BookingStatus; userId?: string; pitchId?: string; from?: string; to?: string; page?: number; limit?: number } = {}) =>
      api.get('/admin/bookings', { params }).then(r => unwrap<{ bookings: AdminBooking[]; total: number }>(r.data)),
    get: (id: string) => api.get(`/admin/bookings/${id}`).then(r => unwrap<AdminBooking>(r.data)),
    create: (body: { userId: string; pitchId: string; date: string; startTime: string; endTime: string; totalAmount?: number; notes?: string }) =>
      api.post('/admin/bookings', body).then(r => unwrap<AdminBooking>(r.data)),
    cancel: (id: string, reason?: string) =>
      api.patch(`/admin/bookings/${id}/cancel`, { reason }).then(r => unwrap(r.data)),
    refund: (id: string) => api.post(`/admin/bookings/${id}/refund`).then(r => unwrap(r.data)),
  },

  payouts: {
    list: (params: { status?: PayoutStatus; ownerId?: string; page?: number; limit?: number } = {}) =>
      api.get('/admin/payouts', { params }).then(r => unwrap<{ payouts: AdminPayout[]; total: number }>(r.data)),
    process: (id: string) => api.patch(`/admin/payouts/${id}/process`).then(r => unwrap(r.data)),
    complete: (id: string, mpesaTransactionId: string) =>
      api.patch(`/admin/payouts/${id}/complete`, { mpesaTransactionId }).then(r => unwrap(r.data)),
    fail: (id: string, reason: string) => api.patch(`/admin/payouts/${id}/fail`, { reason }).then(r => unwrap(r.data)),
  },

  reviews: {
    list: (params: { pitchId?: string; userId?: string; isVisible?: boolean; minRating?: number; maxRating?: number; page?: number; limit?: number } = {}) =>
      api.get('/admin/reviews', { params }).then(r => unwrap<{ reviews: AdminReview[]; total: number }>(r.data)),
    setVisible: (id: string, isVisible: boolean) =>
      api.patch(`/admin/reviews/${id}`, { isVisible }).then(r => unwrap(r.data)),
    delete: (id: string) => api.delete(`/admin/reviews/${id}`).then(r => unwrap(r.data)),
  },

  broadcast: (input: {
    audience: { kind: 'all' } | { kind: 'role'; role: UserRole } | { kind: 'users'; userIds: string[] };
    title: string;
    body: string;
  }) => api.post('/admin/notifications/broadcast', input).then(r => unwrap<{ recipients: number; pushDelivered: number }>(r.data)),

  audit: {
    list: (params: { actorId?: string; targetType?: string; action?: string; page?: number; limit?: number } = {}) =>
      api.get('/admin/audit-logs', { params }).then(r => unwrap<{ logs: AuditLogEntry[]; total: number }>(r.data)),
  },

  settings: {
    list: () => api.get('/admin/settings').then(r => unwrap<Record<string, any>>(r.data)),
    update: (key: string, value: any) => api.patch(`/admin/settings/${key}`, { value }).then(r => unwrap(r.data)),
  },

  amenities: {
    list: () => api.get('/admin/amenities').then(r => unwrap<Amenity[]>(r.data)),
    create: (body: { name: string; icon?: string; category?: string }) =>
      api.post('/admin/amenities', body).then(r => unwrap<Amenity>(r.data)),
    update: (id: string, body: Partial<{ name: string; icon: string; category: string | null; isActive: boolean }>) =>
      api.patch(`/admin/amenities/${id}`, body).then(r => unwrap<Amenity>(r.data)),
    delete: (id: string) => api.delete(`/admin/amenities/${id}`).then(r => unwrap(r.data)),
  },

  admins: {
    list: () => api.get('/admin/admins').then(r => unwrap<AdminUser[]>(r.data)),
    create: (body: { name: string; phone: string; email?: string; adminTier: AdminTier }) =>
      api.post('/admin/admins', body).then(r => unwrap<AdminUser>(r.data)),
    demote: (id: string) => api.delete(`/admin/admins/${id}`).then(r => unwrap(r.data)),
  },

  corporates: {
    list: (params: { status?: string; search?: string; page?: number; limit?: number } = {}) =>
      api.get('/admin/corporates', { params }).then(r => unwrap<{ corporates: Corporate[]; total: number }>(r.data)),
    get: (id: string) => api.get(`/admin/corporates/${id}`).then(r => unwrap<Corporate>(r.data)),
    create: (body: Partial<Corporate>) => api.post('/admin/corporates', body).then(r => unwrap<Corporate>(r.data)),
    update: (id: string, body: Partial<Corporate>) =>
      api.patch(`/admin/corporates/${id}`, body).then(r => unwrap<Corporate>(r.data)),
    delete: (id: string) => api.delete(`/admin/corporates/${id}`).then(r => unwrap(r.data)),
    addBooker: (id: string, body: { userId?: string; name?: string; phone?: string; email?: string; isCorpAdmin?: boolean }) =>
      api.post(`/admin/corporates/${id}/bookers`, body).then(r => unwrap<AdminUser>(r.data)),
    removeBooker: (id: string, userId: string) =>
      api.delete(`/admin/corporates/${id}/bookers/${userId}`).then(r => unwrap(r.data)),
  },

  events: {
    list: (params: { status?: EventStatus; corporateId?: string; from?: string; to?: string; page?: number; limit?: number } = {}) =>
      api.get('/admin/events', { params }).then(r => unwrap<{ events: BookingEvent[]; total: number }>(r.data)),
    get: (id: string) => api.get(`/admin/events/${id}`).then(r => unwrap<BookingEvent>(r.data)),
    create: (body: { name: string; date: string; organizerId: string; corporateId?: string | null; notes?: string; bookings: { pitchId: string; startTime: string; endTime: string }[] }) =>
      api.post('/admin/events', body).then(r => unwrap<BookingEvent>(r.data)),
    update: (id: string, body: Partial<BookingEvent>) => api.patch(`/admin/events/${id}`, body).then(r => unwrap<BookingEvent>(r.data)),
    cancel: (id: string) => api.delete(`/admin/events/${id}`).then(r => unwrap(r.data)),
  },

  invoices: {
    list: (params: { status?: InvoiceStatus; corporateId?: string; page?: number; limit?: number } = {}) =>
      api.get('/admin/invoices', { params }).then(r => unwrap<{ invoices: Invoice[]; total: number }>(r.data)),
    get: (id: string) => api.get(`/admin/invoices/${id}`).then(r => unwrap<Invoice>(r.data)),
    create: (body: any) => api.post('/admin/invoices', body).then(r => unwrap<Invoice>(r.data)),
    fromEvent: (eventId: string, dueInDays = 7, taxRate = 0.16) =>
      api.post('/admin/invoices/from-event', { eventId, dueInDays, taxRate }).then(r => unwrap<Invoice>(r.data)),
    update: (id: string, body: any) => api.patch(`/admin/invoices/${id}`, body).then(r => unwrap<Invoice>(r.data)),
    send: (id: string) => api.patch(`/admin/invoices/${id}/send`).then(r => unwrap<Invoice>(r.data)),
    markPaid: (id: string, paymentRef: string) =>
      api.patch(`/admin/invoices/${id}/mark-paid`, { paymentRef }).then(r => unwrap<Invoice>(r.data)),
    void: (id: string) => api.patch(`/admin/invoices/${id}/void`).then(r => unwrap<Invoice>(r.data)),
    pdfUrl: (id: string) => `${api.defaults.baseURL}/admin/invoices/${id}/pdf`,
  },

  reports: {
    bookingsCsv: (from: string, to: string) => downloadCsv(`/admin/reports/bookings.csv?from=${from}&to=${to}`, `bookings_${from}_${to}.csv`),
    payoutsCsv:  (from: string, to: string) => downloadCsv(`/admin/reports/payouts.csv?from=${from}&to=${to}`,  `payouts_${from}_${to}.csv`),
    usersCsv:    (role?: string) => downloadCsv(`/admin/reports/users.csv${role ? `?role=${role}` : ''}`, 'users.csv'),
    revenueCsv:  (from: string, to: string, groupBy: 'day' | 'month' = 'day') =>
      downloadCsv(`/admin/reports/revenue.csv?from=${from}&to=${to}&groupBy=${groupBy}`, `revenue_${groupBy}_${from}_${to}.csv`),
    auditCsv:    (from: string, to: string) => downloadCsv(`/admin/reports/audit-logs.csv?from=${from}&to=${to}`, `audit-logs_${from}_${to}.csv`),
  },
};

async function downloadCsv(path: string, filename: string) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
