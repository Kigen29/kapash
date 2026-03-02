import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';

const router = Router();
router.use(authenticate);

// GET /api/v1/users/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, name: true, phone: true, email: true,
      avatar: true, role: true, referralCode: true,
      referralCount: true, createdAt: true,
      _count: { select: { bookings: true } },
    },
  });
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: user });
});

// PATCH /api/v1/users/me
router.patch('/me', async (req: AuthRequest, res: Response) => {
  const { name, email, fcmToken } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(fcmToken !== undefined && { fcmToken }),
    },
    select: { id: true, name: true, phone: true, email: true, avatar: true, role: true },
  });
  res.json({ success: true, data: updated });
});

// GET /api/v1/users/me/stats
router.get('/me/stats', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const [totalBookings, completedBookings, totalSpent] = await Promise.all([
    prisma.booking.count({ where: { userId } }),
    prisma.booking.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.payment.aggregate({
      where: { userId, status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ]);
  res.json({
    success: true,
    data: { totalBookings, completedBookings, totalSpent: totalSpent._sum.amount || 0 },
  });
});

// GET /api/v1/users/me/referral
router.get('/me/referral', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { referralCode: true, referralCount: true },
  });
  res.json({
    success: true,
    data: {
      referralCode: user?.referralCode,
      referralCount: user?.referralCount || 0,
      earningsPerReferral: 500,
      totalEarned: (user?.referralCount || 0) * 500,
    },
  });
});

export default router;