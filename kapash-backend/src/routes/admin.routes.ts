import { Router, Response, Request } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/v1/admin/stats
router.get('/stats', async (_req: Request, res: Response) => {
  const [totalUsers, totalPitches, activePitches, totalBookings, confirmedBookings, revenue] = await Promise.all([
    prisma.user.count(),
    prisma.pitch.count(),
    prisma.pitch.count({ where: { status: 'ACTIVE' } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalPitches,
      activePitches,
      totalBookings,
      confirmedBookings,
      totalRevenue: revenue._sum.amount || 0,
    },
  });
});

// GET /api/v1/admin/pitches/pending
router.get('/pitches/pending', async (_req: Request, res: Response) => {
  const pitches = await prisma.pitch.findMany({
    where: { status: 'PENDING_VERIFICATION' },
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true } },
      images: true,
      amenities: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: pitches });
});

// PATCH /api/v1/admin/pitches/:id/verify
router.patch('/pitches/:id/verify', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    throw new AppError('Action must be "approve" or "reject".', 400);
  }

  const pitch = await prisma.pitch.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'ACTIVE' : 'SUSPENDED',
      isVerified: action === 'approve',
      verifiedAt: action === 'approve' ? new Date() : null,
      verifiedBy: req.user!.id,
    },
  });

  res.json({
    success: true,
    message: `Pitch ${action === 'approve' ? 'approved and is now live' : 'rejected'}.`,
    data: pitch,
  });
});

// GET /api/v1/admin/users
router.get('/users', async (req: Request, res: Response) => {
  const { role, page = '1', limit = '20', search } = req.query as any;

  const where: any = {};
  if (role) where.role = role;
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
        id: true, name: true, phone: true, email: true,
        role: true, isVerified: true, isActive: true, createdAt: true,
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

// PATCH /api/v1/admin/users/:id/deactivate
router.patch('/users/:id/deactivate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, name: true, isActive: true },
  });
  res.json({ success: true, message: 'User deactivated.', data: user });
});

// GET /api/v1/admin/bookings
router.get('/bookings', async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query as any;

  const where: any = {};
  if (status) where.status = status;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        pitch: { select: { id: true, name: true } },
        payment: { select: { status: true, amount: true, mpesaReceiptNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ success: true, data: { bookings, total } });
});

export default router;