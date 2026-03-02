import { Router, Response } from 'express';
import { authenticate, requireOwner, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';

const router = Router();
router.use(authenticate, requireOwner);

// GET /api/v1/owner/dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const ownerId = req.user!.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));

  const [pitches, monthBookings, totalRevenue, pendingPayouts, todayBookings] = await Promise.all([
    prisma.pitch.count({ where: { ownerId } }),
    prisma.booking.count({
      where: {
        pitch: { ownerId },
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.payout.aggregate({
      where: { ownerId, status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.payout.aggregate({
      where: { ownerId, status: 'PENDING' },
      _sum: { amount: true },
    }),
    prisma.booking.findMany({
      where: {
        pitch: { ownerId },
        date: { gte: todayStart, lte: todayEnd },
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      include: {
        pitch: { select: { name: true } },
        user: { select: { name: true, phone: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalPitches: pitches,
        monthBookings,
        totalRevenue: totalRevenue._sum.amount || 0,
        pendingPayouts: pendingPayouts._sum.amount || 0,
      },
      todayBookings,
    },
  });
});

// GET /api/v1/owner/analytics?period=30
router.get('/analytics', async (req: AuthRequest, res: Response) => {
  const ownerId = req.user!.id;
  const period = Number(req.query.period) || 30;
  const from = new Date();
  from.setDate(from.getDate() - period);

  const bookings = await prisma.booking.findMany({
    where: {
      pitch: { ownerId },
      status: { in: ['CONFIRMED', 'COMPLETED'] },
      createdAt: { gte: from },
    },
    select: {
      totalAmount: true,
      ownerAmount: true,
      startTime: true,
      date: true,
      pitchId: true,
    },
  });

  // Revenue grouped by day
  const revenueByDay = bookings.reduce((acc, b) => {
    const day = b.date.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + b.ownerAmount;
    return acc;
  }, {} as Record<string, number>);

  // Bookings by hour (peak hours)
  const bookingsByHour = bookings.reduce((acc, b) => {
    const hour = b.startTime.split(':')[0];
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top pitches
  const pitchRevenue = bookings.reduce((acc, b) => {
    acc[b.pitchId] = (acc[b.pitchId] || 0) + b.ownerAmount;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    success: true,
    data: {
      revenueByDay,
      bookingsByHour,
      pitchRevenue,
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((sum, b) => sum + b.ownerAmount, 0),
    },
  });
});

// GET /api/v1/owner/bookings
router.get('/bookings', async (req: AuthRequest, res: Response) => {
  const ownerId = req.user!.id;
  const { status, page = '1', limit = '20' } = req.query as any;

  const where: any = { pitch: { ownerId } };
  if (status) where.status = status;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        pitch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, phone: true } },
        payment: { select: { status: true, mpesaReceiptNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ success: true, data: { bookings, total } });
});

// GET /api/v1/owner/payouts
router.get('/payouts', async (req: AuthRequest, res: Response) => {
  const payouts = await prisma.payout.findMany({
    where: { ownerId: req.user!.id },
    include: {
      booking: { select: { pitchName: true, date: true, startTime: true, totalAmount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: payouts });
});

// GET /api/v1/owner/pitches
router.get('/pitches', async (req: AuthRequest, res: Response) => {
  const pitches = await prisma.pitch.findMany({
    where: { ownerId: req.user!.id },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: pitches });
});

export default router;