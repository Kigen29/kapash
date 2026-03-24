import { Router, Response } from 'express';
import { authenticate, requireOwner, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const router = Router();

const reviewSchema = z.object({
  rating:    z.number().int().min(1).max(5),
  comment:   z.string().min(10).max(1000).optional(),
  bookingId: z.string().uuid().optional(),
});

const updateReviewSchema = z.object({
  rating:  z.number().int().min(1).max(5).optional(),
  comment: z.string().min(10).max(1000).optional(),
});

// ── Helper: recalculate pitch rating ─────────────────────────────────────────
async function recalcPitchRating(pitchId: string) {
  const agg = await prisma.review.aggregate({
    where:  { pitchId, isVisible: true },
    _avg:   { rating: true },
    _count: true,
  });
  await prisma.pitch.update({
    where: { id: pitchId },
    data: {
      avgRating:   Math.round(((agg._avg?.rating) ?? 0) * 10) / 10,
      reviewCount: agg._count ?? 0,
    },
  });
}

// POST /api/v1/reviews/pitches/:pitchId
router.post('/pitches/:pitchId', authenticate, async (req: AuthRequest, res: Response) => {
  const pitchId = String(req.params.pitchId); // ✅ cast
  const { rating, comment, bookingId } = reviewSchema.parse(req.body);
  const userId = req.user!.id;

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, userId, status: 'COMPLETED' },
    });
    if (!booking) throw new AppError('You can only review pitches after a completed booking.', 400);

    const dup = await prisma.review.findUnique({
      where: { userId_bookingId: { userId, bookingId } },
    });
    if (dup) throw new AppError('You have already reviewed this booking.', 409);
  }

  const review = await prisma.review.create({
    data: { userId, pitchId, rating, comment, bookingId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  await recalcPitchRating(pitchId);

  res.status(201).json({ success: true, data: review });
});

// GET /api/v1/reviews/pitches/:pitchId
router.get('/pitches/:pitchId', async (req, res: Response) => {
  const pitchId = String(req.params.pitchId); // ✅ cast
  const { page = '1', limit = '20' } = req.query as any;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where:   { pitchId, isVisible: true },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip:    (Number(page) - 1) * Number(limit),
      take:    Number(limit),
    }),
    prisma.review.count({ where: { pitchId, isVisible: true } }),
  ]);

  res.json({ success: true, data: { reviews, total } });
});

// PATCH /api/v1/reviews/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const id     = String(req.params.id); // ✅ cast
  const data   = updateReviewSchema.parse(req.body);
  const userId = req.user!.id;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError('Review not found.', 404);
  if (review.userId !== userId) throw new AppError('You can only edit your own reviews.', 403);

  const updated = await prisma.review.update({
    where:   { id },
    data,
    include: { pitch: { select: { id: true, name: true, address: true } } },
  });

  if (data.rating !== undefined) {
    await recalcPitchRating(review.pitchId);
  }

  res.json({ success: true, data: updated });
});

// POST /api/v1/reviews/:reviewId/reply
router.post('/:reviewId/reply', authenticate, requireOwner, async (req: AuthRequest, res: Response) => {
  const reviewId = String(req.params.reviewId); // ✅ cast
  const { reply } = z.object({ reply: z.string().min(5).max(500) }).parse(req.body);

  const review = await prisma.review.findUnique({
    where:   { id: reviewId },
    include: { pitch: { select: { ownerId: true } } }, // ✅ include pitch for ownership check
  });

  if (!review) throw new AppError('Review not found.', 404);
  if (review.pitch.ownerId !== req.user!.id) throw new AppError('Not your pitch.', 403);

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data:  { ownerReply: reply, ownerRepliedAt: new Date() },
  });

  res.json({ success: true, data: updated });
});

export default router;