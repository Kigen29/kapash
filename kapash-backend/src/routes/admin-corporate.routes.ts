import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  authenticate, requireAdmin, requireAdminTier, AuthRequest,
} from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { logAdminAction } from '../utils/audit';
import { nextInvoiceNumber, renderInvoiceHtml, computeLineItemsFromEvent } from '../services/invoice.service';

const router = Router();
router.use(authenticate, requireAdmin);

// ─── CORPORATES ───────────────────────────────────────────────────────────────

router.get('/corporates', async (req: Request, res: Response) => {
  const { status, search, page = '1', limit = '20' } = req.query as any;
  const where: Prisma.CorporateWhereInput = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }
  const [corporates, total] = await Promise.all([
    prisma.corporate.findMany({
      where,
      include: { _count: { select: { bookers: true, events: true, invoices: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.corporate.count({ where }),
  ]);
  res.json({ success: true, data: { corporates, total } });
});

router.get('/corporates/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const corp = await prisma.corporate.findUnique({
    where: { id },
    include: {
      bookers: { select: { id: true, name: true, phone: true, email: true, isCorpAdmin: true, isActive: true, createdAt: true } },
      events: { orderBy: { createdAt: 'desc' }, take: 10 },
      invoices: { orderBy: { createdAt: 'desc' }, take: 10 },
      _count: { select: { events: true, invoices: true } },
    },
  });
  if (!corp) throw new AppError('Corporate not found.', 404);
  const totalsAgg = await prisma.invoice.aggregate({
    where: { corporateId: id },
    _sum: { total: true },
  });
  res.json({ success: true, data: { ...corp, lifetimeInvoiced: totalsAgg._sum.total || 0 } });
});

const corpSchema = z.object({
  name: z.string().min(2).max(120),
  tradingName: z.string().max(120).optional(),
  email: z.string().email(),
  phone: z.string().regex(/^\+254\d{9}$/),
  billingAddress: z.string().min(5).max(500),
  kraPin: z.string().max(20).optional(),
  creditLimit: z.coerce.number().min(0).default(0),
  paymentTermDays: z.coerce.number().int().min(0).max(90).default(7),
});
router.post('/corporates', requireAdminTier('OPERATIONS', 'FINANCE'), async (req: AuthRequest, res: Response) => {
  const data = corpSchema.parse(req.body);
  const corp = await prisma.corporate.create({ data });
  await logAdminAction(req.user!.id, 'corporate.create', 'user', corp.id, { name: data.name });
  res.status(201).json({ success: true, data: corp });
});

router.patch('/corporates/:id', requireAdminTier('OPERATIONS', 'FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = corpSchema.partial().parse(req.body);
  const corp = await prisma.corporate.update({ where: { id }, data });
  await logAdminAction(req.user!.id, 'corporate.update', 'user', id, data);
  res.json({ success: true, data: corp });
});

router.delete('/corporates/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const corp = await prisma.corporate.update({ where: { id }, data: { status: 'SUSPENDED' } });
  await logAdminAction(req.user!.id, 'corporate.suspend', 'user', id);
  res.json({ success: true, data: corp });
});

const addBookerSchema = z.object({
  // Either reference an existing user or create a new one
  userId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().regex(/^\+254\d{9}$/).optional(),
  email: z.string().email().optional(),
  isCorpAdmin: z.boolean().default(false),
});
router.post('/corporates/:id/bookers', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = addBookerSchema.parse(req.body);
  const corp = await prisma.corporate.findUnique({ where: { id } });
  if (!corp) throw new AppError('Corporate not found.', 404);

  let userId = data.userId;
  if (!userId) {
    if (!data.phone || !data.name) throw new AppError('Provide userId, or both name and phone for a new booker.', 400);
    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) {
      userId = existing.id;
    } else {
      const created = await prisma.user.create({
        data: {
          name: data.name, phone: data.phone, email: data.email,
          role: 'PLAYER', isVerified: true, phoneVerified: true,
        },
      });
      userId = created.id;
    }
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { corporateId: id, isCorpAdmin: data.isCorpAdmin },
  });
  await logAdminAction(req.user!.id, 'corporate.booker.add', 'user', id, { bookerId: userId });
  res.json({ success: true, data: user });
});

router.delete('/corporates/:id/bookers/:userId', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id, userId } = req.params;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.corporateId !== id) throw new AppError('Booker not found in this corporate.', 404);
  await prisma.user.update({ where: { id: userId }, data: { corporateId: null, isCorpAdmin: false } });
  await logAdminAction(req.user!.id, 'corporate.booker.remove', 'user', id, { bookerId: userId });
  res.json({ success: true });
});

// ─── EVENTS ───────────────────────────────────────────────────────────────────

router.get('/events', async (req: Request, res: Response) => {
  const { status, corporateId, from, to, page = '1', limit = '20' } = req.query as any;
  const where: Prisma.BookingEventWhereInput = {};
  if (status) where.status = status;
  if (corporateId) where.corporateId = corporateId;
  if (from || to) {
    where.date = {};
    if (from) (where.date as any).gte = new Date(from);
    if (to) (where.date as any).lte = new Date(to);
  }
  const [events, total] = await Promise.all([
    prisma.bookingEvent.findMany({
      where,
      include: {
        organizer: { select: { id: true, name: true, phone: true } },
        corporate: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
        invoice: { select: { id: true, number: true, status: true } },
      },
      orderBy: { date: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.bookingEvent.count({ where }),
  ]);
  res.json({ success: true, data: { events, total } });
});

router.get('/events/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const event = await prisma.bookingEvent.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true, phone: true, email: true } },
      corporate: true,
      bookings: { include: { pitch: { select: { id: true, name: true, address: true } } } },
      invoice: true,
    },
  });
  if (!event) throw new AppError('Event not found.', 404);
  res.json({ success: true, data: event });
});

const createEventSchema = z.object({
  name: z.string().min(2).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  organizerId: z.string().uuid(),
  corporateId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).optional(),
  bookings: z.array(z.object({
    pitchId: z.string().uuid(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })).min(1).max(20),
});
router.post('/events', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const data = createEventSchema.parse(req.body);
  const eventDate = new Date(data.date);

  const event = await prisma.$transaction(async (tx) => {
    const ev = await tx.bookingEvent.create({
      data: {
        name: data.name, date: eventDate,
        organizerId: data.organizerId,
        corporateId: data.corporateId ?? undefined,
        notes: data.notes,
        status: 'CONFIRMED',
      },
    });

    let total = 0;
    for (const b of data.bookings) {
      const pitch = await tx.pitch.findUnique({ where: { id: b.pitchId }, select: { id: true, name: true, address: true, pricePerHour: true, commissionRate: true } });
      if (!pitch) throw new AppError(`Pitch ${b.pitchId} not found.`, 404);

      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      const durationMins = (eh * 60 + em) - (sh * 60 + sm);
      if (durationMins <= 0) throw new AppError('Invalid time range.', 400);

      const slot = await tx.timeSlot.upsert({
        where: { pitchId_date_startTime: { pitchId: pitch.id, date: eventDate, startTime: b.startTime } },
        update: { status: 'BOOKED', endTime: b.endTime },
        create: { pitchId: pitch.id, date: eventDate, startTime: b.startTime, endTime: b.endTime, status: 'BOOKED' },
      });
      const existing = await tx.booking.findUnique({ where: { slotId: slot.id } });
      if (existing) throw new AppError(`Slot ${pitch.name} @ ${b.startTime} already booked.`, 409);

      const subtotal = pitch.pricePerHour * (durationMins / 60);
      const commission = subtotal * pitch.commissionRate;
      const ownerAmt = subtotal - commission;
      total += subtotal;

      await tx.booking.create({
        data: {
          userId: data.organizerId, pitchId: pitch.id, slotId: slot.id,
          pitchName: pitch.name, pitchAddress: pitch.address,
          date: eventDate, startTime: b.startTime, endTime: b.endTime,
          durationMins, pricePerHour: pitch.pricePerHour,
          totalAmount: subtotal, commissionAmount: commission, ownerAmount: ownerAmt,
          status: 'CONFIRMED',
          eventId: ev.id, corporateId: data.corporateId ?? undefined,
        },
      });
    }
    return tx.bookingEvent.update({ where: { id: ev.id }, data: { totalAmount: total } });
  });

  await logAdminAction(req.user!.id, 'event.create', 'booking', event.id, { bookings: data.bookings.length, total: event.totalAmount });
  res.status(201).json({ success: true, data: event });
});

const updateEventSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});
router.patch('/events/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = updateEventSchema.parse(req.body);
  const event = await prisma.bookingEvent.update({ where: { id }, data });
  await logAdminAction(req.user!.id, 'event.update', 'booking', id, data);
  res.json({ success: true, data: event });
});

router.delete('/events/:id', requireAdminTier('OPERATIONS'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const event = await tx.bookingEvent.findUnique({ where: { id }, include: { bookings: true } });
    if (!event) throw new AppError('Event not found.', 404);
    for (const b of event.bookings) {
      await tx.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Event cancelled' } });
      await tx.timeSlot.update({ where: { id: b.slotId }, data: { status: 'AVAILABLE' } });
    }
    await tx.bookingEvent.update({ where: { id }, data: { status: 'CANCELLED' } });
  });
  await logAdminAction(req.user!.id, 'event.cancel', 'booking', id);
  res.json({ success: true });
});

// ─── INVOICES ─────────────────────────────────────────────────────────────────

router.get('/invoices', async (req: Request, res: Response) => {
  const { status, corporateId, page = '1', limit = '20' } = req.query as any;
  const where: Prisma.InvoiceWhereInput = {};
  if (status) where.status = status;
  if (corporateId) where.corporateId = corporateId;
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        corporate: { select: { id: true, name: true } },
        event: { select: { id: true, name: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ success: true, data: { invoices, total } });
});

router.get('/invoices/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      corporate: true,
      event: { include: { bookings: { include: { pitch: { select: { name: true } } } } } },
    },
  });
  if (!invoice) throw new AppError('Invoice not found.', 404);
  res.json({ success: true, data: invoice });
});

const createInvoiceSchema = z.object({
  corporateId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  amount: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).default(0),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lineItems: z.array(z.object({
    description: z.string(),
    qty: z.coerce.number().min(1),
    unitPrice: z.coerce.number().min(0),
    total: z.coerce.number().min(0),
  })).min(1),
  notes: z.string().max(2000).optional(),
});
router.post('/invoices', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const data = createInvoiceSchema.parse(req.body);
  const number = await nextInvoiceNumber();
  const total = data.amount + data.tax;
  const invoice = await prisma.invoice.create({
    data: {
      number,
      corporateId: data.corporateId,
      amount: data.amount, tax: data.tax, total,
      dueDate: new Date(data.dueDate),
      lineItems: data.lineItems,
      notes: data.notes,
      createdBy: req.user!.id,
      status: 'DRAFT',
    },
  });
  if (data.eventId) {
    await prisma.bookingEvent.update({ where: { id: data.eventId }, data: { invoiceId: invoice.id } });
  }
  await logAdminAction(req.user!.id, 'invoice.create', 'payout', invoice.id, { corporateId: data.corporateId, total });
  res.status(201).json({ success: true, data: invoice });
});

// Auto-create from an event: builds line items from its bookings
const fromEventSchema = z.object({
  eventId: z.string().uuid(),
  dueInDays: z.coerce.number().int().min(0).max(90).default(7),
  taxRate: z.coerce.number().min(0).max(0.2).default(0.16), // Kenya VAT 16%
});
router.post('/invoices/from-event', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { eventId, dueInDays, taxRate } = fromEventSchema.parse(req.body);
  const event = await prisma.bookingEvent.findUnique({
    where: { id: eventId },
    include: { bookings: { include: { pitch: { select: { name: true } } } } },
  });
  if (!event) throw new AppError('Event not found.', 404);
  if (!event.corporateId) throw new AppError('Event has no corporate — cannot invoice.', 400);
  if (event.invoiceId) throw new AppError('Event already has an invoice.', 409);

  const { lineItems, subtotal } = computeLineItemsFromEvent(event as any);
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + dueInDays);
  const number = await nextInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      number, corporateId: event.corporateId,
      amount: subtotal, tax, total,
      dueDate, lineItems,
      createdBy: req.user!.id,
      status: 'DRAFT',
    },
  });
  await prisma.bookingEvent.update({ where: { id: eventId }, data: { invoiceId: invoice.id } });
  await logAdminAction(req.user!.id, 'invoice.create_from_event', 'payout', invoice.id, { eventId, total });
  res.status(201).json({ success: true, data: invoice });
});

router.patch('/invoices/:id', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const data = createInvoiceSchema.partial().parse(req.body);
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) throw new AppError('Invoice not found.', 404);
  if (existing.status !== 'DRAFT') throw new AppError('Only DRAFT invoices can be edited.', 400);
  const total = (data.amount ?? existing.amount) + (data.tax ?? existing.tax);
  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      ...data,
      total,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
  await logAdminAction(req.user!.id, 'invoice.update', 'payout', id, data);
  res.json({ success: true, data: updated });
});

router.patch('/invoices/:id/send', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const invoice = await prisma.invoice.update({
    where: { id }, data: { status: 'SENT' },
    include: { corporate: { include: { bookers: { where: { isCorpAdmin: true }, select: { id: true } } } } },
  });
  // Notify the corporate admin(s)
  for (const booker of invoice.corporate.bookers) {
    await prisma.notification.create({
      data: {
        userId: booker.id, type: 'INVOICE_SENT',
        title: `Invoice ${invoice.number}`, body: `KSh ${invoice.total.toLocaleString()} due ${invoice.dueDate.toDateString()}`,
      },
    });
  }
  await logAdminAction(req.user!.id, 'invoice.send', 'payout', id);
  res.json({ success: true, data: invoice });
});

const markPaidSchema = z.object({ paymentRef: z.string().min(1), paidAt: z.string().optional() });
router.patch('/invoices/:id/mark-paid', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { paymentRef, paidAt } = markPaidSchema.parse(req.body);
  const invoice = await prisma.invoice.update({
    where: { id }, data: { status: 'PAID', paymentRef, paidAt: paidAt ? new Date(paidAt) : new Date() },
  });
  await logAdminAction(req.user!.id, 'invoice.paid', 'payout', id, { paymentRef });
  res.json({ success: true, data: invoice });
});

router.patch('/invoices/:id/void', requireAdminTier('FINANCE'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const invoice = await prisma.invoice.update({ where: { id }, data: { status: 'VOID' } });
  await logAdminAction(req.user!.id, 'invoice.void', 'payout', id);
  res.json({ success: true, data: invoice });
});

router.get('/invoices/:id/pdf', async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { corporate: true, event: true },
  });
  if (!invoice) throw new AppError('Invoice not found.', 404);
  const html = renderInvoiceHtml(invoice as any);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export default router;
