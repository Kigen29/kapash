import AsyncStorage from '@react-native-async-storage/async-storage';

// Set EXPO_PUBLIC_API_URL in your .env file (see .env.example)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.64:5000/api/v1';

export const STORAGE_KEYS = {
  ACCESS_TOKEN:  'kapash_access_token',
  REFRESH_TOKEN: 'kapash_refresh_token',
  USER:          'kapash_user',
};

export const TokenStorage = {
  async getAccessToken():  Promise<string | null> { return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN); },
  async getRefreshToken(): Promise<string | null> { return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN); },
  async setTokens(access: string, refresh: string): Promise<void> {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, access],
      [STORAGE_KEYS.REFRESH_TOKEN, refresh],
    ]);
  },
  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  },
};

// ─── FETCH WRAPPER ────────────────────────────────────────────────────────────

// ✅ FIX: Separate body type from RequestInit to allow plain objects
interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: any;
}

let isRefreshing = false;
let refreshQueue: ((token: string) => void)[] = [];

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await TokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (data.data?.accessToken) {
      await TokenStorage.setTokens(data.data.accessToken, data.data.refreshToken || refreshToken);
      return data.data.accessToken;
    }
    return null;
  } catch { return null; }
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {},
  requireAuth = true,
): Promise<{ data: T; status: number }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    const token = await TokenStorage.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  // ✅ Serialize body if it's a plain object
  const body: BodyInit | null | undefined = options.body
    ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    : undefined;

  const fetchOptions: RequestInit = { ...options, headers, body };

  let res = await fetch(url, fetchOptions);

  if (res.status === 401 && requireAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      refreshQueue.forEach(cb => cb(newToken || ''));
      refreshQueue = [];
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...fetchOptions, headers });
      } else {
        await TokenStorage.clearTokens();
        throw new Error('SESSION_EXPIRED');
      }
    } else {
      const newToken = await new Promise<string>(resolve => refreshQueue.push(resolve));
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...fetchOptions, headers });
      }
    }
  }

  const ct = res.headers.get('content-type');
  const data: T = ct?.includes('application/json')
    ? await res.json()
    : (await res.text()) as any;

  if (!res.ok) {
    const message = (data as any)?.message || `Request failed: ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }

  return { data, status: res.status };
}

export async function apiUpload<T = any>(path: string, formData: FormData): Promise<{ data: T }> {
  const token = await TokenStorage.getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  const data: T = await res.json();
  if (!res.ok) throw Object.assign(new Error((data as any)?.message || 'Upload failed'), { status: res.status });
  return { data };
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const AUTH = {
  sendOtp: (phone: string, name?: string) =>
    apiFetch('/auth/send-otp', { method: 'POST', body: { phone, ...(name && { name }) } }, false),

  verifyOtp: (phone: string, otp: string, name?: string) =>
    apiFetch('/auth/verify-otp', { method: 'POST', body: { phone, otp, ...(name && { name }) } }, false),

  socialLogin: (
    provider: 'google' | 'apple',
    token: string,
    fullName?: { givenName?: string; familyName?: string },
  ) =>
    apiFetch('/auth/social', { method: 'POST', body: { provider, token, fullName } }, false),

  sendPhoneLinkOtp: (phone: string) =>
    apiFetch('/auth/link-phone/send', { method: 'POST', body: { phone } }),

  verifyPhoneLink: (phone: string, otp: string) =>
    apiFetch('/auth/link-phone/verify', { method: 'POST', body: { phone, otp } }),

  me: () => apiFetch('/users/me'),

  refresh: (token: string) =>
    apiFetch('/auth/refresh', { method: 'POST', body: { refreshToken: token } }, false),

  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
};

// ─── PITCHES ──────────────────────────────────────────────────────────────────
export const PITCHES = {
  list: (params?: Record<string, any>) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          if (Array.isArray(v)) v.forEach(i => qs.append(k, i));
          else qs.append(k, String(v));
        }
      });
    }
    return apiFetch(`/pitches?${qs.toString()}`);
  },
  get:          (id: string)                    => apiFetch(`/pitches/${id}`),
  getSlots:     (pitchId: string, date: string) => apiFetch(`/pitches/${pitchId}/availability?date=${date}`),
  getFeatured:  ()                              => apiFetch('/pitches?featured=true&limit=5'),
  getReviews:   (pitchId: string)               => apiFetch(`/reviews/pitches/${pitchId}`),
  create:       (body: any)                     => apiFetch('/pitches', { method: 'POST', body }),
  update:       (id: string, body: any)         => apiFetch(`/pitches/${id}`, { method: 'PATCH', body }),
  uploadImages: (pitchId: string, fd: FormData) => apiUpload(`/pitches/${pitchId}/images`, fd),
};

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
export const BOOKINGS = {
  create: (body: {
    pitchId: string;
    date: string;
    startTime: string;
    endTime: string;
    paymentMethod?: 'MPESA' | 'CARD' | 'CASH';
  }) => apiFetch('/bookings', { method: 'POST', body }),

  list: (params?: Record<string, any>) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && qs.append(k, String(v)));
    return apiFetch(`/bookings?${qs.toString()}`);
  },

  get:    (id: string)                   => apiFetch(`/bookings/${id}`),
  cancel: (id: string, reason?: string)  =>
    apiFetch(`/bookings/${id}/cancel`, { method: 'POST', body: { reason } }),
};

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export const PAYMENTS = {
  initiateMpesa: (body: { bookingId: string; phone: string; amount: number }) =>
    apiFetch('/payments/mpesa/initiate', { method: 'POST', body }),
  checkStatus: (bookingId: string) => apiFetch(`/payments/${bookingId}/status`),
};

// ─── USER ─────────────────────────────────────────────────────────────────────
export const USER = {
  getProfile:      ()                                              => apiFetch('/users/me'),
  updateProfile:   (body: { name?: string; email?: string })      =>
    apiFetch('/users/me', { method: 'PATCH', body }),
  getStats:        ()                                              => apiFetch('/users/me/stats'),
  getReferral:     ()                                              => apiFetch('/users/me/referral'),
  getReviews:      ()                                              => apiFetch('/users/me/reviews'),
  updateReview:    (id: string, body: { rating?: number; comment?: string }) =>
    apiFetch(`/reviews/${id}`, { method: 'PATCH', body }),
  updatePushToken: (pushToken: string)                             =>
    apiFetch('/users/me/push-token', { method: 'PATCH', body: { pushToken } }),
};

// ─── OWNER ────────────────────────────────────────────────────────────────────
export const OWNER = {
  getDashboard:  ()                           => apiFetch('/owner/dashboard'),
  getAnalytics:  (period = 'month')           => apiFetch(`/owner/analytics?period=${period}`),
  getBookings:   (params?: Record<string, any>) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && qs.append(k, String(v)));
    return apiFetch(`/owner/bookings?${qs.toString()}`);
  },
  getPitches:    ()                           => apiFetch('/owner/pitches'),
  updateSlot:    (slotId: string, body: { status: string }) =>
    apiFetch(`/owner/slots/${slotId}`, { method: 'PATCH', body }),
  requestPayout: (amount: number)             =>
    apiFetch('/owner/payouts/request', { method: 'POST', body: { amount } }),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const NOTIFICATIONS = {
  list:        ()           => apiFetch('/notifications'),
  markRead:    (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: ()           => apiFetch('/notifications/read-all', { method: 'PATCH' }),
};

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
export const REVIEWS = {
  create: (body: { pitchId: string; bookingId?: string; rating: number; comment?: string }) =>
    apiFetch(`/reviews/pitches/${body.pitchId}`, { method: 'POST', body }),
};