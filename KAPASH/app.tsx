/**
 * App.tsx - Root component
 * Place at: App.tsx (root of project)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { handleNotificationResponse } from './src/services/notifications';

// Keep splash visible until auth is checked
SplashScreen.preventAutoHideAsync();

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.container}>
          <Text style={eb.emoji}>⚠️</Text>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.message}>{this.state.error?.message}</Text>
          <TouchableOpacity
            style={eb.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={eb.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1923', justifyContent: 'center', alignItems: 'center', padding: 32 },
  emoji:     { fontSize: 56, marginBottom: 16 },
  title:     { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 12 },
  message:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 32 },
  btn:       { backgroundColor: '#22C55E', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
});

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const notifListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    const timeout = setTimeout(() => SplashScreen.hideAsync(), 500);

    // Handle notification taps from background / quit state
    notifListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const nav = require('./src/navigation/RootNavigator').navigationRef.current;
      if (nav) handleNotificationResponse(response, nav);
    });

    return () => {
      clearTimeout(timeout);
      notifListener.current?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" backgroundColor="#0F1923" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
