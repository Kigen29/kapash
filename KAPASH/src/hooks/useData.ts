/**
 * Data Hooks
 * Place at: src/hooks/useData.ts
 *
 * Generic hooks that handle loading, error, and data states
 * for every API resource in the app.
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
        const raw = res.data;
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
        pitches: d.pitches || d.data || [],
        total: d.total || 0,
        page: d.page || 1,
      }),
    },
  );
}

export function usePitch(id: string) {
  return useFetch(() => PITCHES.get(id), [id], {
    skip: !id,
    transform: (d) => d.pitch || d,
  });
}

export function usePitchSlots(pitchId: string, date: string) {
  return useFetch(() => PITCHES.getSlots(pitchId, date), [pitchId, date], {
    skip: !pitchId || !date,
    transform: (d) => d.slots || d,
  });
}

export function useFeaturedPitches() {
  return useFetch(() => PITCHES.getFeatured(), [], {
    transform: (d) => d.pitches || d.data || [],
  });
}

export function usePitchReviews(pitchId: string) {
  return useFetch(() => PITCHES.getReviews(pitchId), [pitchId], {
    skip: !pitchId,
    transform: (d) => d.reviews || d,
  });
}

// ─── BOOKINGS HOOKS ───────────────────────────────────────────────────────────
export function useBookings(status?: string) {
  return useFetch(() => BOOKINGS.list({ status }), [status], {
    transform: (d) => d.bookings || d.data || [],
  });
}

export function useBooking(id: string) {
  return useFetch(() => BOOKINGS.get(id), [id], {
    skip: !id,
    transform: (d) => d.booking || d,
  });
}

// ─── OWNER HOOKS ──────────────────────────────────────────────────────────────
export function useOwnerDashboard() {
  return useFetch(() => OWNER.getDashboard(), [], {
    transform: (d) => d.dashboard || d,
  });
}

export function useOwnerAnalytics(period: "week" | "month" | "year" = "month") {
  return useFetch(() => OWNER.getAnalytics(period), [period], {
    transform: (d) => d.analytics || d,
  });
}

export function useOwnerBookings(filters?: { status?: string; date?: string }) {
  return useFetch(() => OWNER.getBookings(filters), [JSON.stringify(filters)], {
    transform: (d) => d.bookings || d.data || [],
  });
}

export function useOwnerPitches() {
  return useFetch(() => OWNER.getPitches(), [], {
    transform: (d) => d.pitches || d.data || [],
  });
}

// ─── USER HOOKS ───────────────────────────────────────────────────────────────
export function useUserProfile() {
  return useFetch(() => USER.getProfile(), [], {
    transform: (d) => d.user || d,
  });
}

export function useUserStats() {
  return useFetch(() => USER.getStats(), [], {
    transform: (d) => d.stats || d,
  });
}

export function useReferral() {
  return useFetch(() => USER.getReferral(), [], {
    transform: (d) => d.referral || d,
  });
}

// ─── NOTIFICATIONS HOOK ───────────────────────────────────────────────────────
export function useNotifications() {
  const result = useFetch(() => NOTIFICATIONS.list(), [], {
    transform: (d) => d.notifications || d,
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
