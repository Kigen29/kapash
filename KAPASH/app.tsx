/**
 * App.tsx - Root component
 * Place at: App.tsx (root of project)
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

// Keep splash visible until auth is checked
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    // Splash will be hidden by RootNavigator once auth state is determined
    // We hide it after a short delay to allow the navigator to mount
    const timeout = setTimeout(() => SplashScreen.hideAsync(), 500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#0F1923" />
      <RootNavigator />
    </AuthProvider>
  );
}