import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import redis, { REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/authenticate';
import { sendSMS } from '../services/sms.service';
import { sendPushNotification } from '../services/notification.service';
import { env } from '../config/env';

// ── Schemas ───────────────────────────────────────────────────────────────────

const createBookingSchema = z.object({
  pitchId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  paymentMethod: z.enum(['MPESA', 'CARD', 'CASH']).default('MPESA'),
  mpesaPhone: z.string().regex(/^\+254[0-9]{9}$/).optional(),
});

const cancelBookingSchema = z.object({
  reason: z.string().min(5).max(200),
});

// ── Create Booking (initiates hold & payment) ─────────────────────────────────

export async function createBooking(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const data = createBookingSchema.parse(req.body);

  // 1. Verify pitch exists and is active
  const pitch = await prisma.pitch.findUnique({
    where: { id: data.pitchId, status: 'ACTIVE', isVerified: true },
  });
  if (!pitch) throw new AppError('Pitch not found or not available.', 404);

  // 2. Calculate duration and price
  const durationMins = calcDurationMins(data.startTime, data.endTime);
  if (durationMins < 60 || durationMins > 240) {
    throw new AppError('Bookings must be between 1 and 4 hours.', 400);
  }
  const hours = durationMins / 60;
  const totalAmount = pitch.pricePerHour * hours;
  const commissionAmount = totalAmount * pitch.commissionRate;
  const ownerAmount = totalAmount - commissionAmount;

  // 3. Check slot availability (with Redis distributed lock)
  const lockKey = `lock:slot:${data.pitchId}:${data.date}:${data.startTime}`;
  const lockAcquired = await redis.set(lockKey, userId, 'EX', 30, 'NX');
  if (!lockAcquired) {
    throw new AppError('This slot is currently being booked by another user. Please try again.', 409);
  }

  try {
    // Check if slot already exists and is taken
    const existingSlot = await prisma.timeSlot.findUnique({
      where: {
        pitchId_date_startTime: {
          pitchId: data.pitchId,
          date: new Date(data.date),
          startTime: data.startTime,
        },
      },
    });

    if (existingSlot) {
      if (existingSlot.status === 'BOOKED' || existingSlot.status === 'BLOCKED') {
        throw new AppError('This slot is already booked.', 409);
      }
      if (existingSlot.status === 'HELD' && existingSlot.heldUntil! > new Date() && existingSlot.heldBy !== userId) {
        throw new AppError('This slot is being held by another user.', 409);
      }
    }

    // 4. Create or update slot with HELD status
    const holdUntil = new Date(Date.now() + env.SLOT_HOLD_MINUTES * 60 * 1000);

    const slot = await prisma.timeSlot.upsert({
      where: {
        pitchId_date_startTime: {
          pitchId: data.pitchId,
          date: new Date(data.date),
          startTime: data.startTime,
        },
      },
      update: {
        status: 'HELD',
        heldBy: userId,
        heldUntil: holdUntil,
        endTime: data.endTime,
      },
      create: {
        pitchId: data.pitchId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'HELD',
        heldBy: userId,
        heldUntil: holdUntil,
      },
    });

    // Also store hold in Redis for fast lookup
    await redis.setex(
      REDIS_KEYS.slotHold(slot.id),
      REDIS_TTL.slotHold,
      JSON.stringify({ userId, bookingData: data })
    );

    // 5. Create booking with PENDING_PAYMENT status
    const booking = await prisma.booking.create({
      data: {
        userId,
        pitchId: data.pitchId,
        slotId: slot.id,
        pitchName: pitch.name,
        pitchAddress: pitch.address,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        durationMins,
        pricePerHour: pitch.pricePerHour,
        totalAmount,
        commissionAmount,
        ownerAmount,
        status: 'PENDING_PAYMENT',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Booking created. Complete payment within 10 minutes.',
      data: {
        bookingId: booking.id,
        slotId: slot.id,
        totalAmount,
        holdExpiresAt: holdUntil,
        paymentRequired: data.paymentMethod !== 'CASH',
      },
    });

  } finally {
    // Always release the distributed lock
    await redis.del(lockKey);
  }
}

// ── Get My Bookings ───────────────────────────────────────────────────────────

export async function getMyBookings(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { status, page = '1', limit = '20' } = req.query as any;

  const where: any = { userId };
  if (status) where.status = status;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        pitch: {
          select: {
            id: true, name: true, address: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    success: true,
    data: { bookings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
  });
}

// ── Get Single Booking ────────────────────────────────────────────────────────

export async function getBooking(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      pitch: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          amenities: true,
          owner: { select: { id: true, name: true, phone: true } },
        },
      },
      payment: true,
    },
  });

  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.userId !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('Access denied.', 403);
  }

  res.json({ success: true, data: booking });
}

// ── Cancel Booking ────────────────────────────────────────────────────────────

export async function cancelBooking(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { reason } = cancelBookingSchema.parse(req.body);
  const userId = req.user!.id;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { payment: true, slot: true },
  });

  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.userId !== userId) throw new AppError('Access denied.', 403);
  if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
    throw new AppError('This booking cannot be cancelled.', 400);
  }

  // Calculate refund based on time to booking
  const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.startTime}`);
  const hoursUntilBooking = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  let refundPercent = 0;
  if (hoursUntilBooking >= 24) refundPercent = 1.0;
  else if (hoursUntilBooking >= 2) refundPercent = 0.5;

  const refundAmount = booking.totalAmount * refundPercent;

  // Update booking, slot, and trigger refund in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });

    await tx.timeSlot.update({
      where: { id: booking.slotId },
      data: { status: 'AVAILABLE', heldBy: null, heldUntil: null },
    });

    if (booking.payment && booking.payment.status === 'COMPLETED' && refundAmount > 0) {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: {
          status: refundPercent === 1.0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundedAt: new Date(),
          refundAmount,
        },
      });
    }
  });

  // Invalidate availability cache
  const dateStr = booking.date.toISOString().split('T')[0];
  await redis.del(REDIS_KEYS.pitchAvailability(booking.pitchId, dateStr));

  // Notify user
  await sendSMS(
    booking.pitch?.owner?.phone || '',
    `Booking cancelled for ${booking.pitchName} on ${dateStr} at ${booking.startTime}. ${refundAmount > 0 ? `Refund of KES ${refundAmount} will be processed within 24 hours.` : 'No refund applies.'}`
  );

  res.json({
    success: true,
    message: 'Booking cancelled.',
    data: { refundAmount, refundPercent: refundPercent * 100 },
  });
}

// ── Helper ────────────────────────────────────────────────────────────────────

function calcDurationMins(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}