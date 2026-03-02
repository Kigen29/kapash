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

// ── Schemas ───────────────────────────────────────────────────────────────────

const stkPushSchema = z.object({
  bookingId: z.string().uuid(),
  phone: z.string().regex(/^\+254[0-9]{9}$/, 'Phone must be +254XXXXXXXXX'),
});

// ── Initiate M-Pesa STK Push ──────────────────────────────────────────────────

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

  // Check slot is still held
  const slot = await prisma.timeSlot.findUnique({ where: { id: booking.slotId } });
  if (!slot || slot.status !== 'HELD' || !slot.heldUntil || slot.heldUntil < new Date()) {
    // Slot expired — cancel booking
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
    throw new AppError('Your slot hold has expired. Please start a new booking.', 400);
  }

  // Create or find payment record
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

  // Initiate STK push via Daraja API
  const description = `Kapash - ${booking.pitchName} ${booking.date.toISOString().split('T')[0]} ${booking.startTime}`;
  const stkResult = await initiateMpesaStkPush({
    phone,
    amount: Math.ceil(booking.totalAmount), // M-Pesa requires integer
    bookingId,
    description,
  });

  // Store checkout request ID for callback matching
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
    message: 'M-Pesa payment request sent to your phone. Please enter your PIN.',
    data: {
      checkoutRequestId: stkResult.CheckoutRequestID,
      merchantRequestId: stkResult.MerchantRequestID,
    },
  });
}

// ── M-Pesa Callback (called by Safaricom servers) ─────────────────────────────

export async function mpesaCallback(req: Request, res: Response) {
  // Always respond 200 to Safaricom immediately
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const body = req.body?.Body?.stkCallback;
    if (!body) {
      logger.warn('M-Pesa callback: empty body received');
      return;
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = body;

    logger.info(`M-Pesa callback: CheckoutRequestID=${CheckoutRequestID} ResultCode=${ResultCode}`);

    // Find payment by checkout request ID
    const payment = await prisma.payment.findUnique({
      where: { mpesaCheckoutRequestId: CheckoutRequestID },
      include: {
        booking: {
          include: {
            user: { select: { phone: true, name: true, fcmToken: true } },
            pitch: { include: { owner: { select: { phone: true, fcmToken: true, name: true } } } },
          },
        },
      },
    });

    if (!payment) {
      logger.error(`M-Pesa callback: payment not found for CheckoutRequestID=${CheckoutRequestID}`);
      return;
    }

    if (ResultCode === 0) {
      // ── Payment Successful ────────────────────────────────────────────────

      // Extract metadata
      const items = CallbackMetadata?.Item || [];
      const getMeta = (name: string) => items.find((i: any) => i.Name === name)?.Value;

      const mpesaReceiptNumber = getMeta('MpesaReceiptNumber');
      const transactionDate = getMeta('TransactionDate');
      const amount = getMeta('Amount');

      // Update everything in a transaction
      await prisma.$transaction(async (tx) => {
        // Update payment
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            mpesaReceiptNumber: String(mpesaReceiptNumber),
            mpesaTransactionDate: String(transactionDate),
            resultCode: String(ResultCode),
            resultDesc: ResultDesc,
          },
        });

        // Confirm booking
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CONFIRMED' },
        });

        // Mark slot as BOOKED (permanent)
        await tx.timeSlot.update({
          where: { id: payment.booking.slotId },
          data: { status: 'BOOKED', heldBy: null, heldUntil: null },
        });

        // Schedule owner payout (in 2 days)
        const payoutDate = new Date();
        payoutDate.setDate(payoutDate.getDate() + 2);

        await tx.payout.create({
          data: {
            ownerId: payment.booking.pitch.ownerId,
            pitchId: payment.booking.pitchId,
            bookingId: payment.bookingId,
            amount: payment.booking.ownerAmount,
            mpesaPhone: payment.booking.pitch.owner.phone,
            scheduledFor: payoutDate,
          },
        });

        // Create notification for user
        await tx.notification.create({
          data: {
            userId: payment.booking.userId,
            type: 'BOOKING_CONFIRMED',
            title: '🎉 Booking Confirmed!',
            body: `Your booking at ${payment.booking.pitchName} on ${payment.booking.date.toISOString().split('T')[0]} at ${payment.booking.startTime} is confirmed.`,
            data: { bookingId: payment.bookingId, ticketId: payment.booking.ticketId },
          },
        });

        // Create notification for pitch owner
        await tx.notification.create({
          data: {
            userId: payment.booking.pitch.ownerId,
            type: 'PAYMENT_RECEIVED',
            title: '💰 New Booking!',
            body: `${payment.booking.user.name} booked ${payment.booking.pitchName} for ${payment.booking.startTime} on ${payment.booking.date.toISOString().split('T')[0]}.`,
            data: { bookingId: payment.bookingId },
          },
        });
      });

      // Invalidate availability cache
      const dateStr = payment.booking.date.toISOString().split('T')[0];
      await redis.del(REDIS_KEYS.pitchAvailability(payment.booking.pitchId, dateStr));

      // Send confirmation SMS to customer
      await sendSMS(
        payment.booking.user.phone,
        `✅ Booking Confirmed! ${payment.booking.pitchName} on ${dateStr} at ${payment.booking.startTime}. Ref: ${payment.booking.ticketId.slice(0, 8).toUpperCase()}. M-Pesa Ref: ${mpesaReceiptNumber}`
      );

      // Send SMS to pitch owner
      await sendSMS(
        payment.booking.pitch.owner.phone,
        `📅 New Booking! ${payment.booking.user.name} has booked your pitch on ${dateStr} at ${payment.booking.startTime}. KES ${payment.booking.ownerAmount} will be paid out within 48hrs.`
      );

      // Push notifications
      if (payment.booking.user.fcmToken) {
        await sendPushNotification(payment.booking.user.fcmToken, {
          title: '🎉 Booking Confirmed!',
          body: `${payment.booking.pitchName} · ${payment.booking.startTime}`,
          data: { bookingId: payment.bookingId, screen: 'BookingConfirmation' },
        });
      }

      logger.info(`✅ Booking ${payment.bookingId} confirmed via M-Pesa ${mpesaReceiptNumber}`);

    } else {
      // ── Payment Failed ────────────────────────────────────────────────────

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', resultCode: String(ResultCode), resultDesc: ResultDesc },
        });

        // Release the slot hold
        await tx.timeSlot.update({
          where: { id: payment.booking.slotId },
          data: { status: 'AVAILABLE', heldBy: null, heldUntil: null },
        });

        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'CANCELLED', cancelReason: `Payment failed: ${ResultDesc}` },
        });
      });

      // Notify user of failure
      await sendSMS(
        payment.booking.user.phone,
        `❌ Payment failed for ${payment.booking.pitchName}. ${ResultDesc}. Please try again on Kapash.`
      );

      logger.warn(`❌ Payment failed for booking ${payment.bookingId}: ${ResultDesc}`);
    }

  } catch (error) {
    logger.error('M-Pesa callback processing error:', error);
  }
}

// ── Check Payment Status (polling from app) ───────────────────────────────────

export async function checkPaymentStatus(req: AuthRequest, res: Response) {
  const { bookingId } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    select: { status: true, mpesaReceiptNumber: true, resultDesc: true },
  });

  if (!payment) throw new AppError('Payment not found.', 404);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, userId: req.user!.id },
    select: { status: true, ticketId: true },
  });

  if (!booking) throw new AppError('Booking not found.', 404);

  res.json({
    success: true,
    data: {
      paymentStatus: payment.status,
      bookingStatus: booking.status,
      receiptNumber: payment.mpesaReceiptNumber,
      ticketId: booking.ticketId,
    },
  });
}