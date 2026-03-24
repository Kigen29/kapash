/**
 * RootNavigator - Auth-aware routing
 * Place at: src/navigation/RootNavigator.tsx
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

// User tab navigator
import UserTabNavigator from './UserTabNavigator';

// Owner tab navigator
import OwnerTabNavigator from './OwnerTabNavigator';

// Shared/modal screens
import PitchDetailsScreen from '../screens/user/PitchDetailsScreen';
import CheckoutScreen from '../screens/user/CheckoutScreen';
import BookingConfirmationScreen from '../screens/user/BookingConfirmationScreen';
import FiltersScreen from '../screens/user/FiltersScreen';
import HelpSupportScreen from '../screens/user/HelpSupportScreen';
import ReferralScreen from '../screens/user/ReferralScreen';

// Previously missing screens
import MyBookingsScreen from '../screens/user/MyBookingsScreen';
import NotificationsScreen from '../screens/user/NotificationScreen';
import EditProfileScreen from '../screens/user/EditProfileScreen';
import ReviewsScreen from '../screens/user/ReferralScreen';
import VerifyPhoneScreen from '../screens/auth/VerifyPhoneScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F1923', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#22C55E" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!isAuthenticated ? (
          // ─── AUTH STACK ───────────────────────────────────────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
          </>
        ) : (
          // ─── APP STACK ────────────────────────────────────────────────────
          <>
            {/* Main tab navigator */}
            <Stack.Screen
              name="Main"
              component={user?.role === 'OWNER' ? OwnerTabNavigator : UserTabNavigator}
            />

            {/* Booking flow */}
            <Stack.Screen
              name="PitchDetails"
              component={PitchDetailsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="BookingConfirmation"
              component={BookingConfirmationScreen}
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="MyBookings"
              component={MyBookingsScreen}
            />

            {/* Filters */}
            <Stack.Screen
              name="Filters"
              component={FiltersScreen}
              options={{ animation: 'slide_from_bottom' }}
            />

            {/* Profile & account */}
            <Stack.Screen name="EditProfile"    component={EditProfileScreen} />
            <Stack.Screen name="Reviews"        component={ReviewsScreen} />
            <Stack.Screen name="Notifications"  component={NotificationsScreen} />
            <Stack.Screen name="HelpSupport"    component={HelpSupportScreen} />
            <Stack.Screen name="Referral"       component={ReferralScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}