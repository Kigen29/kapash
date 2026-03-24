/**
 * Social Auth Service
 * Verifies Google and Apple OAuth tokens server-side
 */

import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface SocialProfile {
  provider: 'google' | 'apple';
  providerId: string;
  email?: string;
  name?: string;
  avatar?: string;
}

// ── Google ─────────────────────────────────────────────────────────────────────

export async function verifyGoogleToken(idToken: string): Promise<SocialProfile> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) throw new AppError('Invalid Google token.', 401);

    return {
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error('Google token verification failed:', err.message);
    throw new AppError('Google authentication failed. Please try again.', 401);
  }
}

// ── Apple ──────────────────────────────────────────────────────────────────────

export async function verifyAppleToken(
  identityToken: string,
  fullName?: { givenName?: string; familyName?: string },
): Promise<SocialProfile> {
  try {
    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: env.APPLE_BUNDLE_ID || 'com.kapash.app',
      ignoreExpiration: false,
    });

    if (!payload.sub) throw new AppError('Invalid Apple token.', 401);

    // Apple only sends name on first login — use what was provided
    const name = fullName?.givenName
      ? `${fullName.givenName} ${fullName.familyName || ''}`.trim()
      : undefined;

    return {
      provider: 'apple',
      providerId: payload.sub,
      email: payload.email,
      name,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error('Apple token verification failed:', err.message);
    throw new AppError('Apple authentication failed. Please try again.', 401);
  }
}