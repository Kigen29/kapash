export interface Pitch {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  rating: number;
  reviewCount: number;
  distance?: string;
  type: string;
  size: string;
  image: string;
  images: string[];
  amenities: Amenity[];
  isVerified: boolean;
  badge?: 'PREMIUM' | 'POPULAR' | 'NEW';
  slots: TimeSlot[];
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  status: 'available' | 'booked' | 'blocked';
}

export interface Booking {
  id: string;
  pitchId: string;
  pitchName: string;
  pitchLocation: string;
  pitchImage: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  ticketId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  totalBookings: number;
  totalSpent: number;
  rating: number;
}

// ── Navigation Types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  SignUp: undefined;
  Login: undefined;
  UserTabs: undefined;
  OwnerTabs: undefined;
  PitchDetails: { pitchId: string };
  Checkout: { pitchId: string; date: string; slot: string; price: number };
  BookingConfirmation: { bookingId: string };
  Filters: undefined;
  HelpSupport: undefined;
  Referral: undefined;
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