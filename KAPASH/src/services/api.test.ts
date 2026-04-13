/**
 * Tests for api.ts — token management and apiFetch retry logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenStorage, STORAGE_KEYS, apiFetch } from './api';

// ─── TokenStorage ─────────────────────────────────────────────────────────────

describe('TokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('setTokens stores both access and refresh token', async () => {
    await TokenStorage.setTokens('access-abc', 'refresh-xyz');
    expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
      [STORAGE_KEYS.ACCESS_TOKEN, 'access-abc'],
      [STORAGE_KEYS.REFRESH_TOKEN, 'refresh-xyz'],
    ]);
  });

  it('clearTokens removes all three keys', async () => {
    await TokenStorage.clearTokens();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  });

  it('getAccessToken returns stored value', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('my-token');
    const token = await TokenStorage.getAccessToken();
    expect(token).toBe('my-token');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
  });

  it('getRefreshToken returns stored value', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('my-refresh');
    const token = await TokenStorage.getRefreshToken();
    expect(token).toBe('my-refresh');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
  });
});

// ─── apiFetch retry on 401 ────────────────────────────────────────────────────

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('retries with refreshed token on 401 response', async () => {
    // First call → 401, second call (after refresh) → 200
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce('stale-token')    // getAccessToken for initial request
      .mockResolvedValueOnce('refresh-token')  // getRefreshToken for refresh
      .mockResolvedValueOnce('new-token');      // getAccessToken for retry

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1) {
        // Initial request — unauthorized
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Unauthorized' }),
        });
      }
      if (url.includes('/auth/refresh')) {
        // Refresh call
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { accessToken: 'new-token', refreshToken: 'new-refresh' } }),
        });
      }
      // Retry with new token
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { id: '1' } }),
      });
    }) as any;

    const result = await apiFetch('/pitches');
    expect(result.status).toBe(200);
    // fetch called at least twice (initial + retry)
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
