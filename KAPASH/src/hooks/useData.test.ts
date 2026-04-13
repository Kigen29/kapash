/**
 * Tests for useData hooks — transform functions and envelope unwrapping.
 *
 * We test the transform logic in isolation (pure functions) to avoid
 * mounting React hooks in the test environment.
 */

// ─── usePitches transform ──────────────────────────────────────────────────────

const pitchesTransform = (d: any) => ({
  pitches: Array.isArray(d.pitches) ? d.pitches : Array.isArray(d.data) ? d.data : [],
  total: d.pagination?.total ?? d.total ?? 0,
  page: d.pagination?.page ?? d.page ?? 1,
});

describe('usePitches transform', () => {
  const mockPitch = { id: '1', name: 'Westlands Arena', pricePerHour: 2500 };

  it('returns pitches array from d.pitches', () => {
    const result = pitchesTransform({ pitches: [mockPitch], pagination: { total: 1, page: 1 } });
    expect(result.pitches).toEqual([mockPitch]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it('falls back to d.data when d.pitches is absent', () => {
    const result = pitchesTransform({ data: [mockPitch] });
    expect(result.pitches).toEqual([mockPitch]);
  });

  it('returns empty array when neither d.pitches nor d.data exists', () => {
    const result = pitchesTransform({});
    expect(result.pitches).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
  });

  it('handles null/undefined gracefully', () => {
    const result = pitchesTransform({ pitches: null });
    expect(result.pitches).toEqual([]);
  });
});

// ─── useReferral transform ─────────────────────────────────────────────────────

const referralTransform = (d: any) => ({
  referralCode:        d.referralCode        ?? null,
  referralCount:       d.referralCount       ?? 0,
  earningsPerReferral: d.earningsPerReferral ?? 500,
  totalEarned:         d.totalEarned         ?? 0,
});

describe('useReferral transform', () => {
  it('maps backend fields correctly', () => {
    const result = referralTransform({
      referralCode: 'ALICE20',
      referralCount: 3,
      earningsPerReferral: 500,
      totalEarned: 1500,
    });
    expect(result.referralCode).toBe('ALICE20');
    expect(result.referralCount).toBe(3);
    expect(result.totalEarned).toBe(1500);
  });

  it('falls back to defaults when fields are missing', () => {
    const result = referralTransform({});
    expect(result.referralCode).toBeNull();
    expect(result.referralCount).toBe(0);
    expect(result.earningsPerReferral).toBe(500);
    expect(result.totalEarned).toBe(0);
  });
});

// ─── useFetch envelope unwrapping ─────────────────────────────────────────────

describe('useFetch envelope unwrapping', () => {
  // The unwrap logic from useFetch: raw = res.data?.data ?? res.data
  function unwrap(res: any) {
    return res.data?.data ?? res.data;
  }

  it('unwraps nested data envelope { data: { data: {...} } }', () => {
    const res = { data: { data: { id: '1' } } };
    expect(unwrap(res)).toEqual({ id: '1' });
  });

  it('falls back to res.data when no nested data key', () => {
    const res = { data: { id: '1' } };
    expect(unwrap(res)).toEqual({ id: '1' });
  });

  it('returns undefined gracefully when data is missing', () => {
    const res = {};
    expect(unwrap(res)).toBeUndefined();
  });
});
