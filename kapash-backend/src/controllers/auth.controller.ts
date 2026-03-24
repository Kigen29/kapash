import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import redis, { REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { generateOTP, generateTokens, verifyRefreshToken } from '../utils/auth';
import { sendSMS } from '../services/sms.service';
import { verifyGoogleToken, verifyAppleToken } from '../services/social_auth.service';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

// ── Schemas ───────────────────────────────────────────────────────────────────

const sendOtpSchema = z.object({
  phone: z.string()
    .regex(/^\+254[0-9]{9}$/, 'Phone must be in format +254XXXXXXXXX')
    .transform(v => v.trim()),
  name: z.string().min(2).max(100).optional()
    .transform(v => v?.trim()),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+254[0-9]{9}$/),
  otp: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
  name: z.string().min(2).max(100).optional()
    .transform(v => v?.trim()),
});

const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple']),
  token: z.string().min(1),
  fullName: z.object({
    givenName: z.string().optional(),
    familyName: z.string().optional(),
  }).optional(),
});

const linkPhoneSchema = z.object({
  phone: z.string().regex(/^\+254[0-9]{9}$/, 'Phone must be +254XXXXXXXXX'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function checkOtpRateLimit(phone: string) {
  const rateLimitKey = REDIS_KEYS.otpRateLimit(phone);
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) await redis.expire(rateLimitKey, REDIS_TTL.otpRateLimit);
  if (attempts > 3) throw new AppError('Too many OTP requests. Please wait 15 minutes.', 429);
}

function buildUserResponse(user: any) {
  return {
    id:            user.id,
    name:          user.name,
    phone:         user.phone,
    email:         user.email,
    role:          user.role,
    avatar:        user.avatar,
    referralCode:  user.referralCode,
    isVerified:    user.isVerified,
    phoneVerified: user.phoneVerified ?? false,
    walletBalance: user.walletBalance ?? 0,
  };
}

async function issueTokensForUser(
  res: Response,
  userId: string,
  role: string,
  isNewUser: boolean,
  user: any,
  extra?: Record<string, any>,
) {
  const { accessToken, refreshToken } = await generateTokens(userId, role);
  res.json({
    success: true,
    isNewUser,
    ...extra,
    data: {
      user: buildUserResponse(user),
      accessToken,
      refreshToken,
    },
  });
}

// ── Send OTP ──────────────────────────────────────────────────────────────────

export async function sendOtp(req: Request, res: Response) {
  const { phone, name } = sendOtpSchema.parse(req.body);

  await checkOtpRateLimit(phone);

  const otp = generateOTP();
  await redis.setex(REDIS_KEYS.otp(phone), REDIS_TTL.otp, JSON.stringify({ otp, attempts: 0 }));

  const existingUser = await prisma.user.findUnique({ where: { phone } });
  const isNewUser = !existingUser;

  if (env.NODE_ENV === 'production') {
    await sendSMS(phone, `Your Kapash verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`);
  } else {
    console.log(`\n🔑 DEV OTP for ${phone}: ${otp}\n`);
  }

  res.json({
    success: true,
    message: `OTP sent to ${phone}`,
    isNewUser,
    ...(env.NODE_ENV === 'development' && { devOtp: otp }),
  });
}

// ── Verify OTP ────────────────────────────────────────────────────────────────

export async function verifyOtp(req: Request, res: Response) {
  const { phone, otp, name } = verifyOtpSchema.parse(req.body);

  const otpKey = REDIS_KEYS.otp(phone);
  const stored = await redis.get(otpKey);
  if (!stored) throw new AppError('OTP expired or not found. Please request a new one.', 400);

  const { otp: storedOtp, attempts } = JSON.parse(stored);

  if (attempts >= 3) {
    await redis.del(otpKey);
    throw new AppError('Too many wrong attempts. Please request a new OTP.', 400);
  }

  if (storedOtp !== otp) {
    await redis.setex(otpKey, REDIS_TTL.otp, JSON.stringify({ otp: storedOtp, attempts: attempts + 1 }));
    throw new AppError(`Incorrect OTP. ${2 - attempts} attempt(s) remaining.`, 400);
  }

  await redis.del(otpKey);

  let user = await (prisma.user as any).findUnique({ where: { phone } });
  const isNewUser = !user;

  if (!user) {
    if (!name || name.length < 2) throw new AppError('Name is required for new users.', 400);
    user = await (prisma.user as any).create({
      data: { phone, name, isVerified: true, phoneVerified: true },
    });
  } else {
    user = await (prisma.user as any).update({
      where: { id: user.id },
      data: { isVerified: true, phoneVerified: true },
    });
  }

  await issueTokensForUser(res, user.id, user.role, isNewUser, user);
}

// ── Social Login ──────────────────────────────────────────────────────────────

export async function socialLogin(req: Request, res: Response) {
  const { provider, token, fullName } = socialLoginSchema.parse(req.body);

  let profile;
  if (provider === 'google') {
    profile = await verifyGoogleToken(token);
  } else {
    profile = await verifyAppleToken(token, fullName);
  }

  const { providerId, email, name: socialName, avatar } = profile;

  // 1. Find by social ID
  const findWhere = provider === 'google' ? { googleId: providerId } : { appleId: providerId };
  const existingBySocialId = await (prisma.user as any).findFirst({ where: findWhere });

  if (existingBySocialId) {
    await issueTokensForUser(res, existingBySocialId.id, existingBySocialId.role, false, existingBySocialId);
    return;
  }

  // 2. Find by email → link accounts
  const userByEmail = email
    ? await (prisma.user as any).findUnique({ where: { email } })
    : null;

  if (userByEmail) {
    const updateData = provider === 'google'
      ? { googleId: providerId, ...(avatar && !userByEmail.avatar ? { avatar } : {}) }
      : { appleId: providerId };
    const updated = await (prisma.user as any).update({ where: { id: userByEmail.id }, data: updateData });
    await issueTokensForUser(res, updated.id, updated.role, false, updated);
    return;
  }

  // 3. New user — create without phone
  const createData: Record<string, any> = {
    name:          socialName || 'Kapash User',
    email:         email || undefined,
    avatar:        avatar || undefined,
    phoneVerified: false,
    isVerified:    false,
  };
  if (provider === 'google') createData.googleId = providerId;
  else createData.appleId = providerId;

  const newUser = await (prisma.user as any).create({ data: createData });

  // Signal frontend that phone verification is needed before booking
  const { accessToken, refreshToken } = await generateTokens(newUser.id, newUser.role);
  res.json({
    success: true,
    isNewUser: true,
    requiresPhoneVerification: true,
    data: {
      user: buildUserResponse(newUser),
      accessToken,
      refreshToken,
    },
  });
}

// ── Send Phone Link OTP ───────────────────────────────────────────────────────

export async function sendPhoneLinkOtp(req: Request, res: Response) {
  const { phone } = linkPhoneSchema.parse(req.body);
  const userId = (req as any).user?.id;
  if (!userId) throw new AppError('Authentication required.', 401);

  const existing = await (prisma.user as any).findUnique({ where: { phone } });
  if (existing && existing.id !== userId) {
    throw new AppError('This phone number is already linked to another account.', 409);
  }

  await checkOtpRateLimit(phone);

  const otp = generateOTP();
  await redis.setex(REDIS_KEYS.otp(phone), REDIS_TTL.otp, JSON.stringify({ otp, attempts: 0 }));

  if (env.NODE_ENV === 'production') {
    await sendSMS(phone, `Your Kapash verification code is: ${otp}. Valid for 5 minutes.`);
  } else {
    console.log(`\n🔑 DEV PHONE LINK OTP for ${phone}: ${otp}\n`);
  }

  res.json({
    success: true,
    message: `Verification code sent to ${phone}`,
    ...(env.NODE_ENV === 'development' && { devOtp: otp }),
  });
}

// ── Verify Phone Link ─────────────────────────────────────────────────────────

export async function verifyPhoneLink(req: Request, res: Response) {
  const { phone, otp } = verifyOtpSchema.parse(req.body);
  const userId = (req as any).user?.id;
  if (!userId) throw new AppError('Authentication required.', 401);

  const otpKey = REDIS_KEYS.otp(phone);
  const stored = await redis.get(otpKey);
  if (!stored) throw new AppError('OTP expired. Please request a new one.', 400);

  const { otp: storedOtp, attempts } = JSON.parse(stored);

  if (attempts >= 3) {
    await redis.del(otpKey);
    throw new AppError('Too many wrong attempts.', 400);
  }
  if (storedOtp !== otp) {
    await redis.setex(otpKey, REDIS_TTL.otp, JSON.stringify({ otp: storedOtp, attempts: attempts + 1 }));
    throw new AppError(`Incorrect OTP. ${2 - attempts} attempt(s) remaining.`, 400);
  }

  await redis.del(otpKey);

  const existing = await (prisma.user as any).findUnique({ where: { phone } });
  if (existing && existing.id !== userId) {
    throw new AppError('This phone number is already linked to another account.', 409);
  }

  const user = await (prisma.user as any).update({
    where: { id: userId },
    data: { phone, phoneVerified: true, isVerified: true },
  });

  res.json({
    success: true,
    message: 'Phone verified and linked to your account.',
    data: { user: buildUserResponse(user) },
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

  if (!user || !user.isActive) throw new AppError('User not found or deactivated.', 401);

  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user.id, user.role);
  res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response) {
  const { refreshToken: token } = refreshSchema.parse(req.body);
  await prisma.refreshToken.deleteMany({ where: { token } });
  res.json({ success: true, message: 'Logged out successfully.' });
}