import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';
import { AppError } from './errors';

// ── Generate OTP ──────────────────────────────────────────────────────────────

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Generate Access + Refresh Tokens ─────────────────────────────────────────

export async function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign(
    { userId, role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as any
  );

  const refreshToken = jwt.sign(
    { userId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as any
  );

  // Store refresh token in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });

  // Clean up old refresh tokens for this user (keep last 5)
  const tokens = await prisma.refreshToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: 5,
    select: { id: true },
  });

  if (tokens.length > 0) {
    await prisma.refreshToken.deleteMany({
      where: { id: { in: tokens.map(t => t.id) } },
    });
  }

  return { accessToken, refreshToken };
}

// ── Verify Tokens ─────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): { userId: string; role: string } {
  try {
    return jwt.verify(token, env.JWT_SECRET) as any;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') throw new AppError('Token expired.', 401);
    throw new AppError('Invalid token.', 401);
  }
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;

    // Verify it exists in DB and is not expired
    const stored = await prisma.refreshToken.findFirst({
      where: {
        token,
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) throw new AppError('Refresh token invalid or expired.', 401);

    // Rotate: delete old, generate new (handled in caller)
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    return { userId: payload.userId };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid refresh token.', 401);
  }
}