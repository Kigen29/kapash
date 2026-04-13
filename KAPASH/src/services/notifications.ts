/**
 * notifications.ts — push notification utilities
 * Place at: src/services/notifications.ts
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Handler Config ───────────────────────────────────────────────────────────
// Controls what happens when a notification arrives while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// ─── Register ─────────────────────────────────────────────────────────────────
/**
 * Requests permission and returns an Expo Push Token string, or null if
 * running on a simulator / permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens are not available on simulators / emulators
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

// ─── Response Router ──────────────────────────────────────────────────────────
/**
 * Routes a notification tap to the correct screen.
 * Pass the `navigation` ref (or navigator) from the root component.
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigation: { navigate: (screen: string, params?: any) => void }
) {
  const data = response.notification.request.content.data as Record<string, any>;
  const type: string = data?.type || '';

  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'SLOT_REMINDER':
      if (data?.bookingId) {
        navigation.navigate('BookingConfirmation', { bookingId: data.bookingId });
      }
      break;

    case 'BOOKING_CANCELLED':
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_FAILED':
    case 'REVIEW_REQUEST':
      navigation.navigate('MyBookings');
      break;

    default:
      // Unknown type — do nothing
      break;
  }
}
