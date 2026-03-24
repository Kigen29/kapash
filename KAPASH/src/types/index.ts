// ── User & Auth ──────────────────────────────────────────────────────────────

export interface Pitch {
  id: string;
  name: string;
  address: string;
  city?: string;
  location?: string;
  pricePerHour: number;
  avgRating?: number;
  rating?: number;
  reviewCount?: number;
  distance?: string;
  type: string;
  size: string;
  images: PitchImage[];
  amenities: Amenity[];
  isVerified: boolean;
  status?: string;
  description?: string;
  operatingHours?: Record<string, { open: string; close: string }>;
  _count?: { bookings?: number; reviews?: number };
}

export interface PitchImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'BOOKED' | 'HELD';
  price?: number;
}

export interface Booking {
  id: string;
  userId: string;
  pitchId: string;
  pitchName: string;
  pitchAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMins: number;
  totalAmount: number;
  ownerAmount: number;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  ticketId: string;
  pitch?: Pitch;
  payment?: { status: string; method: string };
}

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  // ✅ FIXED: Match DB enum values
  role: 'PLAYER' | 'OWNER' | 'ADMIN';
  avatar?: string;
  isVerified: boolean;
  phoneVerified: boolean;
  referralCode?: string;
  walletBalance?: number;
}

// ── Navigation ────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  VerifyPhone: { phone: string; isLinking?: boolean };
  Main: undefined;
  PitchDetails: { pitchId: string };
  Checkout: {
    pitchId: string;
    pitchName: string;
    pitchAddress: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    pitchImage?: string;
  };
  BookingConfirmation: { bookingId: string };
  MyBookings: undefined;
  Filters: undefined;
  HelpSupport: undefined;
  Referral: undefined;
  Notifications: undefined;
  EditProfile: undefined;
  Reviews: undefined;
};

export type UserTabParamList = {
  Home: undefined;
  Search: undefined;
  Bookings: undefined;
  Profile: undefined;
};

export type OwnerTabParamList = {
  Dashboard: undefined;
  Schedule: undefined;
  Analytics: undefined;
  Account: undefined;
};

export interface DashboardData {
  monthlyRevenue:    number;
  todayRevenue:      number;
  monthlyBookings:   number;
  todayBookings:     number;
  pendingBookings:   number;
  occupancyRate:     number;
  avgRating:         number;
  pendingPayout:     number;
  todayBookingsList: any[];
}