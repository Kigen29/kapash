import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH, TokenStorage, STORAGE_KEYS, USER } from '../services/api';
import { User } from '../types';
import { registerForPushNotifications } from '../services/notifications';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresPhoneVerification: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'REQUIRE_PHONE_VERIFICATION'; payload: User }
  | { type: 'PHONE_VERIFIED' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  requiresPhoneVerification: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        requiresPhoneVerification: false,
        user: action.payload,
        error: null,
      };
    case 'REQUIRE_PHONE_VERIFICATION':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,  // Has valid token
        requiresPhoneVerification: true,
        user: action.payload,
        error: null,
      };
    case 'PHONE_VERIFIED':
      return {
        ...state,
        requiresPhoneVerification: false,
        user: state.user ? { ...state.user, phoneVerified: true, isVerified: true } : null,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  handleLoginSuccess: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  handleSocialLoginSuccess: (
    user: User,
    accessToken: string,
    refreshToken: string,
    requiresPhone: boolean
  ) => Promise<void>;
  handlePhoneVerified: (updatedUser?: Partial<User>) => void;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on app launch
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
          // Verify token with backend
          const { data } = await AUTH.me();
          const user: User = data.data || data;
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

  const handleLoginSuccess = useCallback(
    async (user: User, accessToken: string, refreshToken: string) => {
      await TokenStorage.setTokens(accessToken, refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      // Register push token in background — failure is non-fatal
      registerForPushNotifications().then(token => {
        if (token) USER.updatePushToken(token).catch(() => {});
      });
    },
    []
  );

  const handleSocialLoginSuccess = useCallback(
    async (
      user: User,
      accessToken: string,
      refreshToken: string,
      requiresPhone: boolean
    ) => {
      await TokenStorage.setTokens(accessToken, refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      if (requiresPhone) {
        dispatch({ type: 'REQUIRE_PHONE_VERIFICATION', payload: user });
      } else {
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        // Register push token in background — failure is non-fatal
        registerForPushNotifications().then(token => {
          if (token) USER.updatePushToken(token).catch(() => {});
        });
      }
    },
    []
  );

  const handlePhoneVerified = useCallback((updatedUser?: Partial<User>) => {
    dispatch({ type: 'PHONE_VERIFIED' });
    if (updatedUser) {
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      AsyncStorage.getItem(STORAGE_KEYS.USER).then(str => {
        if (str) {
          AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ ...JSON.parse(str), ...updatedUser }));
        }
      });
    }
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
    <AuthContext.Provider
      value={{
        ...state,
        handleLoginSuccess,
        handleSocialLoginSuccess,
        handlePhoneVerified,
        logout,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}