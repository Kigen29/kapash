/**
 * Kapash API Client
 * Place at: src/services/api.ts
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const DEV_IP = "192.168.1.64"; // ← your PC WiFi IP
const PORT = 5000;
const BASE_URL = `http://${DEV_IP}:${PORT}/api/v1`;

// ─── STORAGE KEYS ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "kapash_access_token",
  REFRESH_TOKEN: "kapash_refresh_token",
  USER: "kapash_user",
};

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────
export const TokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },
  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
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
let isRefreshing = false;
let refreshQueue: ((token: string) => void)[] = [];

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await TokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (data.data?.accessToken) {
      await TokenStorage.setTokens(
        data.data.accessToken,
        data.data.refreshToken || refreshToken,
      );
      return data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  requireAuth = true,
): Promise<{ data: T; status: number }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    const token = await TokenStorage.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 && requireAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(newToken || ""));
      refreshQueue = [];
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers });
      } else {
        await TokenStorage.clearTokens();
        throw new Error("SESSION_EXPIRED");
      }
    } else {
      const newToken = await new Promise<string>((resolve) =>
        refreshQueue.push(resolve),
      );
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers });
      }
    }
  }

  const ct = res.headers.get("content-type");
  const data: T = ct?.includes("application/json")
    ? await res.json()
    : ((await res.text()) as any);

  if (!res.ok) {
    const message = (data as any)?.message || `Request failed: ${res.status}`;
    throw Object.assign(new Error(message), { status: res.status, data });
  }

  return { data, status: res.status };
}

export async function apiUpload<T = any>(
  path: string,
  formData: FormData,
): Promise<{ data: T }> {
  const token = await TokenStorage.getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  const data: T = await res.json();
  if (!res.ok)
    throw Object.assign(new Error((data as any)?.message || "Upload failed"), {
      status: res.status,
    });
  return { data };
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const AUTH = {
  sendOtp: (phone: string, name?: string) =>
    apiFetch(
      "/auth/send-otp",
      {
        method: "POST",
        body: JSON.stringify({ phone, ...(name && { name }) }),
      },
      false,
    ),

  verifyOtp: (phone: string, otp: string) =>
    apiFetch(
      "/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      },
      false,
    ),

  verifyOtpWithName: (phone: string, otp: string, name: string) =>
    apiFetch(
      "/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({ phone, otp, name }),
      },
      false,
    ),

  me: () => apiFetch("/users/me"),

  refresh: (token: string) =>
    apiFetch(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken: token }),
      },
      false,
    ),

  logout: () => apiFetch("/auth/logout", { method: "POST" }),
};

// ─── PITCHES ──────────────────────────────────────────────────────────────────
export const PITCHES = {
  list: (params?: Record<string, any>) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          if (Array.isArray(v)) v.forEach((i) => qs.append(k, i));
          else qs.append(k, String(v));
        }
      });
    }
    return apiFetch(`/pitches?${qs.toString()}`);
  },
  get: (id: string) => apiFetch(`/pitches/${id}`),
  getSlots: (pitchId: string, date: string) =>
    apiFetch(`/pitches/${pitchId}/availability?date=${date}`),
  getFeatured: () => apiFetch("/pitches?featured=true&limit=5"),
  getReviews: (pitchId: string) => apiFetch(`/pitches/${pitchId}/reviews`),
  create: (body: any) =>
    apiFetch("/pitches", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    apiFetch(`/pitches/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  uploadImages: (pitchId: string, fd: FormData) =>
    apiUpload(`/pitches/${pitchId}/images`, fd),
};

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
export const BOOKINGS = {
  create: (body: {
    pitchId: string;
    startTime: string;
    endTime: string;
    paymentMethod?: "MPESA" | "CARD" | "CASH";
    date: string;
    notes?: string;
  }) => apiFetch("/bookings", { method: "POST", body: JSON.stringify(body) }),
  list: (params?: Record<string, any>) => {
    const qs = new URLSearchParams();
    if (params)
      Object.entries(params).forEach(
        ([k, v]) => v !== undefined && qs.append(k, String(v)),
      );
    return apiFetch(`/bookings?${qs.toString()}`);
  },
  get: (id: string) => apiFetch(`/bookings/${id}`),
  cancel: (id: string, reason?: string) =>
    apiFetch(`/bookings/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export const PAYMENTS = {
  initiateMpesa: (body: { bookingId: string; phone: string; amount: number }) =>
    apiFetch("/payments/mpesa/initiate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkStatus: (bookingId: string) => apiFetch(`/payments/${bookingId}/status`),
};

// ─── USER ─────────────────────────────────────────────────────────────────────
export const USER = {
  getProfile: () => apiFetch("/users/me"),
  updateProfile: (body: any) =>
    apiFetch("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  getStats: () => apiFetch("/users/me/stats"),
  getReferral: () => apiFetch("/users/me/referral"),
  getReviews: () => apiFetch("/users/me/reviews"),
  updateReview: (id: string, body: any) =>
    apiFetch(`/reviews/${id}`, { method: "PATCH", body }),
};

// ─── OWNER ────────────────────────────────────────────────────────────────────
export const OWNER = {
  getDashboard: () => apiFetch("/owner/dashboard"),
  getAnalytics: (period = "month") =>
    apiFetch(`/owner/analytics?period=${period}`),
  getBookings: (params?: Record<string, any>) => {
    const qs = new URLSearchParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => v && qs.append(k, String(v)));
    return apiFetch(`/owner/bookings?${qs.toString()}`);
  },
  getPitches: () => apiFetch("/owner/pitches"),
  updateSlot: (slotId: string, body: { status: string }) =>
    apiFetch(`/owner/slots/${slotId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  requestPayout: (amount: number) =>
    apiFetch("/owner/payouts/request", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const NOTIFICATIONS = {
  list: () => apiFetch("/notifications"),
  markRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiFetch("/notifications/read-all", { method: "PATCH" }),
};

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
export const REVIEWS = {
  create: (body: {
    pitchId: string;
    bookingId: string;
    rating: number;
    comment?: string;
  }) => apiFetch("/reviews", { method: "POST", body: JSON.stringify(body) }),
};
