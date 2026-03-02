import { Router } from 'express';
import { authenticate, requireAdmin, requireOwner } from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/authenticate';
import { Response } from 'express';

// ── Review Routes ─────────────────────────────────────────────────────────────
export const reviewRouter = Router();

reviewRouter.post('/pitches/:pitchId/reviews', authenticate, async (req: AuthRequest, res: Response) => {
  const { pitchId } = req.params;
  const { rating, comment, bookingId } = req.body;
  const userId = req.user!.id;

  if (!rating || rating < 1 || rating > 5) throw new AppError('Rating must be 1-5.', 400);

  // Verify completed booking
  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, userId, status: 'COMPLETED' },
    });
    if (!booking) throw new AppError('Can only review after a completed booking.', 400);
  }

  const review = await prisma.review.create({
    data: { userId, pitchId, rating, comment, bookingId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  // Update pitch avg rating
  const stats = await prisma.review.aggregate({
    where: { pitchId, isVisible: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.pitch.update({
    where: { id: pitchId },
    data: {
      avgRating: Math.round((stats._avg.rating || 0) * 10) / 10,
      reviewCount: stats._count.rating,
    },
  });

  res.status(201).json({ success: true, data: review });
});

reviewRouter.post('/:reviewId/reply', authenticate, requireOwner, async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;
  const { reply } = req.body;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { pitch: true },
  });

  if (!review) throw new AppError('Review not found.', 404);
  if (review.pitch.ownerId !== req.user!.id) throw new AppError('Not your pitch.', 403);

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { ownerReply: reply, ownerRepliedAt: new Date() },
  });

  res.json({ success: true, data: updated });
});

// ── User Routes ───────────────────────────────────────────────────────────────
export const userRouter = Router();
userRouter.use(authenticate);

userRouter.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, name: true, phone: true, email: true,
      avatar: true, role: true, referralCode: true,
      referralCount: true, createdAt: true,
      _count: { select: { bookings: true } },
    },
  });
  res.json({ success: true, data: user });
});

userRouter.patch('/me', async (req: AuthRequest, res: Response) => {
  const { name, email, fcmToken } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { ...(name && { name }), ...(email && { email }), ...(fcmToken && { fcmToken }) },
    select: { id: true, name: true, phone: true, email: true, avatar: true },
  });
  res.json({ success: true, data: updated });
});

// ── Owner Dashboard Routes ────────────────────────────────────────────────────
export const ownerRouter = Router();
ownerRouter.use(authenticate, requireOwner);

ownerRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const ownerId = req.user!.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pitches, monthBookings, totalRevenue, pendingPayouts, todayBookings] = await Promise.all([
    prisma.pitch.count({ where: { ownerId } }),
    prisma.booking.count({
      where: { pitch: { ownerId }, status: 'CONFIRMED', createdAt: { gte: monthStart } },
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
        date: { gte: new Date(now.setHours(0, 0, 0, 0)), lt: new Date(now.setHours(23, 59, 59)) },
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

ownerRouter.get('/analytics', async (req: AuthRequest, res: Response) => {
  const ownerId = req.user!.id;
  const { period = '30' } = req.query;
  const daysBack = Number(period);
  const from = new Date();
  from.setDate(from.getDate() - daysBack);

  const bookings = await prisma.booking.findMany({
    where: {
      pitch: { ownerId },
      status: { in: ['CONFIRMED', 'COMPLETED'] },
      createdAt: { gte: from },
    },
    select: { totalAmount: true, ownerAmount: true, startTime: true, date: true, pitchId: true },
  });

  // Revenue by day
  const revenueByDay = bookings.reduce((acc, b) => {
    const day = b.date.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + b.ownerAmount;
    return acc;
  }, {} as Record<string, number>);

  // Peak hours
  const hourCounts = bookings.reduce((acc, b) => {
    const hour = b.startTime.split(':')[0];
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    success: true,
    data: { revenueByDay, hourCounts, totalBookings: bookings.length },
  });
});

ownerRouter.get('/payouts', async (req: AuthRequest, res: Response) => {
  const payouts = await prisma.payout.findMany({
    where: { ownerId: req.user!.id },
    include: { booking: { select: { pitchName: true, date: true, startTime: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: payouts });
});

// ── Admin Routes ──────────────────────────────────────────────────────────────
export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/pitches/pending', async (_req, res: Response) => {
  const pitches = await prisma.pitch.findMany({
    where: { status: 'PENDING_VERIFICATION' },
    include: { owner: { select: { id: true, name: true, phone: true } }, images: true },
  });
  res.json({ success: true, data: pitches });
});

adminRouter.patch('/pitches/:id/verify', async (req, res: Response) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' | 'reject'

  const pitch = await prisma.pitch.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'ACTIVE' : 'SUSPENDED',
      isVerified: action === 'approve',
      verifiedAt: action === 'approve' ? new Date() : null,
    },
  });
  res.json({ success: true, data: pitch });
});

adminRouter.get('/stats', async (_req, res: Response) => {
  const [users, pitches, bookings, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.pitch.count({ where: { status: 'ACTIVE' } }),
    prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ]);
  res.json({ success: true, data: { users, pitches, bookings, revenue: revenue._sum.amount || 0 } });
});

// ── Notification Routes ───────────────────────────────────────────────────────
export const notificationRouter = Router();
notificationRouter.use(authenticate);

notificationRouter.get('/', async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: notifications });
});

notificationRouter.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true, message: 'All notifications marked as read.' });
});