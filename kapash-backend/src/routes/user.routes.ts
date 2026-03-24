import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// GET /api/v1/users/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, name: true, phone: true, email: true,
      avatar: true, role: true, referralCode: true,
      referralCount: true, createdAt: true, phoneVerified: true,
      walletBalance: true,
      _count: { select: { bookings: true } },
    },
  });
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: user });
});

// PATCH /api/v1/users/me
router.patch('/me', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    fcmToken: z.string().optional(),
  });
  const { name, email, fcmToken } = schema.parse(req.body);

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(fcmToken !== undefined && { fcmToken }),
    },
    select: {
      id: true, name: true, phone: true, email: true,
      avatar: true, role: true, phoneVerified: true, walletBalance: true,
    },
  });
  res.json({ success: true, data: { user: updated } });
});

// GET /api/v1/users/me/stats
router.get('/me/stats', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const [totalBookings, completedBookings, totalSpent, user] = await Promise.all([
    prisma.booking.count({ where: { userId } }),
    prisma.booking.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.payment.aggregate({ where: { userId, status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { referralCount: true } }),
  ]);
  res.json({
    success: true,
    data: {
      totalBookings,
      completedBookings,
      totalSpent: totalSpent._sum.amount || 0,
      referralCount: user?.referralCount || 0,
    },
  });
});

// GET /api/v1/users/me/referral
router.get('/me/referral', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { referralCode: true, referralCount: true, walletBalance: true },
  });
  res.json({
    success: true,
    data: {
      referralCode: user?.referralCode,
      referralCount: user?.referralCount || 0,
      earningsPerReferral: 500,
      totalEarned: (user?.referralCount || 0) * 500,
      walletBalance: user?.walletBalance || 0,
    },
  });
});

// GET /api/v1/users/me/reviews
router.get('/me/reviews', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query as any;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { userId: req.user!.id },
      include: {
        pitch: { select: { id: true, name: true, address: true, images: { where: { isPrimary: true }, take: 1 } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.review.count({ where: { userId: req.user!.id } }),
  ]);

  res.json({ success: true, data: { reviews, total } });
});

export default router;