# KAPASH — Sports Pitch Booking Platform

KAPASH is a React Native / Expo mobile app for booking sports pitches in Kenya. Players can search pitches, book time slots, and pay via M-Pesa. Pitch owners can list venues, manage schedules, and track revenue.

---

## Prerequisites

- Node.js 18+
- Expo CLI — `npm install -g expo-cli`
- EAS CLI — `npm install -g eas-cli`
- Android Studio or Xcode (for emulators), or a physical device with Expo Go

---

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd KAPASH

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in the values (see table below)

# 4. Start the dev server
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `a` / `i` to launch on an emulator.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Backend API base URL, e.g. `http://192.168.1.64:5000/api/v1` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web Client ID (from Google Cloud Console) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS Client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android Client ID |

All `EXPO_PUBLIC_*` variables are bundled at build time by Metro — no extra babel plugin needed.

---

## Backend

KAPASH requires a separate Node.js/Express API. The frontend expects:

- `POST /auth/send-otp` — send OTP to phone
- `POST /auth/verify-otp` — verify OTP, returns `{ accessToken, refreshToken, user }`
- `POST /auth/google` — Google OAuth
- `GET /pitches` — list pitches (supports `?search=`, `?pitchType=`, `?featured=true`)
- `GET /pitches/:id` — pitch detail
- `GET /pitches/:id/availability?date=YYYY-MM-DD` — available time slots
- `POST /bookings` — create booking
- `GET /bookings` — list user bookings
- `PATCH /bookings/:id/cancel` — cancel booking
- `PATCH /users/me/push-token` — register push notification token
- `POST /owner/payouts/request` — request payout

---

## Building

```bash
# Development build (physical device)
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform android

# Production build
eas build --profile production --platform all
```

---

## Project Structure

```text
src/
  context/        AuthContext — auth state + token storage
  hooks/          useData — data fetching hooks (usePitches, useBooking, etc.)
  navigation/     RootNavigator, UserTabNavigator, OwnerTabNavigator
  screens/
    auth/         LoginScreen, SignUpScreen, VerifyPhoneScreen
    user/         HomeScreen, PitchDetailsScreen, CheckoutScreen,
                  BookingConfirmationScreen, MyBookingsScreen, ...
    owner/        OwnerDashboardScreen, AnalyticsScreen, ManageScheduleScreen,
                  OwnerAccountScreen, AddPitchScreen
  services/
    api.ts        All API calls (AUTH, USER, PITCHES, BOOKINGS, OWNER, REVIEWS)
    notifications.ts  Push notification registration + tap routing
  types/          TypeScript interfaces (Pitch, Booking, User, etc.)
```

---

## Notes

- Push notifications require a physical device (Expo Push Token unavailable on simulators)
- M-Pesa STK Push uses polling — `CheckoutScreen` polls `/bookings/:id` until payment confirms
- Google / Apple OAuth credentials must be configured in `.env` before social login works
