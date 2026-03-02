import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import redis, { REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { generateOTP, generateTokens, verifyRefreshToken } from '../utils/auth';
import { sendSMS } from '../services/sms.service';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

// ── Schemas ───────────────────────────────────────────────────────────────────

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+254[0-9]{9}$/, 'Phone must be in format +254XXXXXXXXX'),
  name: z.string().min(2).optional(),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+254[0-9]{9}$/),
  otp: z.string().length(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Send OTP ─────────────────────────────────────────────────────────────────

export async function sendOtp(req: Request, res: Response) {
  const { phone, name } = sendOtpSchema.parse(req.body);

  // Rate limit: max 3 OTP requests per 15 minutes per phone
  const rateLimitKey = REDIS_KEYS.otpRateLimit(phone);
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) {
    await redis.expire(rateLimitKey, REDIS_TTL.otpRateLimit);
  }
  if (attempts > 3) {
    throw new AppError('Too many OTP requests. Please wait 15 minutes.', 429);
  }

  // Generate 6-digit OTP
  const otp = generateOTP();
  const otpKey = REDIS_KEYS.otp(phone);

  // Store in Redis (overwrites previous)
  await redis.setex(otpKey, REDIS_TTL.otp, JSON.stringify({ otp, attempts: 0 }));

  // Check if user exists to determine message
  const existingUser = await prisma.user.findUnique({ where: { phone } });
  const isNewUser = !existingUser;

  // Send SMS
  if (env.NODE_ENV === 'production') {
    await sendSMS(
      phone,
      `Your Kapash verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`
    );
  } else {
    // In development, log the OTP instead of sending SMS
    console.log(`\n🔑 DEV OTP for ${phone}: ${otp}\n`);
  }

  res.json({
    success: true,
    message: `OTP sent to ${phone}`,
    isNewUser,
    // Only include OTP in development for testing
    ...(env.NODE_ENV === 'development' && { devOtp: otp }),
  });
}

// ── Verify OTP & Login/Register ───────────────────────────────────────────────

export async function verifyOtp(req: Request, res: Response) {
  const { phone, otp } = verifyOtpSchema.parse(req.body);

  // Get OTP from Redis
  const otpKey = REDIS_KEYS.otp(phone);
  const stored = await redis.get(otpKey);

  if (!stored) {
    throw new AppError('OTP expired or not found. Please request a new one.', 400);
  }

  const { otp: storedOtp, attempts } = JSON.parse(stored);

  // Max 3 wrong attempts
  if (attempts >= 3) {
    await redis.del(otpKey);
    throw new AppError('Too many wrong attempts. Please request a new OTP.', 400);
  }

  if (storedOtp !== otp) {
    // Increment attempts
    await redis.setex(
      otpKey,
      REDIS_TTL.otp,
      JSON.stringify({ otp: storedOtp, attempts: attempts + 1 })
    );
    throw new AppError(`Incorrect OTP. ${2 - attempts} attempt(s) remaining.`, 400);
  }

  // OTP correct — delete it
  await redis.del(otpKey);

  // Find or create user
  let user = await prisma.user.findUnique({ where: { phone } });
  const isNewUser = !user;

  if (!user) {
    // New user — require name from body
    const name = req.body.name;
    if (!name || name.length < 2) {
      throw new AppError('Name is required for new users.', 400);
    }
    user = await prisma.user.create({
      data: { phone, name, isVerified: true },
    });
  } else {
    // Mark as verified if not already
    if (!user.isVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }
  }

  // Generate JWT tokens
  const { accessToken, refreshToken } = await generateTokens(user.id, user.role);

  res.json({
    success: true,
    message: isNewUser ? 'Account created successfully!' : 'Logged in successfully!',
    isNewUser,
    data: {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        referralCode: user.referralCode,
      },
      accessToken,
      refreshToken,
    },
  });
}

// ── Refresh Token ─────────────────────────────────────────────────────────────

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken: token } = refreshSchema.parse(req.body);

  const payload = await verifyRefreshToken(token);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated.', 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
    user.id,
    user.role
  );

  res.json({
    success: true,
    data: { accessToken, refreshToken: newRefreshToken },
  });
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response) {
  const { refreshToken: token } = refreshSchema.parse(req.body);

  // Delete refresh token from DB
  await prisma.refreshToken.deleteMany({ where: { token } });

  res.json({ success: true, message: 'Logged out successfully.' });
}