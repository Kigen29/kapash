/**
 * AuthContext - OTP-based auth
 * Place at: src/context/AuthContext.tsx
 */

import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH, TokenStorage, STORAGE_KEYS, apiFetch } from '../services/api';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'PLAYER' | 'OWNER' | 'ADMIN';
  avatar?: string;
  isVerified: boolean;
  referralCode?: string;
  walletBalance?: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING': return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS': return { ...state, isLoading: false, isAuthenticated: true, user: action.payload, error: null };
    case 'LOGOUT': return { ...initialState, isLoading: false };
    case 'UPDATE_USER': return { ...state, user: state.user ? { ...state.user, ...action.payload } : null };
    case 'ERROR': return { ...state, isLoading: false, error: action.payload };
    case 'CLEAR_ERROR': return { ...state, error: null };
    default: return state;
  }
}

interface AuthContextType extends AuthState {
  // Called by auth screens after successful OTP verify
  handleLoginSuccess: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check persisted session on mount
  useEffect(() => {
    (async () => {
      try {
        const [tokenEntry, userEntry] = await AsyncStorage.multiGet([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.USER,
        ]);
        const token = tokenEntry[1];
        const userStr = userEntry[1];

        if (token && userStr) {
          // Verify token is still valid
          const { data } = await AUTH.me();
          const user = data.data?.user || data.user || JSON.parse(userStr);
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch {
        await TokenStorage.clearTokens();
        dispatch({ type: 'LOGOUT' });
      }
    })();
  }, []);

  const handleLoginSuccess = useCallback(async (user: User, accessToken: string, refreshToken: string) => {
    await TokenStorage.setTokens(accessToken, refreshToken);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
  }, []);

  const logout = useCallback(async () => {
    try { await AUTH.logout(); } catch {}
    await TokenStorage.clearTokens();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: data });
    AsyncStorage.getItem(STORAGE_KEYS.USER).then(str => {
      if (str) {
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ ...JSON.parse(str), ...data }));
      }
    });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <AuthContext.Provider value={{ ...state, handleLoginSuccess, logout, updateUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}