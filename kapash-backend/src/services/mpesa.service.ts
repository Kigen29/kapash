import axios from 'axios';
import redis, { REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

const BASE_URL = env.MPESA_ENVIRONMENT === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// ── Get OAuth Token ───────────────────────────────────────────────────────────
// Safaricom tokens last 60 minutes — we cache in Redis for 55 minutes

async function getMpesaToken(): Promise<string> {
  // Try cache first
  const cached = await redis.get(REDIS_KEYS.mpesaToken());
  if (cached) return cached;

  const credentials = Buffer.from(
    `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${credentials}` },
        timeout: 10000,
      }
    );

    const token = response.data.access_token;
    await redis.setex(REDIS_KEYS.mpesaToken(), REDIS_TTL.mpesaToken, token);

    return token;
  } catch (error: any) {
    logger.error('Failed to get M-Pesa token:', error.message);
    throw new AppError('M-Pesa service unavailable. Please try again.', 503);
  }
}

// ── Generate Password ─────────────────────────────────────────────────────────
// Format: Base64(ShortCode + Passkey + Timestamp)

function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date().toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);

  const password = Buffer.from(
    `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  return { password, timestamp };
}

// ── Initiate STK Push ─────────────────────────────────────────────────────────

interface StkPushParams {
  phone: string;      // +254712345678
  amount: number;     // Integer amount in KES
  bookingId: string;
  description: string;
}

export async function initiateMpesaStkPush(params: StkPushParams) {
  const token = await getMpesaToken();
  const { password, timestamp } = generatePassword();

  // Normalize phone: +254712345678 → 254712345678
  const phone = params.phone.replace('+', '');

  const payload = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: params.amount,
    PartyA: phone,
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: env.MPESA_CALLBACK_URL,
    AccountReference: `KAPASH-${params.bookingId.slice(0, 8).toUpperCase()}`,
    TransactionDesc: params.description.slice(0, 100),
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (response.data.ResponseCode !== '0') {
      throw new AppError(
        `M-Pesa error: ${response.data.ResponseDescription}`,
        400
      );
    }

    logger.info(`✅ STK Push initiated for booking ${params.bookingId}`);
    return response.data;

  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('STK Push failed:', error.response?.data || error.message);
    throw new AppError('Failed to initiate M-Pesa payment. Please try again.', 503);
  }
}

// ── Query STK Push Status ─────────────────────────────────────────────────────
// Use this to check payment status if callback is delayed

export async function queryStkPushStatus(checkoutRequestId: string) {
  const token = await getMpesaToken();
  const { password, timestamp } = generatePassword();

  try {
    const response = await axios.post(
      `${BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('STK Query failed:', error.response?.data || error.message);
    return null;
  }
}

// ── B2C Payment (Owner Payouts) ───────────────────────────────────────────────

export async function sendMpesaB2C(params: {
  phone: string;
  amount: number;
  payoutId: string;
  remarks: string;
}) {
  const token = await getMpesaToken();

  const phone = params.phone.replace('+', '');

  try {
    const response = await axios.post(
      `${BASE_URL}/mpesa/b2c/v3/paymentrequest`,
      {
        OriginatorConversationID: params.payoutId,
        InitiatorName: 'KapashAPI',
        SecurityCredential: env.MPESA_PASSKEY, // In prod, use encrypted credential
        CommandID: 'BusinessPayment',
        Amount: params.amount,
        PartyA: env.MPESA_SHORTCODE,
        PartyB: phone,
        Remarks: params.remarks.slice(0, 100),
        QueueTimeOutURL: env.MPESA_TIMEOUT_URL,
        ResultURL: `${env.MPESA_CALLBACK_URL}/b2c`,
        Occasion: `Kapash Payout ${params.payoutId.slice(0, 8)}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    logger.info(`✅ B2C payout initiated: ${params.payoutId}`);
    return response.data;
  } catch (error: any) {
    logger.error('B2C payout failed:', error.response?.data || error.message);
    throw new AppError('Payout failed. Will retry automatically.', 503);
  }
}