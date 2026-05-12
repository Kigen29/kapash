import { Router, Response, Request } from 'express';
import { z } from 'zod';
import {
  Prisma, PitchStatus, BookingStatus, PayoutStatus, UserRole, NotificationType, AdminTier,
} from '@prisma/client';
import {
  authenticate, requireAdmin, requireAdminTier, AuthRequest,
} from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { logAdminAction } from '../utils/audit';
import { broadcastNotification, BroadcastAudience } from '../services/broadcast.service';

const router = Router();
router.use(authenticate, requireAdmin);

// ─── STATS ────────────────────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  const [totalUsers, totalPitches, activePitches, pendingPitches, totalBookings, confirmedBookings, revenue, pendingPayouts, totalCorporates, totalInvoices] = await Promise.all([
    prisma.user.count(),
    prisma.pitch.count(),
    prisma.pitch.count({ where: { status: 'ACTIVE' } }),
    prisma.pitch.count({ where: { status: 'PENDING_VERIFICATION' } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.payout.count({ where: { status: 'PENDING' } }),
    prisma.corporate.count({ where: { status: 'ACTIVE' } }),
    prisma.invoice.count({ where: { status: { in: ['SENT', 'OVERDUE'] } } }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers, totalPitches, activePitches, pendingPitches,
      totalBookings, confirmedBookings,
      totalRevenue: revenue._sum.amount || 0,
      pendingPayouts, totalCorporates, totalInvoices,
    },
  });
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
router.get('/analytics', async (req: Request, res: Response) => {
  const period = Math.max(1, Math.min(365, Number(req.query.period) || 30));
  const compareTo = (req.query.compareTo as string) || null;
  const corporateId = req.query.corporateId as string | undefined;
  const pitchType = req.query.pitchType as string | undefined;
  const city = req.query.city as string | undefined;

  const now = new Date();
  const from = new Date(now); from.setDate(from.getDate() - period);
  const compareFrom = compareTo === 'previousPeriod'
    ? new Date(from.getTime() - period * 86400000)
    : null;

  const buildWhere = (fromDate: Date, toDate: Date) => {
    const w: Prisma.BookingWhereInput = {
      status: { in: ['CONFIRMED', 'COMPLETED'] },
      createdAt: { gte: fromDate, lt: toDate },
    };
    if (corporateId) w.corporateId = corporateId;
    if (pitchType) w.pitch = { type: pitchType as any };
    if (city) w.pitch = { ...(w.pitch as any), city: { contains: city, mode: 'insensitive' } };
    return w;
  };

  const [bookings, prevBookings, newUsers, usersByRole, pendingPayoutsCount, failedPayments, pendingPitches] = await Promise.all([
    prisma.booking.findMany({
      where: buildWhere(from, now),
      select: {
        totalAmount: true, commissionAmount: true, ownerAmount: true,
        status: true, date: true, startTime: true, pitchId: true, corporateId: true,
        pitch: { select: { name: true, ownerId: true, type: true, city: true, owner: { select: { name: true } } } },
      },
    }),
    compareFrom
      ? prisma.booking.findMany({
          where: buildWhere(compareFrom, from),
          select: { totalAmount: true, commissionAmount: true, ownerAmount: true },
        })
      : Promise.resolve([] as any[]),
    prisma.user.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true, role: true } }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.payout.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'FAILED', createdAt: { gte: from } } }),
    prisma.pitch.count({ where: { status: 'PENDING_VERIFICATION' } }),
  ]);

  const groupBy = (req.query.groupBy as string) || 'day';
  const bucketOf = (d: Date) => {
    if (groupBy === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (groupBy === 'week') {
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    return d.toISOString().split('T')[0];
  };

  const revenueByDay: Record<string, number> = {};
  const commissionByDay: Record<string, number> = {};
  const bookingsByDay: Record<string, number> = {};
  const bookingsByStatus: Record<string, number> = {};
  const occupancyByType: Record<string, number> = {};

  for (const b of bookings) {
    const k = bucketOf(b.date);
    revenueByDay[k]    = (revenueByDay[k]    || 0) + b.totalAmount;
    commissionByDay[k] = (commissionByDay[k] || 0) + b.commissionAmount;
    bookingsByDay[k]   = (bookingsByDay[k]   || 0) + 1;
    bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1;
    const t = b.pitch?.type || 'OTHER';
    occupancyByType[t] = (occupancyByType[t] || 0) + 1;
  }

  const usersByDay: Record<string, number> = {};
  for (const u of newUsers) {
    const k = bucketOf(u.createdAt);
    usersByDay[k] = (usersByDay[k] || 0) + 1;
  }

  // Top pitches/owners
  const pitchAgg: Record<string, { pitchId: string; name: string; revenue: number; bookingCount: number; ownerId: string; ownerName: string }> = {};
  const ownerAgg: Record<string, { ownerId: string; name: string; revenue: number; bookingCount: number }> = {};
  for (const b of bookings) {
    const p = pitchAgg[b.pitchId] || { pitchId: b.pitchId, name: b.pitch?.name || '—', revenue: 0, bookingCount: 0, ownerId: b.pitch?.ownerId || '', ownerName: b.pitch?.owner?.name || '' };
    p.revenue += b.totalAmount; p.bookingCount += 1;
    pitchAgg[b.pitchId] = p;
    if (b.pitch?.ownerId) {
      const o = ownerAgg[b.pitch.ownerId] || { ownerId: b.pitch.ownerId, name: b.pitch.owner?.name || '—', revenue: 0, bookingCount: 0 };
      o.revenue += b.ownerAmount; o.bookingCount += 1;
      ownerAgg[b.pitch.ownerId] = o;
    }
  }
  const topPitches = Object.values(pitchAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topOwners  = Object.values(ownerAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const totalRevenue    = bookings.reduce((s, b) => s + b.totalAmount, 0);
  const totalCommission = bookings.reduce((s, b) => s + b.commissionAmount, 0);
  const prevRevenue     = prevBookings.reduce((s: number, b: any) => s + b.totalAmount, 0);
  const prevCommission  = prevBookings.reduce((s: number, b: any) => s + b.commissionAmount, 0);

  const delta = (curr: number, prev: number) => prev === 0 ? null : Math.round(((curr - prev) / prev) * 1000) / 10;

  res.json({
    success: true,
    data: {
      period, groupBy, compareTo,
      revenue: {
        byDay: revenueByDay,
        commissionByDay,
        total: totalRevenue,
        commission: totalCommission,
        delta: { revenue: delta(totalRevenue, prevRevenue), commission: delta(totalCommission, prevCommission) },
      },
      bookings: {
        byDay: bookingsByDay,
        total: bookings.length,
        byStatus: bookingsByStatus,
        delta: { total: delta(bookings.length, prevBookings.length) },
      },
      users: {
        byDay: usersByDay,
        totalNew: newUsers.length,
        byRole: usersByRole.reduce((acc, r) => ({ ...acc, [r.role]: r._count._all }), {} as Record<string, number>),
      },
      occupancyByType,
      topPitches,
      topOwners,
      alerts: { pendingPitches, pendingPayouts: pendingPayoutsCount, failedPayments },
    },
  });
});

// ─── USERS ────────────────────────────────────────────────────────────────────

router.get('/users', async (req: Request, res: Response) => {
  const { role, page = '1', limit = '20', search, isActive } = req.query as any;
  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role as UserRole;
  if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, phone: true, email: true, avatar: true,
        role: true, adminTier: true, corporateId: true, isCorpAdmin: true,
        isVerified: true, isActive: true, walletBalance: true, createdAt: true,
        _count: { select: { bookings: true, pitches: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ success: true, data: { users, total } });
});

router.get('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { bookings: true, pitches: true, reviews: true } },
      bookings: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, pitchName: true, date: true, status: true, totalAmount: true } },
      pitches: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, name: true, status: true, avgRating: true } },
      corporate: { select: { id: true, name: true } },
    },
  });
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: user });
});

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+254\d{9}$/),
  email: z.string().email().optional(),
  role: z.enum(['PLAYER', 'OWNER', 'ADMIN']),
  adminTier: z.enum(['SUPER', 'OPERATIONS', 'FINANCE', 'SUPPORT']).optional(),
});
router.post('/users', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const data = createUserSchema.parse(req.body);
  // Creating an ADMIN requires SUPER tier (defence in depth: middleware allows OPERATIONS for non-admin roles).
  if (data.role === 'ADMIN' && req.user!.adminTier !== 'SUPER') {
    throw new AppError('Only SUPER admins can create admin users.', 403);
  }
  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing) throw new AppError('A user with this phone number already exists.', 409);
  const user = await prisma.user.create({
    data: {
      name: data.name, phone: data.phone, email: data.email,
      role: data.role,
      adminTier: data.role === 'ADMIN' ? (data.adminTier || 'SUPPORT') : null,
      isVerified: true, phoneVerified: true, isActive: true,
    },
  });
  await logAdminAction(req.user!.id, 'user.create', 'user', user.id, { role: data.role });
  res.status(201).json({ success: true, data: user });
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+254\d{9}$/).optional(),
  email: z.string().email().nullable().optional(),
});
router.patch('/users/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = updateUserSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id },
    data: { ...data, email: data.email ?? undefined },
  });
  await logAdminAction(req.user!.id, 'user.update', 'user', id, data);
  res.json({ success: true, data: user });
});

router.delete('/users/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user!.id) throw new AppError('Cannot delete your own account.', 400);
  const counts = await prisma.user.findUnique({
    where: { id },
    select: { _count: { select: { bookings: true, pitches: true, reviews: true } }, role: true },
  });
  if (!counts) throw new AppError('User not found.', 404);
  if (counts.role === 'ADMIN' && req.user!.adminTier !== 'SUPER') {
    throw new AppError('Only SUPER admins can delete admin users.', 403);
  }
  const c = counts._count;
  if (c.bookings || c.pitches || c.reviews) {
    throw new AppError(
      `User has ${c.bookings} booking(s), ${c.pitches} pitch(es), ${c.reviews} review(s) — deactivate instead.`,
      409,
    );
  }
  await prisma.user.delete({ where: { id } });
  await logAdminAction(req.user!.id, 'user.delete', 'user', id);
  res.json({ success: true, message: 'User deleted.' });
});

router.patch('/users/:id/deactivate', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user!.id) throw new AppError('Cannot deactivate your own account.', 400);
  const user = await prisma.user.update({ where: { id }, data: { isActive: false }, select: { id: true, name: true, isActive: true } });
  await logAdminAction(req.user!.id, 'user.deactivate', 'user', id);
  res.json({ success: true, message: 'User deactivated.', data: user });
});

router.patch('/users/:id/activate', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.update({ where: { id }, data: { isActive: true }, select: { id: true, name: true, isActive: true } });
  await logAdminAction(req.user!.id, 'user.activate', 'user', id);
  res.json({ success: true, message: 'User activated.', data: user });
});

// Admin tier change (separate from role — role is immutable; tier can move)
const tierSchema = z.object({ adminTier: z.enum(['SUPER', 'OPERATIONS', 'FINANCE', 'SUPPORT']).nullable() });
router.patch('/users/:id/tier', requireAdminTier(), async (req: AuthRequest, res: Response) => {
  // requireAdminTier() with no args = SUPER only
  const { id } = req.params;
  if (id === req.user!.id) throw new AppError('Cannot change your own tier.', 400);
  const { adminTier } = tierSchema.parse(req.body);
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, adminTier: true } });
  if (!target) throw new AppError('User not found.', 404);
  if (target.role !== 'ADMIN') throw new AppError('User is not an admin — set role at creation time.', 400);
  const user = await prisma.user.update({ where: { id }, data: { adminTier }, select: { id: true, name: true, adminTier: true } });
  await logAdminAction(req.user!.id, 'user.tier_change', 'user', id, { from: target.adminTier, to: adminTier });
  res.json({ success: true, data: user });
});

// ─── PITCHES ──────────────────────────────────────────────────────────────────

router.get('/pitches', async (req: Request, res: Response) => {
  const { status, type, ownerId, search, page = '1', limit = '20' } = req.query as any;
  const where: Prisma.PitchWhereInput = {};
  if (status) where.status = status as PitchStatus;
  if (type) where.type = type;
  if (ownerId) where.ownerId = ownerId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [pitches, total] = await Promise.all([
    prisma.pitch.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        images: { where: { isPrimary: true }, take: 1 },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.pitch.count({ where }),
  ]);
  res.json({ success: true, data: { pitches, total } });
});

router.get('/pitches/pending', async (_req: Request, res: Response) => {
  const pitches = await prisma.pitch.findMany({
    where: { status: 'PENDING_VERIFICATION' },
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true } },
      images: true, amenities: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: pitches });
});

router.get('/pitches/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const pitch = await prisma.pitch.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
      images: { orderBy: { order: 'asc' } },
      amenities: true,
      bookings: { orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { id: true, name: true, phone: true } } } },
      reviews: { orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  });
  if (!pitch) throw new AppError('Pitch not found.', 404);
  const revenueAgg = await prisma.booking.aggregate({
    where: { pitchId: id, status: { in: ['CONFIRMED', 'COMPLETED'] } },
    _sum: { totalAmount: true, commissionAmount: true, ownerAmount: true },
  });
  res.json({
    success: true,
    data: {
      ...pitch,
      revenue: {
        total: revenueAgg._sum.totalAmount || 0,
        commission: revenueAgg._sum.commissionAmount || 0,
        owner: revenueAgg._sum.ownerAmount || 0,
      },
    },
  });
});

const verifySchema = z.object({ action: z.enum(['approve', 'reject']), reason: z.string().max(500).optional() });
router.patch('/pitches/:id/verify', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { action, reason } = verifySchema.parse(req.body);
  const before = await prisma.pitch.findUnique({ where: { id }, select: { status: true, isVerified: true, name: true, ownerId: true } });
  if (!before) throw new AppError('Pitch not found.', 404);

  const pitch = await prisma.pitch.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'ACTIVE' : 'SUSPENDED',
      isVerified: action === 'approve',
      verifiedAt: action === 'approve' ? new Date() : null,
      verifiedBy: req.user!.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: before.ownerId,
      type: action === 'approve' ? 'PITCH_VERIFIED' : 'GENERAL',
      title: action === 'approve' ? 'Pitch approved!' : 'Pitch needs changes',
      body: action === 'approve'
        ? `"${before.name}" is now live and visible to players.`
        : `"${before.name}" was not approved. ${reason || 'Please contact support for details.'}`,
    },
  });
  await logAdminAction(req.user!.id, `pitch.${action}`, 'pitch', id, { before, reason });
  res.json({ success: true, message: `Pitch ${action}d.`, data: pitch });
});

const pitchStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']),
  reason: z.string().max(500).optional(),
});
router.patch('/pitches/:id/status', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = pitchStatusSchema.parse(req.body);
  const before = await prisma.pitch.findUnique({ where: { id }, select: { status: true } });
  if (!before) throw new AppError('Pitch not found.', 404);
  const pitch = await prisma.pitch.update({
    where: { id },
    data: { status, ...(status === 'ACTIVE' && { isVerified: true }) },
  });
  await logAdminAction(req.user!.id, 'pitch.status_change', 'pitch', id, { from: before.status, to: status, reason });
  res.json({ success: true, data: pitch });
});

const createPitchSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  address: z.string().min(5),
  city: z.string().default('Nairobi'),
  county: z.string().default('Nairobi'),
  latitude: z.coerce.number().min(-5).max(5),
  longitude: z.coerce.number().min(33).max(42),
  ownerId: z.string().uuid(),
  type: z.enum(['ASTRO_TURF', 'NATURAL_GRASS', 'CONCRETE', 'HYBRID']).default('ASTRO_TURF'),
  size: z.enum(['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE']).default('SEVEN_A_SIDE'),
  pricePerHour: z.coerce.number().min(500).max(20000),
  operatingHours: z.record(z.object({ open: z.string(), close: z.string() })).optional(),
  amenities: z.array(z.object({ name: z.string(), icon: z.string().optional() })).optional(),
  autoVerify: z.boolean().optional(),
});
router.post('/pitches', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const data = createPitchSchema.parse(req.body);
  // Verify owner exists
  const owner = await prisma.user.findUnique({ where: { id: data.ownerId }, select: { id: true, role: true } });
  if (!owner) throw new AppError('Owner not found.', 404);

  const defaultHours = {
    monday: { open: '06:00', close: '22:00' }, tuesday: { open: '06:00', close: '22:00' },
    wednesday: { open: '06:00', close: '22:00' }, thursday: { open: '06:00', close: '22:00' },
    friday: { open: '06:00', close: '22:00' }, saturday: { open: '06:00', close: '22:00' },
    sunday: { open: '06:00', close: '22:00' },
  };

  const pitch = await prisma.pitch.create({
    data: {
      name: data.name, description: data.description,
      address: data.address, city: data.city, county: data.county,
      latitude: data.latitude, longitude: data.longitude,
      ownerId: data.ownerId,
      type: data.type, size: data.size, pricePerHour: data.pricePerHour,
      operatingHours: data.operatingHours ?? defaultHours,
      ...(data.autoVerify && {
        status: 'ACTIVE' as const,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user!.id,
      }),
      amenities: data.amenities ? { create: data.amenities.map(a => ({ name: a.name, icon: a.icon || '⚽' })) } : undefined,
    },
    include: { amenities: true, images: true },
  });
  // Promote the user to OWNER if they aren't already
  if (owner.role !== 'OWNER' && owner.role !== 'ADMIN') {
    await prisma.user.update({ where: { id: owner.id }, data: { role: 'OWNER' } });
  }
  await logAdminAction(req.user!.id, 'pitch.create', 'pitch', pitch.id, { ownerId: data.ownerId, autoVerify: !!data.autoVerify });
  res.status(201).json({ success: true, data: pitch });
});

const updatePitchSchema = createPitchSchema.partial();
router.patch('/pitches/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = updatePitchSchema.parse(req.body);
  const pitch = await prisma.pitch.update({
    where: { id },
    data: {
      ...data,
      amenities: data.amenities ? {
        deleteMany: {},
        create: data.amenities.map(a => ({ name: a.name, icon: a.icon || '⚽' })),
      } : undefined,
    },
    include: { amenities: true, images: true },
  });
  await logAdminAction(req.user!.id, 'pitch.update', 'pitch', id, data);
  res.json({ success: true, data: pitch });
});

router.delete('/pitches/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const activeBookings = await prisma.booking.count({
    where: { pitchId: id, status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] }, date: { gte: new Date() } },
  });
  if (activeBookings > 0) {
    throw new AppError(`Cannot delete: ${activeBookings} active or upcoming booking(s) exist. Cancel them or suspend the pitch.`, 409);
  }
  await prisma.pitch.update({ where: { id }, data: { status: 'INACTIVE', isVerified: false } });
  await logAdminAction(req.user!.id, 'pitch.delete', 'pitch', id);
  res.json({ success: true, message: 'Pitch deactivated.' });
});

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

router.get('/bookings', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20', userId, pitchId, from, to } = req.query as any;
  const where: Prisma.BookingWhereInput = {};
  if (status) where.status = status as BookingStatus;
  if (userId) where.userId = userId;
  if (pitchId) where.pitchId = pitchId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as any).gte = new Date(from);
    if (to) (where.date as any).lte = new Date(to);
  }
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        pitch: { select: { id: true, name: true } },
        payment: { select: { status: true, amount: true, mpesaReceiptNumber: true } },
        event: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.booking.count({ where }),
  ]);
  res.json({ success: true, data: { bookings, total } });
});

router.get('/bookings/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      pitch: { select: { id: true, name: true, address: true, owner: { select: { id: true, name: true, phone: true } } } },
      payment: true,
      payout: true,
      event: { select: { id: true, name: true, corporateId: true } },
    },
  });
  if (!booking) throw new AppError('Booking not found.', 404);
  res.json({ success: true, data: booking });
});

const createBookingSchema = z.object({
  userId: z.string().uuid(),
  pitchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  totalAmount: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});
router.post('/bookings', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const data = createBookingSchema.parse(req.body);
  const pitch = await prisma.pitch.findUnique({ where: { id: data.pitchId }, select: { id: true, name: true, address: true, pricePerHour: true, commissionRate: true } });
  if (!pitch) throw new AppError('Pitch not found.', 404);

  const [sh, sm] = data.startTime.split(':').map(Number);
  const [eh, em] = data.endTime.split(':').map(Number);
  const durationMins = (eh * 60 + em) - (sh * 60 + sm);
  if (durationMins <= 0) throw new AppError('endTime must be after startTime.', 400);

  const date = new Date(data.date);
  const total = data.totalAmount ?? (pitch.pricePerHour * (durationMins / 60));
  const commission = total * pitch.commissionRate;
  const ownerAmount = total - commission;

  // Upsert slot
  const slot = await prisma.timeSlot.upsert({
    where: { pitchId_date_startTime: { pitchId: pitch.id, date, startTime: data.startTime } },
    update: { status: 'BOOKED', endTime: data.endTime },
    create: { pitchId: pitch.id, date, startTime: data.startTime, endTime: data.endTime, status: 'BOOKED' },
  });

  const existing = await prisma.booking.findUnique({ where: { slotId: slot.id } });
  if (existing) throw new AppError('Slot already booked.', 409);

  const booking = await prisma.booking.create({
    data: {
      userId: data.userId, pitchId: pitch.id, slotId: slot.id,
      pitchName: pitch.name, pitchAddress: pitch.address,
      date, startTime: data.startTime, endTime: data.endTime,
      durationMins,
      pricePerHour: pitch.pricePerHour,
      totalAmount: total, commissionAmount: commission, ownerAmount,
      status: 'CONFIRMED',
    },
  });
  await logAdminAction(req.user!.id, 'booking.create', 'booking', booking.id, { adminBypass: true });
  res.status(201).json({ success: true, data: booking });
});

const cancelSchema = z.object({ reason: z.string().max(500).optional() });
router.patch('/bookings/:id/cancel', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = cancelSchema.parse(req.body);
  const booking = await prisma.booking.findUnique({ where: { id }, include: { slot: true, payment: true } });
  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.status === 'CANCELLED') throw new AppError('Already cancelled.', 400);

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason || 'Admin cancellation' },
    });
    await tx.timeSlot.update({ where: { id: booking.slotId }, data: { status: 'AVAILABLE' } });
    await tx.payout.updateMany({ where: { bookingId: id, status: 'PENDING' }, data: { status: 'FAILED' } });
    return b;
  });
  await logAdminAction(req.user!.id, 'booking.cancel', 'booking', id, { reason });
  res.json({ success: true, data: updated });
});

router.post('/bookings/:id/refund', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const booking = await prisma.booking.findUnique({ where: { id }, include: { payment: true } });
  if (!booking) throw new AppError('Booking not found.', 404);
  if (!booking.payment || booking.payment.status !== 'COMPLETED') {
    throw new AppError('Cannot refund: payment not completed.', 400);
  }
  const updated = await prisma.payment.update({
    where: { id: booking.payment.id },
    data: { status: 'REFUNDED', refundedAt: new Date(), refundAmount: booking.payment.amount },
  });
  await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Admin refund' } });
  await prisma.payout.updateMany({ where: { bookingId: id, status: 'PENDING' }, data: { status: 'FAILED' } });
  await logAdminAction(req.user!.id, 'booking.refund', 'booking', id, { amount: booking.payment.amount });
  res.json({ success: true, message: 'Refund recorded. Manual M-Pesa reversal required.', data: updated });
});

// ─── PAYOUTS ──────────────────────────────────────────────────────────────────

router.get('/payouts', async (req: Request, res: Response) => {
  const { status, ownerId, page = '1', limit = '20' } = req.query as any;
  const where: Prisma.PayoutWhereInput = {};
  if (status) where.status = status as PayoutStatus;
  if (ownerId) where.ownerId = ownerId;
  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        booking: { select: { id: true, pitchName: true, date: true, startTime: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.payout.count({ where }),
  ]);
  res.json({ success: true, data: { payouts, total } });
});

router.patch('/payouts/:id/process', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updated = await prisma.payout.update({ where: { id }, data: { status: 'PROCESSING' } });
  await logAdminAction(req.user!.id, 'payout.process', 'payout', id);
  res.json({ success: true, data: updated });
});

const completeSchema = z.object({ mpesaTransactionId: z.string().min(1) });
router.patch('/payouts/:id/complete', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { mpesaTransactionId } = completeSchema.parse(req.body);
  const updated = await prisma.payout.update({
    where: { id },
    data: { status: 'COMPLETED', mpesaTransactionId, processedAt: new Date() },
  });
  await prisma.notification.create({
    data: {
      userId: updated.ownerId, type: 'PAYOUT_PROCESSED',
      title: 'Payout received', body: `KSh ${updated.amount.toLocaleString()} sent to your M-Pesa.`,
    },
  });
  await logAdminAction(req.user!.id, 'payout.complete', 'payout', id, { mpesaTransactionId });
  res.json({ success: true, data: updated });
});

const failSchema = z.object({ reason: z.string().min(1).max(500) });
router.patch('/payouts/:id/fail', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = failSchema.parse(req.body);
  const updated = await prisma.payout.update({ where: { id }, data: { status: 'FAILED' } });
  await logAdminAction(req.user!.id, 'payout.fail', 'payout', id, { reason });
  res.json({ success: true, data: updated });
});

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

router.get('/reviews', async (req: Request, res: Response) => {
  const { pitchId, userId, isVisible, minRating, maxRating, page = '1', limit = '20' } = req.query as any;
  const where: Prisma.ReviewWhereInput = {};
  if (pitchId) where.pitchId = pitchId;
  if (userId) where.userId = userId;
  if (isVisible !== undefined && isVisible !== '') where.isVisible = isVisible === 'true';
  if (minRating || maxRating) {
    where.rating = {};
    if (minRating) (where.rating as any).gte = Number(minRating);
    if (maxRating) (where.rating as any).lte = Number(maxRating);
  }
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatar: true } }, pitch: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.review.count({ where }),
  ]);
  res.json({ success: true, data: { reviews, total } });
});

const reviewVisSchema = z.object({ isVisible: z.boolean() });
router.patch('/reviews/:id', requireAdminTier('OPERATIONS', 'SUPPORT'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { isVisible } = reviewVisSchema.parse(req.body);
  const updated = await prisma.review.update({ where: { id }, data: { isVisible } });
  await logAdminAction(req.user!.id, isVisible ? 'review.show' : 'review.hide', 'review', id);
  res.json({ success: true, data: updated });
});

router.delete('/reviews/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await prisma.review.delete({ where: { id } });
  await logAdminAction(req.user!.id, 'review.delete', 'review', id);
  res.json({ success: true });
});

// ─── BROADCASTS ───────────────────────────────────────────────────────────────

const broadcastSchema = z.object({
  audience: z.union([
    z.object({ kind: z.literal('all') }),
    z.object({ kind: z.literal('role'), role: z.enum(['PLAYER', 'OWNER', 'ADMIN']) }),
    z.object({ kind: z.literal('users'), userIds: z.array(z.string()).min(1) }),
  ]),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  type: z.enum(['GENERAL', 'BOOKING_CONFIRMED', 'PAYOUT_PROCESSED']).optional(),
});
router.post('/notifications/broadcast', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const data = broadcastSchema.parse(req.body);
  const result = await broadcastNotification({
    audience: data.audience as BroadcastAudience,
    title: data.title, body: data.body,
    type: (data.type || 'GENERAL') as NotificationType,
  });
  await logAdminAction(req.user!.id, 'broadcast.send', 'broadcast', 'n/a', {
    audience: data.audience, title: data.title, recipients: result.recipients,
  });
  res.json({ success: true, data: result });
});

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

router.get('/audit-logs', async (req: Request, res: Response) => {
  const { actorId, targetType, action, page = '1', limit = '50' } = req.query as any;
  const where: Prisma.AuditLogWhereInput = {};
  if (actorId) where.actorId = actorId;
  if (targetType) where.targetType = targetType;
  if (action) where.action = { contains: action };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, avatar: true, adminTier: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ success: true, data: { logs, total } });
});

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

router.get('/settings', async (_req: Request, res: Response) => {
  const settings = await prisma.systemSetting.findMany();
  const obj: Record<string, any> = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json({ success: true, data: obj });
});

const settingSchema = z.object({ value: z.any() });
router.patch('/settings/:key', requireAdminTier(), async (req: AuthRequest, res: Response) => {
  // SUPER only (no other tiers in allowed list)
  const { key } = req.params;
  const { value } = settingSchema.parse(req.body);
  const updated = await prisma.systemSetting.upsert({
    where: { key },
    update: { value, updatedBy: req.user!.id },
    create: { key, value, updatedBy: req.user!.id },
  });
  await logAdminAction(req.user!.id, 'setting.update', 'setting', key, { value });
  res.json({ success: true, data: updated });
});

// ─── AMENITIES CATALOG ────────────────────────────────────────────────────────

router.get('/amenities', async (_req: Request, res: Response) => {
  const items = await prisma.amenity.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: items });
});

const amenitySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().max(10).default('⚽'),
  category: z.string().max(40).nullable().optional(),
  isActive: z.boolean().default(true),
});
router.post('/amenities', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const data = amenitySchema.parse(req.body);
  const item = await prisma.amenity.create({ data: { ...data, category: data.category ?? undefined } });
  await logAdminAction(req.user!.id, 'amenity.create', 'setting', item.id, { name: data.name });
  res.status(201).json({ success: true, data: item });
});
router.patch('/amenities/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = amenitySchema.partial().parse(req.body);
  const item = await prisma.amenity.update({ where: { id }, data: { ...data, category: data.category ?? undefined } });
  await logAdminAction(req.user!.id, 'amenity.update', 'setting', id, data);
  res.json({ success: true, data: item });
});
router.delete('/amenities/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await prisma.amenity.delete({ where: { id } });
  await logAdminAction(req.user!.id, 'amenity.delete', 'setting', id);
  res.json({ success: true });
});

// ─── ADMINS (SUPER only) ──────────────────────────────────────────────────────

router.get('/admins', requireAdminTier(), async (_req: Request, res: Response) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true, name: true, phone: true, email: true, avatar: true,
      adminTier: true, isActive: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: admins });
});

const createAdminSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+254\d{9}$/),
  email: z.string().email().optional(),
  adminTier: z.enum(['SUPER', 'OPERATIONS', 'FINANCE', 'SUPPORT']),
});
router.post('/admins', requireAdminTier(), async (req: AuthRequest, res: Response) => {
  const data = createAdminSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
  if (existing) throw new AppError('A user with this phone already exists.', 409);
  const admin = await prisma.user.create({
    data: {
      name: data.name, phone: data.phone, email: data.email,
      role: 'ADMIN', adminTier: data.adminTier,
      isVerified: true, phoneVerified: true, isActive: true,
    },
  });
  await logAdminAction(req.user!.id, 'admin.create', 'user', admin.id, { tier: data.adminTier });
  res.status(201).json({ success: true, data: admin });
});

router.delete('/admins/:id', requireAdminTier(), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user!.id) throw new AppError('Cannot demote yourself.', 400);
  const admin = await prisma.user.update({
    where: { id },
    data: { role: 'PLAYER', adminTier: null },
  });
  await logAdminAction(req.user!.id, 'admin.demote', 'user', id);
  res.json({ success: true, data: admin });
});

export default router;
