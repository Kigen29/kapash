import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, darkPalette, lightPalette } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'kapash_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedScheme: 'light' | 'dark';
  colors: ColorPalette;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolve(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [resolvedScheme, setResolvedScheme] = useState<'light' | 'dark'>(resolve('dark'));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
        setResolvedScheme(resolve(saved));
      }
    });
  }, []);

  useEffect(() => {
    setResolvedScheme(resolve(mode));
    if (mode !== 'system') return;
    const sub = Appearance.addChangeListener(() => setResolvedScheme(resolve('system')));
    return () => sub.remove();
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setResolvedScheme(resolve(next));
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    const next: ThemeMode = resolvedScheme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [resolvedScheme, setMode]);

  const colors = resolvedScheme === 'light' ? lightPalette : darkPalette;

  return (
    <ThemeContext.Provider value={{ mode, resolvedScheme, colors, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
