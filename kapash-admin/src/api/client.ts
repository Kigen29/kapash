import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const STORAGE = {
  access: 'kapash_admin_access',
  refresh: 'kapash_admin_refresh',
  user: 'kapash_admin_user',
};

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000/api/v1';

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(STORAGE.refresh);
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
    const payload = res.data?.data ?? res.data;
    if (payload?.accessToken) {
      localStorage.setItem(STORAGE.access, payload.accessToken);
      if (payload.refreshToken) localStorage.setItem(STORAGE.refresh, payload.refreshToken);
      return payload.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE.access);
  if (token) {
    config.headers.set?.('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null; });
      const newToken = await refreshing;
      if (newToken) {
        original.headers.set?.('Authorization', `Bearer ${newToken}`);
        return api(original);
      }
      // Refresh failed — kick to login
      localStorage.removeItem(STORAGE.access);
      localStorage.removeItem(STORAGE.refresh);
      localStorage.removeItem(STORAGE.user);
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function unwrap<T = any>(data: any): T {
  // Backend envelope: { success: true, data: ... }
  return (data?.data ?? data) as T;
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as any)?.message || err.message || 'Request failed';
  }
  return (err as any)?.message || 'Something went wrong';
}
