/**
 * Data Hooks
 * Place at: src/hooks/useData.ts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BOOKINGS, NOTIFICATIONS, OWNER, PITCHES, USER } from "../services/api";

// ─── GENERIC FETCH HOOK ───────────────────────────────────────────────────────
export function useFetch<T>(
  fetchFn: () => Promise<{ data: any }>,
  deps: any[] = [],
  options: { skip?: boolean; transform?: (d: any) => T } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (options.skip) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFn();
      if (mountedRef.current) {
        // Unwrap backend envelope: { success: true, data: { ... } }
        const raw = res.data?.data ?? res.data;
        setData(options.transform ? options.transform(raw) : raw);
      }
    } catch (err: any) {
      if (mountedRef.current) setError(err.message || "Something went wrong");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [...deps, options.skip]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { data, isLoading, error, refetch: load };
}

// ─── PITCHES HOOKS ────────────────────────────────────────────────────────────
export function usePitches(filters?: {
  search?: string;
  pitchType?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
}) {
  return useFetch(
    () =>
      PITCHES.list({
        type: filters?.pitchType,
        minPrice: filters?.minPrice,
        maxPrice: filters?.maxPrice,
        amenities: filters?.amenities?.join(","),
      }),
    [JSON.stringify(filters)],
    {
      transform: (d) => ({
        pitches: Array.isArray(d.pitches)
          ? d.pitches
          : Array.isArray(d.data)
          ? d.data
          : [],
        total: d.pagination?.total ?? d.total ?? 0,
        page: d.pagination?.page ?? d.page ?? 1,
      }),
    },
  );
}

export function usePitch(id: string) {
  return useFetch(() => PITCHES.get(id), [id], {
    skip: !id,
    transform: (d) => d.pitch ?? d,
  });
}

export function usePitchSlots(pitchId: string, date: string) {
  return useFetch(() => PITCHES.getSlots(pitchId, date), [pitchId, date], {
    skip: !pitchId || !date,
    transform: (d) => {
      // Backend getPitchAvailability returns { date, slots: [...] }
      const slots = d.slots ?? d;
      return Array.isArray(slots) ? slots : [];
    },
  });
}

export function useFeaturedPitches() {
  return useFetch(() => PITCHES.getFeatured(), [], {
    transform: (d) =>
      Array.isArray(d.pitches)
        ? d.pitches
        : Array.isArray(d.data)
        ? d.data
        : Array.isArray(d)
        ? d
        : [],
  });
}

export function usePitchReviews(pitchId: string) {
  return useFetch(() => PITCHES.getReviews(pitchId), [pitchId], {
    skip: !pitchId,
    transform: (d) =>
      Array.isArray(d.reviews)
        ? d.reviews
        : Array.isArray(d)
        ? d
        : [],
  });
}

// ─── BOOKINGS HOOKS ───────────────────────────────────────────────────────────
export function useBookings(status?: string) {
  return useFetch(() => BOOKINGS.list({ status }), [status], {
    transform: (d) =>
      Array.isArray(d.bookings)
        ? d.bookings
        : Array.isArray(d.data)
        ? d.data
        : [],
  });
}

export function useBooking(id: string) {
  return useFetch(() => BOOKINGS.get(id), [id], {
    skip: !id,
    transform: (d) => d.booking ?? d,
  });
}

// ─── OWNER HOOKS ──────────────────────────────────────────────────────────────
export function useOwnerDashboard() {
  return useFetch(() => OWNER.getDashboard(), [], {
    transform: (d) => ({
      // Revenue
      monthlyRevenue:    d.stats?.totalRevenue    ?? d.monthlyRevenue    ?? 0,
      todayRevenue:      d.stats?.todayRevenue     ?? d.todayRevenue      ?? 0,
      // Booking counts
      monthlyBookings:   d.stats?.monthBookings    ?? d.monthlyBookings   ?? 0,
      todayBookings:     d.stats?.todayBookings    ?? d.todayBookings     ?? 0,
      pendingBookings:   d.stats?.pendingBookings  ?? d.pendingBookings   ?? 0,
      // Other stats
      occupancyRate:     d.stats?.occupancyRate    ?? d.occupancyRate     ?? 0,
      avgRating:         d.stats?.avgRating        ?? d.avgRating         ?? 0,
      pendingPayout:     d.stats?.pendingPayouts   ?? d.pendingPayout     ?? 0,
      // Today's booking list (array)
      todayBookingsList: Array.isArray(d.todayBookings)
        ? d.todayBookings
        : [],
    }),
  });
}

export function useOwnerAnalytics(period: "week" | "month" | "year" = "month") {
  return useFetch(() => OWNER.getAnalytics(period), [period], {
    transform: (d) => d.analytics ?? d,
  });
}

export function useOwnerBookings(filters?: { status?: string; date?: string }) {
  return useFetch(() => OWNER.getBookings(filters), [JSON.stringify(filters)], {
    transform: (d) =>
      Array.isArray(d.bookings)
        ? d.bookings
        : Array.isArray(d.data)
        ? d.data
        : [],
  });
}

export function useOwnerPitches() {
  return useFetch(() => OWNER.getPitches(), [], {
    transform: (d) =>
      Array.isArray(d.pitches)
        ? d.pitches
        : Array.isArray(d.data)
        ? d.data
        : [],
  });
}

// ─── USER HOOKS ───────────────────────────────────────────────────────────────
export function useUserProfile() {
  return useFetch(() => USER.getProfile(), [], {
    transform: (d) => d.user ?? d,
  });
}

export function useUserStats() {
  return useFetch(() => USER.getStats(), [], {
    // Backend returns: { totalBookings, completedBookings, totalSpent }
    // No nesting — just pass through
    transform: (d) => ({
      totalBookings:    d.totalBookings    ?? 0,
      completedBookings: d.completedBookings ?? 0,
      totalSpent:       d.totalSpent       ?? 0,
      totalHours:       d.totalHours       ?? 0,
      referralCount:    d.referralCount    ?? 0,
    }),
  });
}

export function useReferral() {
  return useFetch(() => USER.getReferral(), [], {
    // Backend returns: { referralCode, referralCount, earningsPerReferral, totalEarned }
    transform: (d) => ({
      referralCode:       d.referralCode       ?? null,
      referralCount:      d.referralCount      ?? 0,
      earningsPerReferral: d.earningsPerReferral ?? 500,
      totalEarned:        d.totalEarned        ?? 0,
    }),
  });
}

// ─── NOTIFICATIONS HOOK ───────────────────────────────────────────────────────
export function useNotifications() {
  const result = useFetch(() => NOTIFICATIONS.list(), [], {
    // Backend returns: { notifications: [...], unreadCount }
    // useFetch unwraps the outer envelope, so d = { notifications, unreadCount }
    transform: (d) =>
      Array.isArray(d.notifications)
        ? d.notifications
        : Array.isArray(d)
        ? d
        : [],
  });

  const markRead = useCallback(
    async (id: string) => {
      await NOTIFICATIONS.markRead(id);
      result.refetch();
    },
    [result.refetch],
  );

  const markAllRead = useCallback(async () => {
    await NOTIFICATIONS.markAllRead();
    result.refetch();
  }, [result.refetch]);

  return { ...result, markRead, markAllRead };
}