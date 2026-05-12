import { Router, Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import {
  authenticate, requireAdmin, requireAdminTier,
} from '../middleware/authenticate';
import prisma from '../config/database';
import { streamCsv } from '../services/csv.service';

const router = Router();
router.use(authenticate, requireAdmin);

const dateRange = (req: Request) => {
  const fromQ = req.query.from as string | undefined;
  const toQ = req.query.to as string | undefined;
  const from = fromQ ? new Date(fromQ) : new Date(Date.now() - 30 * 86400000);
  const to = toQ ? new Date(toQ) : new Date();
  return { from, to };
};

const MAX_ROWS = 100_000;

router.get('/bookings.csv', requireAdminTier('OPERATIONS', 'FINANCE'), async (req: Request, res: Response) => {
  const { from, to } = dateRange(req);
  const bookings = await prisma.booking.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { user: { select: { name: true, phone: true } }, pitch: { select: { name: true, owner: { select: { name: true } } } } },
    take: MAX_ROWS,
    orderBy: { createdAt: 'desc' },
  });
  const headers = ['ticket', 'date', 'time', 'pitch', 'owner', 'customer', 'phone', 'status', 'total', 'commission', 'owner_amount', 'created_at'];
  const rows = bookings.map(b => ({
    ticket: b.ticketId,
    date: b.date.toISOString().split('T')[0],
    time: `${b.startTime}-${b.endTime}`,
    pitch: b.pitchName,
    owner: b.pitch?.owner?.name || '',
    customer: b.user?.name || '',
    phone: b.user?.phone || '',
    status: b.status,
    total: b.totalAmount,
    commission: b.commissionAmount,
    owner_amount: b.ownerAmount,
    created_at: b.createdAt.toISOString(),
  }));
  streamCsv(res, `bookings_${from.toISOString().split('T')[0]}_${to.toISOString().split('T')[0]}.csv`, headers, rows);
});

router.get('/payouts.csv', requireAdminTier('FINANCE'), async (req: Request, res: Response) => {
  const { from, to } = dateRange(req);
  const payouts = await prisma.payout.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { owner: { select: { name: true, phone: true } }, booking: { select: { pitchName: true, date: true } } },
    take: MAX_ROWS,
    orderBy: { createdAt: 'desc' },
  });
  const headers = ['id', 'owner', 'owner_phone', 'pitch', 'booking_date', 'amount', 'status', 'mpesa_tx', 'scheduled_for', 'processed_at'];
  const rows = payouts.map(p => ({
    id: p.id, owner: p.owner?.name || '', owner_phone: p.owner?.phone || '',
    pitch: p.booking?.pitchName || '', booking_date: p.booking?.date.toISOString().split('T')[0] || '',
    amount: p.amount, status: p.status,
    mpesa_tx: p.mpesaTransactionId || '',
    scheduled_for: p.scheduledFor.toISOString(),
    processed_at: p.processedAt ? p.processedAt.toISOString() : '',
  }));
  streamCsv(res, `payouts_${from.toISOString().split('T')[0]}_${to.toISOString().split('T')[0]}.csv`, headers, rows);
});

router.get('/users.csv', requireAdminTier('OPERATIONS'), async (req: Request, res: Response) => {
  const role = req.query.role as string | undefined;
  const where: Prisma.UserWhereInput = role ? { role: role as any } : {};
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, phone: true, email: true, role: true, adminTier: true, isActive: true, walletBalance: true, createdAt: true },
    take: MAX_ROWS, orderBy: { createdAt: 'desc' },
  });
  const headers = ['id', 'name', 'phone', 'email', 'role', 'admin_tier', 'is_active', 'wallet', 'joined'];
  const rows = users.map(u => ({
    id: u.id, name: u.name, phone: u.phone || '', email: u.email || '',
    role: u.role, admin_tier: u.adminTier || '',
    is_active: u.isActive,
    wallet: u.walletBalance,
    joined: u.createdAt.toISOString().split('T')[0],
  }));
  streamCsv(res, 'users.csv', headers, rows);
});

router.get('/revenue.csv', requireAdminTier('FINANCE'), async (req: Request, res: Response) => {
  const { from, to } = dateRange(req);
  const groupBy = (req.query.groupBy as string) || 'day';
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, date: { gte: from, lte: to } },
    select: { date: true, totalAmount: true, commissionAmount: true, ownerAmount: true },
    take: MAX_ROWS,
  });
  const bucket = (d: Date) => {
    if (groupBy === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return d.toISOString().split('T')[0];
  };
  const agg: Record<string, { revenue: number; commission: number; ownerAmt: number; bookings: number }> = {};
  for (const b of bookings) {
    const k = bucket(b.date);
    const row = agg[k] || { revenue: 0, commission: 0, ownerAmt: 0, bookings: 0 };
    row.revenue += b.totalAmount; row.commission += b.commissionAmount;
    row.ownerAmt += b.ownerAmount; row.bookings += 1;
    agg[k] = row;
  }
  const headers = ['period', 'bookings', 'revenue', 'commission', 'owner_amount'];
  const rows = Object.entries(agg).sort(([a], [b]) => a.localeCompare(b)).map(([period, v]) => ({
    period, bookings: v.bookings, revenue: v.revenue, commission: v.commission, owner_amount: v.ownerAmt,
  }));
  streamCsv(res, `revenue_${groupBy}_${from.toISOString().split('T')[0]}_${to.toISOString().split('T')[0]}.csv`, headers, rows);
});

router.get('/audit-logs.csv', requireAdminTier(), async (req: Request, res: Response) => {
  const { from, to } = dateRange(req);
  const logs = await prisma.auditLog.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { actor: { select: { name: true } } },
    take: MAX_ROWS, orderBy: { createdAt: 'desc' },
  });
  const headers = ['timestamp', 'actor', 'action', 'target_type', 'target_id', 'meta'];
  const rows = logs.map(l => ({
    timestamp: l.createdAt.toISOString(),
    actor: l.actor?.name || l.actorId,
    action: l.action,
    target_type: l.targetType,
    target_id: l.targetId,
    meta: JSON.stringify(l.meta || {}),
  }));
  streamCsv(res, `audit-logs_${from.toISOString().split('T')[0]}_${to.toISOString().split('T')[0]}.csv`, headers, rows);
});

export default router;
