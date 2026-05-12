import { Router, Response, Request } from 'express';
import { z } from 'zod';
import {
  authenticate, requireCorporate, requireCorporateAdmin, AuthRequest,
} from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import redis, { REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { generateOTP, generateTokens } from '../utils/auth';
import { sendSMS } from '../services/sms.service';
import { env } from '../config/env';

const router = Router();

// ─── PUBLIC: CORPORATE SIGNUP ─────────────────────────────────────────────────

const signupSchema = z.object({
  company: z.string().min(2).max(120),
  tradingName: z.string().max(120).optional(),
  contactName: z.string().min(2).max(100),
  phone: z.string().regex(/^\+254\d{9}$/),
  email: z.string().email(),
  billingAddress: z.string().min(5).max(500),
  kraPin: z.string().max(20).optional(),
});

router.post('/signup', async (req: Request, res: Response) => {
  const data = signupSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existingUser && existingUser.corporateId) {
    throw new AppError('This phone is already linked to a corporate account.', 409);
  }
  const existingCorp = await prisma.corporate.findUnique({ where: { email: data.email } });
  if (existingCorp) throw new AppError('A corporate with this email already exists.', 409);

  // Send OTP for phone verification
  const otp = generateOTP();
  await redis.setex(REDIS_KEYS.otp(data.phone), REDIS_TTL.otp, JSON.stringify({ otp, attempts: 0, corporateSignup: data }));

  if (env.NODE_ENV === 'production') {
    await sendSMS(data.phone, `Your KAPASH corporate signup code is: ${otp}. Valid for 5 minutes.`);
  } else {
    console.log(`\n🔑 DEV CORPORATE OTP for ${data.phone}: ${otp}\n`);
  }

  res.json({
    success: true,
    message: 'Verification code sent. Enter the OTP to complete signup.',
    ...(env.NODE_ENV === 'development' && { devOtp: otp }),
  });
});

const verifySignupSchema = z.object({
  phone: z.string().regex(/^\+254\d{9}$/),
  otp: z.string().length(6).regex(/^\d{6}$/),
});

router.post('/signup/verify', async (req: Request, res: Response) => {
  const { phone, otp } = verifySignupSchema.parse(req.body);
  const stored = await redis.get(REDIS_KEYS.otp(phone));
  if (!stored) throw new AppError('OTP expired or not found.', 400);
  const { otp: storedOtp, corporateSignup } = JSON.parse(stored);
  if (otp !== storedOtp) throw new AppError('Incorrect OTP.', 400);
  if (!corporateSignup) throw new AppError('No corporate signup in progress for this phone.', 400);

  await redis.del(REDIS_KEYS.otp(phone));

  // Create corporate + user atomically
  const result = await prisma.$transaction(async (tx) => {
    const corp = await tx.corporate.create({
      data: {
        name: corporateSignup.company,
        tradingName: corporateSignup.tradingName,
        email: corporateSignup.email,
        phone: corporateSignup.phone,
        billingAddress: corporateSignup.billingAddress,
        kraPin: corporateSignup.kraPin,
      },
    });
    let user = await tx.user.findUnique({ where: { phone } });
    if (user) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          corporateId: corp.id,
          isCorpAdmin: true,
          name: corporateSignup.contactName,
          phoneVerified: true,
          isVerified: true,
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          name: corporateSignup.contactName,
          phone, email: corporateSignup.email,
          role: 'PLAYER',
          corporateId: corp.id, isCorpAdmin: true,
          isVerified: true, phoneVerified: true,
        },
      });
    }
    return { corp, user };
  });

  const { accessToken, refreshToken } = await generateTokens(result.user.id, result.user.role);
  res.json({
    success: true,
    data: {
      user: result.user,
      corporate: result.corp,
      accessToken, refreshToken,
    },
  });
});

// ─── AUTHENTICATED: CORPORATE MEMBER ──────────────────────────────────────────
router.use(authenticate, requireCorporate);

router.get('/me', async (req: AuthRequest, res: Response) => {
  const corp = await prisma.corporate.findUnique({
    where: { id: req.user!.corporateId! },
    include: {
      _count: { select: { bookers: true, events: true, invoices: true } },
    },
  });
  res.json({ success: true, data: { corporate: corp, isCorpAdmin: req.user!.isCorpAdmin } });
});

// Corporate-admin only from here
const corpAdminRouter = Router();
corpAdminRouter.use(requireCorporateAdmin);

const updateCorpSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  tradingName: z.string().max(120).nullable().optional(),
  email: z.string().email().optional(),
  billingAddress: z.string().min(5).max(500).optional(),
  kraPin: z.string().max(20).nullable().optional(),
});
corpAdminRouter.patch('/me', async (req: AuthRequest, res: Response) => {
  const data = updateCorpSchema.parse(req.body);
  const corp = await prisma.corporate.update({
    where: { id: req.user!.corporateId! },
    data: {
      ...data,
      tradingName: data.tradingName ?? undefined,
      kraPin: data.kraPin ?? undefined,
    },
  });
  res.json({ success: true, data: corp });
});

corpAdminRouter.get('/me/bookers', async (req: AuthRequest, res: Response) => {
  const bookers = await prisma.user.findMany({
    where: { corporateId: req.user!.corporateId! },
    select: { id: true, name: true, phone: true, email: true, isCorpAdmin: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: bookers });
});

const addBookerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+254\d{9}$/),
  email: z.string().email().optional(),
  isCorpAdmin: z.boolean().default(false),
});
corpAdminRouter.post('/me/bookers', async (req: AuthRequest, res: Response) => {
  const data = addBookerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing && existing.corporateId && existing.corporateId !== req.user!.corporateId) {
    throw new AppError('This user belongs to another corporate.', 409);
  }
  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: { corporateId: req.user!.corporateId!, isCorpAdmin: data.isCorpAdmin },
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: data.name, phone: data.phone, email: data.email,
        role: 'PLAYER',
        corporateId: req.user!.corporateId!, isCorpAdmin: data.isCorpAdmin,
        isVerified: true, phoneVerified: true,
      },
    });
  }
  res.status(201).json({ success: true, data: user });
});

corpAdminRouter.delete('/me/bookers/:userId', async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  if (userId === req.user!.id) throw new AppError('Cannot remove yourself. Transfer admin first.', 400);
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.corporateId !== req.user!.corporateId) throw new AppError('Booker not found.', 404);
  await prisma.user.update({ where: { id: userId }, data: { corporateId: null, isCorpAdmin: false } });
  res.json({ success: true });
});

router.use(corpAdminRouter);

// Events — bookers + admins can create/list, only admin can cancel
router.get('/me/events', async (req: AuthRequest, res: Response) => {
  const events = await prisma.bookingEvent.findMany({
    where: { corporateId: req.user!.corporateId! },
    include: {
      _count: { select: { bookings: true } },
      invoice: { select: { id: true, number: true, status: true, total: true } },
    },
    orderBy: { date: 'desc' },
  });
  res.json({ success: true, data: events });
});

const createEventSchema = z.object({
  name: z.string().min(2).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
  bookings: z.array(z.object({
    pitchId: z.string().uuid(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1).max(20),
});
router.post('/me/events', async (req: AuthRequest, res: Response) => {
  const data = createEventSchema.parse(req.body);
  const eventDate = new Date(data.date);
  const corporateId = req.user!.corporateId!;
  const organizerId = req.user!.id;

  const event = await prisma.$transaction(async (tx) => {
    const ev = await tx.bookingEvent.create({
      data: {
        name: data.name, date: eventDate,
        organizerId, corporateId, notes: data.notes,
        status: 'CONFIRMED',
      },
    });
    let total = 0;
    for (const b of data.bookings) {
      const pitch = await tx.pitch.findUnique({ where: { id: b.pitchId }, select: { id: true, name: true, address: true, pricePerHour: true, commissionRate: true, status: true } });
      if (!pitch) throw new AppError(`Pitch ${b.pitchId} not found.`, 404);
      if (pitch.status !== 'ACTIVE') throw new AppError(`Pitch "${pitch.name}" is not available.`, 400);

      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      const durationMins = (eh * 60 + em) - (sh * 60 + sm);
      if (durationMins <= 0) throw new AppError('Invalid time range.', 400);

      const slot = await tx.timeSlot.upsert({
        where: { pitchId_date_startTime: { pitchId: pitch.id, date: eventDate, startTime: b.startTime } },
        update: { status: 'BOOKED', endTime: b.endTime },
        create: { pitchId: pitch.id, date: eventDate, startTime: b.startTime, endTime: b.endTime, status: 'BOOKED' },
      });
      const existing = await tx.booking.findUnique({ where: { slotId: slot.id } });
      if (existing) throw new AppError(`Slot ${pitch.name} @ ${b.startTime} already booked.`, 409);

      const subtotal = pitch.pricePerHour * (durationMins / 60);
      const commission = subtotal * pitch.commissionRate;
      const ownerAmt = subtotal - commission;
      total += subtotal;

      await tx.booking.create({
        data: {
          userId: organizerId, pitchId: pitch.id, slotId: slot.id,
          pitchName: pitch.name, pitchAddress: pitch.address,
          date: eventDate, startTime: b.startTime, endTime: b.endTime,
          durationMins, pricePerHour: pitch.pricePerHour,
          totalAmount: subtotal, commissionAmount: commission, ownerAmount: ownerAmt,
          status: 'CONFIRMED',
          eventId: ev.id, corporateId,
        },
      });
    }
    return tx.bookingEvent.update({ where: { id: ev.id }, data: { totalAmount: total } });
  });

  res.status(201).json({ success: true, data: event });
});

router.get('/me/invoices', async (req: AuthRequest, res: Response) => {
  const invoices = await prisma.invoice.findMany({
    where: { corporateId: req.user!.corporateId! },
    include: { event: { select: { id: true, name: true, date: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: invoices });
});

export default router;
