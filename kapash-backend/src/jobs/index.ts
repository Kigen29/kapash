import cron from 'node-cron';
import prisma from '../config/database';
import { sendMpesaB2C } from '../services/mpesa.service';
import { sendSMS, SMS_TEMPLATES } from '../services/sms.service';
import { logger } from '../utils/logger';

export function startCronJobs() {
  logger.info('⏰ Starting cron jobs...');

  // ── 1. Release expired slot holds (every 2 minutes) ───────────────────────
  cron.schedule('*/2 * * * *', async () => {
    try {
      const expired = await prisma.timeSlot.findMany({
        where: {
          status: 'HELD',
          heldUntil: { lt: new Date() },
        },
        select: { id: true, pitchId: true, date: true },
      });

      if (expired.length === 0) return;

      await prisma.timeSlot.updateMany({
        where: { id: { in: expired.map(s => s.id) } },
        data: { status: 'AVAILABLE', heldBy: null, heldUntil: null },
      });

      // Cancel associated pending bookings
      await prisma.booking.updateMany({
        where: {
          slotId: { in: expired.map(s => s.id) },
          status: 'PENDING_PAYMENT',
        },
        data: { status: 'CANCELLED', cancelReason: 'Payment timeout — slot hold expired.' },
      });

      logger.info(`♻️  Released ${expired.length} expired slot holds`);
    } catch (err) {
      logger.error('Slot hold expiry job error:', err);
    }
  });

  // ── 2. Process scheduled payouts (daily at 09:00 EAT) ────────────────────
  cron.schedule('0 6 * * *', async () => { // 06:00 UTC = 09:00 EAT
    logger.info('💰 Running payout job...');

    try {
      const pendingPayouts = await prisma.payout.findMany({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() },
        },
        include: {
          owner: { select: { phone: true, name: true } },
          booking: { select: { pitchName: true, date: true } },
        },
        take: 50, // Process 50 at a time
      });

      logger.info(`Processing ${pendingPayouts.length} payouts...`);

      for (const payout of pendingPayouts) {
        try {
          // Mark as processing
          await prisma.payout.update({
            where: { id: payout.id },
            data: { status: 'PROCESSING' },
          });

          // Send via M-Pesa B2C
          const result = await sendMpesaB2C({
            phone: payout.owner.phone,
            amount: Math.floor(payout.amount),
            payoutId: payout.id,
            remarks: `Kapash payout - ${payout.booking.pitchName}`,
          });

          await prisma.payout.update({
            where: { id: payout.id },
            data: {
              status: 'COMPLETED',
              mpesaTransactionId: result?.ConversationID || 'PROCESSED',
              processedAt: new Date(),
            },
          });

          // Send SMS to owner
          await sendSMS(
            payout.owner.phone,
            SMS_TEMPLATES.payoutSent(Math.floor(payout.amount))
          );

          logger.info(`✅ Payout ${payout.id} processed: KES ${payout.amount} to ${payout.owner.phone}`);

        } catch (err) {
          logger.error(`Payout ${payout.id} failed:`, err);
          await prisma.payout.update({
            where: { id: payout.id },
            data: { status: 'PENDING' }, // Will retry next run
          });
        }
      }
    } catch (err) {
      logger.error('Payout job error:', err);
    }
  });

  // ── 3. Mark past bookings as COMPLETED (every hour) ──────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const todayDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

      // Find confirmed bookings whose end time has passed
      const completed = await prisma.booking.updateMany({
        where: {
          status: 'CONFIRMED',
          OR: [
            { date: { lt: new Date(todayDate) } },
            {
              date: new Date(todayDate),
              endTime: { lte: currentTime },
            },
          ],
        },
        data: { status: 'COMPLETED' },
      });

      if (completed.count > 0) {
        logger.info(`✅ Marked ${completed.count} bookings as COMPLETED`);
      }
    } catch (err) {
      logger.error('Booking completion job error:', err);
    }
  });

  // ── 4. Clean up old OTP sessions (daily at midnight) ─────────────────────
  cron.schedule('0 0 * * *', async () => {
    try {
      const deleted = await prisma.otpSession.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info(`🧹 Cleaned ${deleted.count} expired OTP sessions`);
    } catch (err) {
      logger.error('OTP cleanup job error:', err);
    }
  });

  logger.info('✅ Cron jobs started: slot holds, payouts, completion, cleanup');
}