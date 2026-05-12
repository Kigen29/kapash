import { NotificationType, UserRole } from '@prisma/client';
import prisma from '../config/database';
import { sendMulticastPush } from './notification.service';
import { logger } from '../utils/logger';

export type BroadcastAudience =
  | { kind: 'all' }
  | { kind: 'role'; role: UserRole }
  | { kind: 'users'; userIds: string[] };

interface BroadcastInput {
  audience: BroadcastAudience;
  title: string;
  body: string;
  type?: NotificationType;
  data?: Record<string, string>;
}

interface BroadcastResult {
  recipients: number;
  notifications: number;
  pushDelivered: number;
}

export async function broadcastNotification(input: BroadcastInput): Promise<BroadcastResult> {
  const { audience, title, body, type = 'GENERAL', data } = input;

  const where: any = { isActive: true };
  if (audience.kind === 'role') where.role = audience.role;
  if (audience.kind === 'users') where.id = { in: audience.userIds };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, fcmToken: true },
  });

  if (!users.length) return { recipients: 0, notifications: 0, pushDelivered: 0 };

  // 1) Persist a Notification row per user (so they see it in-app)
  await prisma.notification.createMany({
    data: users.map(u => ({
      userId: u.id,
      type,
      title,
      body,
      data: data ?? undefined,
    })),
  });

  // 2) Fan-out push notifications to users who have an FCM token
  const tokens = users.map(u => u.fcmToken).filter((t): t is string => !!t);
  try {
    await sendMulticastPush(tokens, { title, body, data });
  } catch (err: any) {
    logger.error(`broadcast push fan-out failed: ${err?.message}`);
  }

  return {
    recipients: users.length,
    notifications: users.length,
    pushDelivered: tokens.length,
  };
}
