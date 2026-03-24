import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import redis, { REDIS_KEYS } from '../config/redis';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/authenticate';
import { initiateMpesaStkPush } from '../services/mpesa.service';
import { sendSMS } from '../services/sms.service';
import { sendPushNotification } from '../services/notification.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ── Helpers ─────────────────────────────────────────────────────

const safeString = (value: any): string => (value ? String(value) : '');

// ── Schemas ─────────────────────────────────────────────────────

const stkPushSchema = z.object({
  bookingId: z.string().uuid(),
  phone: z.string().regex(/^\+254[0-9]{9}$/),
});

// ── Initiate Payment ────────────────────────────────────────────

export async function initiatePayment(req: AuthRequest, res: Response) {
  const { bookingId, phone } = stkPushSchema.parse(req.body);
  const userId = req.user!.id;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, userId },
    include: { pitch: true },
  });

  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.status !== 'PENDING_PAYMENT') {
    throw new AppError('This booking is not awaiting payment.', 400);
  }

  const slot = await prisma.timeSlot.findUnique({ where: { id: booking.slotId } });

  if (!slot || slot.status !== 'HELD' || !slot.heldUntil || slot.heldUntil < new Date()) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });
    throw new AppError('Your slot hold has expired.', 400);
  }

  let payment = await prisma.payment.findUnique({ where: { bookingId } });

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        bookingId,
        userId,
        amount: booking.totalAmount,
        method: 'MPESA',
        mpesaPhone: phone,
        status: 'PENDING',
      },
    });
  }

  const description = `Kapash - ${booking.pitchName}`;

  const stkResult = await initiateMpesaStkPush({
    phone,
    amount: Math.ceil(booking.totalAmount),
    bookingId,
    description,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      mpesaCheckoutRequestId: stkResult.CheckoutRequestID,
      mpesaMerchantRequestId: stkResult.MerchantRequestID,
      status: 'PROCESSING',
    },
  });

  res.json({
    success: true,
    message: 'M-Pesa prompt sent.',
  });
}

// ── Callback ────────────────────────────────────────────────────

export async function mpesaCallback(req: Request, res: Response) {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) return;

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = body;

    const payment = await prisma.payment.findUnique({
      where: { mpesaCheckoutRequestId: CheckoutRequestID },
      include: {
        booking: {
          include: {
            user: true,
            pitch: { include: { owner: true } },
          },
        },
      },
    });

    if (!payment) return;

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item || [];

      const getMeta = (name: string) =>
        items.find((i: any) => i.Name === name)?.Value;

      const mpesaReceiptNumber = safeString(getMeta('MpesaReceiptNumber'));
      const transactionDate = safeString(getMeta('TransactionDate'));

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            mpesaReceiptNumber,
            mpesaTransactionDate: transactionDate,
            resultCode: safeString(ResultCode),
            resultDesc: ResultDesc ?? '',
          },
        });

        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CONFIRMED' },
        });

        await tx.timeSlot.update({
          where: { id: payment.booking.slotId },
          data: { status: 'BOOKED', heldBy: null, heldUntil: null },
        });
      });

      const userPhone = payment.booking.user.phone;
      const ownerPhone = payment.booking.pitch.owner.phone;

      if (userPhone) {
        await sendSMS(userPhone, `✅ Booking Confirmed`);
      }

      if (ownerPhone) {
        await sendSMS(ownerPhone, `📅 New Booking received`);
      }

      if (payment.booking.user.fcmToken) {
        await sendPushNotification(payment.booking.user.fcmToken, {
          title: 'Booking Confirmed',
          body: payment.booking.pitchName,
        });
      }

    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          resultCode: safeString(ResultCode),
          resultDesc: ResultDesc ?? '',
        },
      });
    }

  } catch (error) {
    logger.error('Callback error', error);
  }
}

// ── Check Payment ───────────────────────────────────────────────

export async function checkPaymentStatus(req: AuthRequest, res: Response) {
  const bookingId = String(req.params.bookingId);

  const payment = await prisma.payment.findUnique({
    where: { bookingId },
  });

  if (!payment) throw new AppError('Payment not found.', 404);

  res.json({
    success: true,
    status: payment.status,
  });
}