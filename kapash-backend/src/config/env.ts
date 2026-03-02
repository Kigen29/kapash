import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_VERSION: z.string().default('v1'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  APP_NAME: z.string().default('Kapash'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  MPESA_CONSUMER_KEY: z.string().default(''),
  MPESA_CONSUMER_SECRET: z.string().default(''),
  MPESA_PASSKEY: z.string().default(''),
  MPESA_SHORTCODE: z.string().default('174379'),
  MPESA_ENVIRONMENT: z.enum(['sandbox', 'live']).default('sandbox'),
  MPESA_CALLBACK_URL: z.string().default(''),
  MPESA_TIMEOUT_URL: z.string().default(''),

  AT_API_KEY: z.string().default(''),
  AT_USERNAME: z.string().default('sandbox'),
  AT_SENDER_ID: z.string().default('KAPASH'),

  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  FIREBASE_PROJECT_ID: z.string().default(''),
  FIREBASE_PRIVATE_KEY: z.string().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().default(''),

  KAPASH_COMMISSION_RATE: z.coerce.number().default(0.13),
  SLOT_HOLD_MINUTES: z.coerce.number().default(10),
  PAYOUT_DAYS: z.coerce.number().default(2),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;