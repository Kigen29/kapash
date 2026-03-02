import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) {
      logger.error('Redis retry limit reached');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => {
  logger.error('Redis error:', err.message);
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

export async function connectRedis() {
  try {
    await redis.connect();
    logger.info('✅ Redis connected');
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    // Don't crash — app can work without Redis (degraded performance)
    logger.warn('⚠️  Running without Redis cache');
  }
}

// ── Redis Key Helpers ─────────────────────────────────────────────────────────

export const REDIS_KEYS = {
  // Slot holds: prevent double-booking during checkout
  slotHold: (slotId: string) => `slot:hold:${slotId}`,

  // OTP sessions
  otp: (phone: string) => `otp:${phone}`,

  // Pitch availability cache
  pitchAvailability: (pitchId: string, date: string) => `pitch:avail:${pitchId}:${date}`,

  // M-Pesa token cache
  mpesaToken: () => 'mpesa:token',

  // User session data
  userSession: (userId: string) => `user:session:${userId}`,

  // Rate limiting for OTP
  otpRateLimit: (phone: string) => `otp:rate:${phone}`,
};

export const REDIS_TTL = {
  slotHold: 60 * 10,         // 10 minutes
  otp: 60 * 5,               // 5 minutes
  pitchAvailability: 60 * 2, // 2 minutes
  mpesaToken: 60 * 55,       // 55 minutes (token valid 60min)
  userSession: 60 * 60 * 24, // 24 hours
  otpRateLimit: 60 * 15,     // 15 minutes
};

export default redis;