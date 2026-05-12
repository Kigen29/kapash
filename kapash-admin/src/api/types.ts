export type UserRole = 'PLAYER' | 'OWNER' | 'ADMIN';
export type AdminTier = 'SUPER' | 'OPERATIONS' | 'FINANCE' | 'SUPPORT';
export type PitchStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID';
export type EventStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface AdminUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar?: string | null;
  role: UserRole;
  adminTier?: AdminTier | null;
  corporateId?: string | null;
  isCorpAdmin?: boolean;
  isVerified: boolean;
  isActive: boolean;
  walletBalance?: number;
  createdAt: string;
  _count?: { bookings: number; pitches: number; reviews?: number };
}

export interface AdminPitch {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  county: string;
  latitude: number;
  longitude: number;
  type: string;
  size: string;
  pricePerHour: number;
  status: PitchStatus;
  isVerified: boolean;
  verifiedAt: string | null;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  owner?: { id: string; name: string; phone: string | null; email?: string | null };
  images?: { id: string; url: string; isPrimary: boolean }[];
  amenities?: { id: string; name: string; icon: string }[];
  _count?: { bookings: number };
  revenue?: { total: number; commission: number; owner: number };
}

export interface AdminBooking {
  id: string;
  ticketId: string;
  pitchId: string;
  pitchName: string;
  pitchAddress: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  commissionAmount: number;
  ownerAmount: number;
  status: BookingStatus;
  cancelReason?: string | null;
  createdAt: string;
  eventId?: string | null;
  corporateId?: string | null;
  user?: { id: string; name: string; phone: string | null; email?: string | null };
  pitch?: { id: string; name: string; address?: string; owner?: { id: string; name: string; phone: string | null } };
  payment?: { status: PaymentStatus; amount: number; mpesaReceiptNumber?: string | null };
  payout?: AdminPayout;
  event?: { id: string; name: string };
}

export interface AdminPayout {
  id: string;
  ownerId: string;
  pitchId: string;
  bookingId: string;
  amount: number;
  status: PayoutStatus;
  mpesaPhone: string | null;
  mpesaTransactionId: string | null;
  scheduledFor: string;
  processedAt: string | null;
  createdAt: string;
  owner?: { id: string; name: string; phone: string | null };
  booking?: { id: string; pitchName: string; date: string; startTime: string; totalAmount: number };
}

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  ownerReply: string | null;
  isVisible: boolean;
  createdAt: string;
  user?: { id: string; name: string; avatar?: string | null };
  pitch?: { id: string; name: string };
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: any;
  createdAt: string;
  actor?: { id: string; name: string; avatar?: string | null; adminTier?: AdminTier | null };
}

export interface AdminStats {
  totalUsers: number;
  totalPitches: number;
  activePitches: number;
  pendingPitches: number;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  pendingPayouts: number;
  totalCorporates: number;
  totalInvoices: number;
}

export interface AdminAnalytics {
  period: number;
  groupBy: 'day' | 'week' | 'month';
  compareTo: string | null;
  revenue: {
    byDay: Record<string, number>;
    commissionByDay: Record<string, number>;
    total: number;
    commission: number;
    delta: { revenue: number | null; commission: number | null };
  };
  bookings: {
    byDay: Record<string, number>;
    total: number;
    byStatus: Record<string, number>;
    delta: { total: number | null };
  };
  users: { byDay: Record<string, number>; totalNew: number; byRole: Record<string, number> };
  occupancyByType: Record<string, number>;
  topPitches: { pitchId: string; name: string; revenue: number; bookingCount: number; ownerName: string }[];
  topOwners: { ownerId: string; name: string; revenue: number; bookingCount: number }[];
  alerts: { pendingPitches: number; pendingPayouts: number; failedPayments: number };
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  adminTier?: AdminTier | null;
  isVerified: boolean;
  phoneVerified: boolean;
  avatar?: string | null;
}

// ── Corporate / Events / Invoices ────────────────────────────────────────────

export interface Corporate {
  id: string;
  name: string;
  tradingName: string | null;
  email: string;
  phone: string;
  billingAddress: string;
  kraPin: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  creditLimit: number;
  paymentTermDays: number;
  createdAt: string;
  bookers?: AdminUser[];
  events?: BookingEvent[];
  invoices?: Invoice[];
  _count?: { bookers: number; events: number; invoices: number };
  lifetimeInvoiced?: number;
}

export interface BookingEvent {
  id: string;
  name: string;
  organizerId: string;
  corporateId: string | null;
  date: string;
  status: EventStatus;
  totalAmount: number;
  notes: string | null;
  invoiceId: string | null;
  createdAt: string;
  organizer?: { id: string; name: string; phone: string | null; email?: string | null };
  corporate?: Corporate | { id: string; name: string };
  bookings?: AdminBooking[];
  invoice?: { id: string; number: string; status: InvoiceStatus; total?: number } | null;
  _count?: { bookings: number };
}

export interface InvoiceLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  corporateId: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate: string;
  paidAt: string | null;
  paymentRef: string | null;
  lineItems: InvoiceLineItem[];
  notes: string | null;
  createdBy: string;
  createdAt: string;
  corporate?: { id: string; name: string } | Corporate;
  event?: { id: string; name: string; date: string } | null;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Paginated<T> { data: T; total: number; }
