import { env } from '../config/env';
import { logger } from '../utils/logger';

// Lazy-load Firebase Admin to avoid crash if credentials not set
let admin: any = null;
let messaging: any = null;

function getFirebaseAdmin() {
  if (admin) return { admin, messaging };

  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase not configured — push notifications disabled');
    return { admin: null, messaging: null };
  }

  try {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    messaging = admin.messaging();
    return { admin, messaging };
  } catch (e) {
    logger.warn('Firebase initialization failed:', e);
    return { admin: null, messaging: null };
  }
}

// ── Send Single Push Notification ────────────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export async function sendPushNotification(
  fcmToken: string,
  payload: PushPayload
): Promise<boolean> {
  if (!fcmToken) return false;

  const { messaging } = getFirebaseAdmin();
  if (!messaging) return false;

  try {
    await messaging.send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'kapash_default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });

    logger.info(`✅ Push sent to ${fcmToken.slice(0, 20)}...`);
    return true;
  } catch (error: any) {
    if (error.code === 'messaging/registration-token-not-registered') {
      // Token is stale — caller should remove it from DB
      logger.warn(`Stale FCM token: ${fcmToken.slice(0, 20)}...`);
    } else {
      logger.error('Push notification failed:', error.message);
    }
    return false;
  }
}

// ── Send to Multiple Tokens ───────────────────────────────────────────────────

export async function sendMulticastPush(
  fcmTokens: string[],
  payload: PushPayload
): Promise<void> {
  if (!fcmTokens.length) return;

  const { messaging } = getFirebaseAdmin();
  if (!messaging) return;

  const validTokens = fcmTokens.filter(Boolean);
  if (!validTokens.length) return;

  // Firebase allows up to 500 tokens per multicast
  const BATCH_SIZE = 500;
  for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
    const batch = validTokens.slice(i, i + BATCH_SIZE);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: payload.title, body: payload.body },
        data: payload.data || {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });

      logger.info(`Multicast push: ${response.successCount}/${batch.length} delivered`);
    } catch (error: any) {
      logger.error('Multicast push failed:', error.message);
    }
  }
}