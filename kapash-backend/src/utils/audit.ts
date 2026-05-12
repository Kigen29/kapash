import prisma from '../config/database';
import { logger } from './logger';

export type AuditTargetType = 'pitch' | 'user' | 'booking' | 'payout' | 'review' | 'broadcast' | 'setting';

export async function logAdminAction(
  actorId: string,
  action: string,
  targetType: AuditTargetType,
  targetId: string,
  meta?: any,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, meta: meta ?? undefined },
    });
  } catch (err: any) {
    logger.error(`audit log failed for ${action} on ${targetType}:${targetId}: ${err?.message}`);
  }
}
