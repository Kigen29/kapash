import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, STORAGE, unwrap } from '../api/client';
import type { AuthUser, UserRole, AdminTier } from '../api/types';

interface AuthCtx {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  loginWithDev: (role: UserRole, adminTier?: AdminTier) => Promise<AuthUser>;
  loginWithOtp: (phone: string, otp: string) => Promise<AuthUser>;
  sendOtp: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

function storeAuth(user: AuthUser, accessToken: string, refreshToken: string) {
  localStorage.setItem(STORAGE.access, accessToken);
  localStorage.setItem(STORAGE.refresh, refreshToken);
  localStorage.setItem(STORAGE.user, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(STORAGE.access);
  localStorage.removeItem(STORAGE.refresh);
  localStorage.removeItem(STORAGE.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const cached = localStorage.getItem(STORAGE.user);
    return cached ? (JSON.parse(cached) as AuthUser) : null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify token on mount
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(STORAGE.access);
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/users/me');
        const fresh = unwrap<AuthUser>(res.data);
        setUser(fresh);
        localStorage.setItem(STORAGE.user, JSON.stringify(fresh));
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    setError(null);
    await api.post('/auth/send-otp', { phone }, { headers: { 'Content-Type': 'application/json' } });
  }, []);

  const loginWithOtp = useCallback(async (phone: string, otp: string): Promise<AuthUser> => {
    setError(null);
    const res = await api.post('/auth/verify-otp', { phone, otp });
    const payload = res.data?.data ?? res.data;
    const u: AuthUser = payload.user;
    if (u.role !== 'ADMIN') {
      throw new Error('This account is not an administrator. Use the mobile app for player/owner access.');
    }
    storeAuth(u, payload.accessToken, payload.refreshToken);
    setUser(u);
    return u;
  }, []);

  const loginWithDev = useCallback(async (role: UserRole, adminTier?: AdminTier): Promise<AuthUser> => {
    setError(null);
    const res = await api.post('/auth/dev-login', { role, ...(adminTier && { adminTier }) });
    const payload = res.data?.data ?? res.data;
    const u: AuthUser = payload.user;
    if (u.role !== 'ADMIN') {
      throw new Error('Dev login returned a non-admin role.');
    }
    storeAuth(u, payload.accessToken, payload.refreshToken);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE.refresh);
    if (refreshToken) {
      try { await api.post('/auth/logout', { refreshToken }); } catch { /* ignore */ }
    }
    clearAuth();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, isLoading, error, loginWithDev, loginWithOtp, sendOtp, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
