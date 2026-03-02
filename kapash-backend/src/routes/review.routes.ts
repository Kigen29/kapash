import { Router, Response } from 'express';
import { authenticate, requireOwner, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';

const router = Router();

// POST /api/v1/reviews/pitches/:pitchId
router.post('/pitches/:pitchId', authenticate, async (req: AuthRequest, res: Response) => {
  const { pitchId } = req.params;
  const { rating, comment, bookingId } = req.body;
  const userId = req.user!.id;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError('Rating must be between 1 and 5.', 400);
  }

  // Only allow review after a completed booking
  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, userId, status: 'COMPLETED' },
    });
    if (!booking) throw new AppError('You can only review pitches after a completed booking.', 400);
  }

  const review = await prisma.review.create({
    data: { userId, pitchId, rating, comment, bookingId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  // Recalculate pitch avg rating
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

// GET /api/v1/reviews/pitches/:pitchId
router.get('/pitches/:pitchId', async (req, res: Response) => {
  const { pitchId } = req.params;
  const { page = '1', limit = '20' } = req.query as any;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { pitchId, isVisible: true },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.review.count({ where: { pitchId, isVisible: true } }),
  ]);

  res.json({ success: true, data: { reviews, total } });
});

// POST /api/v1/reviews/:reviewId/reply  (owner replies to review)
router.post('/:reviewId/reply', authenticate, requireOwner, async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;
  const { reply } = req.body;

  if (!reply || reply.trim().length < 5) {
    throw new AppError('Reply must be at least 5 characters.', 400);
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { pitch: true },
  });

  if (!review) throw new AppError('Review not found.', 404);
  if (review.pitch.ownerId !== req.user!.id) {
    throw new AppError('You can only reply to reviews on your own pitches.', 403);
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { ownerReply: reply, ownerRepliedAt: new Date() },
  });

  res.json({ success: true, data: updated });
});

export default router;