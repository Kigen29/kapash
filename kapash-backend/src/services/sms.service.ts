import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const AT_BASE_URL =
  env.AT_USERNAME === 'sandbox'
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

// ── Main Send Function ────────────────────────────────────────────────────────

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!phone || !message) return false;

  // ✅ ALWAYS skip in development unless FORCE_SMS=true in .env
  const isDev = process.env.NODE_ENV !== 'production';
  const forceSms = process.env.FORCE_SMS === 'true';

  if (isDev && !forceSms) {
    logger.info(`📱 [DEV SMS SKIPPED] To: ${phone}\nMessage: ${message}`);
    return true;
  }

  // Skip if credentials not configured
  if (!env.AT_API_KEY || env.AT_API_KEY === 'your_key_here' || env.AT_API_KEY === 'placeholder') {
    logger.warn(`⚠️ SMS skipped — AT_API_KEY not configured. To: ${phone}`);
    return false;
  }

  try {
    const response = await axios.post(
      AT_BASE_URL,
      new URLSearchParams({
        username: env.AT_USERNAME,
        to: phone,
        message,
        from: env.AT_SENDER_ID || 'Kapash',
      }).toString(),
      {
        headers: {
          apiKey: env.AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        timeout: 8000, // 8s max — never block a request longer than this
      }
    );

    const result = response.data?.SMSMessageData?.Recipients?.[0];
    if (result?.status === 'Success') {
      logger.info(`✅ SMS sent to ${phone}`);
      return true;
    } else {
      logger.warn(`⚠️ SMS delivery issue to ${phone}: ${result?.status}`);
      return false;
    }
  } catch (error: any) {
    // IMPORTANT: never throw — SMS failure must never crash or block the app
    logger.error(`❌ SMS failed to ${phone}: ${error.message}`);
    return false;
  }
}

// ── Bulk SMS ──────────────────────────────────────────────────────────────────

export async function sendBulkSMS(
  recipients: { phone: string; message: string }[]
): Promise<void> {
  const BATCH_SIZE = 10;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map(r => sendSMS(r.phone, r.message)));
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// ── SMS Templates ─────────────────────────────────────────────────────────────

export const SMS_TEMPLATES = {
  bookingConfirmed: (pitchName: string, date: string, time: string, ref: string) =>
    `✅ Booking Confirmed!\n${pitchName}\n${date} at ${time}\nRef: ${ref}\nSee you on the pitch! - Kapash`,

  bookingCancelled: (pitchName: string, date: string, refund: number) =>
    `❌ Booking Cancelled\n${pitchName} on ${date}\n${
      refund > 0 ? `Refund of KES ${refund} processed within 24hrs.` : 'No refund applies.'
    }\n- Kapash`,

  paymentFailed: (pitchName: string) =>
    `⚠️ Payment failed for ${pitchName}. Please try again or contact support@kapash.co.ke`,

  newBookingOwner: (customerName: string, date: string, time: string, amount: number) =>
    `📅 New Booking!\n${customerName} booked your pitch\n${date} at ${time}\nKES ${amount} payout in 48hrs\n- Kapash`,

  payoutSent: (amount: number) =>
    `💰 Payout Sent! KES ${amount} sent to your M-Pesa. Thank you for hosting on Kapash!`,

  otpMessage: (otp: string) =>
    `Your Kapash verification code is: ${otp}\nValid for 5 minutes. Do not share this.\n- Kapash`,

  referralEarned: (amount: number, totalEarned: number) =>
    `🎉 You earned KES ${amount} from a referral!\nTotal earnings: KES ${totalEarned}\nKeep sharing Kapash!`,

  welcomeMessage: (name: string) =>
    `👋 Welcome to Kapash, ${name}!\nBook football pitches instantly across Kenya.\nDownload the app: kapash.co.ke\n- Kapash`,
};