import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import redis, { REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { AppError } from '../utils/errors';
import { AuthRequest } from '../middleware/authenticate';

// ── Schemas ───────────────────────────────────────────────────────────────────

const searchSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  city: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(['ASTRO_TURF', 'NATURAL_GRASS', 'CONCRETE', 'HYBRID']).optional(),
  size: z.enum(['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE']).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  amenities: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().max(50).default(20),
});

const createPitchSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  address: z.string().min(5),
  city: z.string().default('Nairobi'),
  county: z.string().default('Nairobi'),
  latitude: z.coerce.number().min(-5).max(5),
  longitude: z.coerce.number().min(33).max(42),
  type: z.enum(['ASTRO_TURF', 'NATURAL_GRASS', 'CONCRETE', 'HYBRID']).default('ASTRO_TURF'),
  size: z.enum(['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE']).default('SEVEN_A_SIDE'),
  pricePerHour: z.coerce.number().min(500).max(20000),
  operatingHours: z.record(z.object({
    open: z.string(),
    close: z.string(),
  })).optional(),
  amenities: z.array(z.object({
    name: z.string(),
    icon: z.string().optional(),
  })).optional(),
});

// ── Search Pitches ────────────────────────────────────────────────────────────

export async function searchPitches(req: Request, res: Response) {
  const params = searchSchema.parse(req.query);
  const skip = (params.page - 1) * params.limit;

  const where: any = {
    status: 'ACTIVE',
    isVerified: true,
  };

  if (params.city) where.city = { contains: params.city, mode: 'insensitive' };
  if (params.type) where.type = params.type;
  if (params.size) where.size = params.size;
  if (params.minPrice || params.maxPrice) {
    where.pricePerHour = {};
    if (params.minPrice) where.pricePerHour.gte = params.minPrice;
    if (params.maxPrice) where.pricePerHour.lte = params.maxPrice;
  }
  if (params.amenities) {
    const amenityList = params.amenities.split(',').map(a => a.trim());
    where.amenities = {
      some: { name: { in: amenityList } },
    };
  }

  const [pitches, total] = await Promise.all([
    prisma.pitch.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        amenities: true,
        _count: { select: { bookings: true } },
      },
      orderBy: [
        { avgRating: 'desc' },
        { reviewCount: 'desc' },
      ],
      skip,
      take: params.limit,
    }),
    prisma.pitch.count({ where }),
  ]);

  let result = pitches;
  if (params.lat && params.lng) {
    result = pitches
      .map(pitch => ({
        ...pitch,
        distance: calcDistanceKm(params.lat!, params.lng!, pitch.latitude, pitch.longitude),
      }))
      .sort((a: any, b: any) => a.distance - b.distance);
  }

  res.json({
    success: true,
    data: {
      pitches: result,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages: Math.ceil(total / params.limit),
      },
    },
  });
}

// ── Get Single Pitch ──────────────────────────────────────────────────────────

export async function getPitch(req: Request, res: Response) {
  const id = String(req.params.id);

  const pitch = await prisma.pitch.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: 'asc' } },
      amenities: true,
      owner: {
        select: { id: true, name: true, avatar: true, createdAt: true },
      },
      reviews: {
        where: { isVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  });

  if (!pitch) throw new AppError('Pitch not found.', 404);
  if (pitch.status !== 'ACTIVE' && pitch.status !== 'PENDING_VERIFICATION') {
    throw new AppError('This pitch is not available.', 404);
  }

  res.json({ success: true, data: pitch });
}

// ── Get Pitch Availability ────────────────────────────────────────────────────

export async function getPitchAvailability(req: Request, res: Response) {
  const id = String(req.params.id);
  const date = String(req.query.date || '');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('Valid date (YYYY-MM-DD) is required.', 400);
  }

  // Try cache first
  const cacheKey = REDIS_KEYS.pitchAvailability(id, date);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: JSON.parse(cached), cached: true });
  }

  const pitch = await prisma.pitch.findUnique({
    where: { id },
    select: { operatingHours: true, pricePerHour: true },
  });
  if (!pitch) throw new AppError('Pitch not found.', 404);

  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const hours = (pitch.operatingHours as any)[dayName];

  if (!hours) {
    return res.json({ success: true, data: { date, slots: [], message: 'Pitch closed on this day' } });
  }

  const slots = generateHourlySlots(hours.open, hours.close);

  const existingSlots = await prisma.timeSlot.findMany({
    where: {
      pitchId: id,
      date: new Date(date),
    },
    select: { startTime: true, endTime: true, status: true, heldUntil: true },
  });

  const bookedTimes = new Set(existingSlots
    .filter(s => s.status === 'BOOKED' || s.status === 'BLOCKED' ||
      (s.status === 'HELD' && s.heldUntil && s.heldUntil > new Date()))
    .map(s => s.startTime));

  const result = slots.map(slot => ({
    ...slot,
    status: bookedTimes.has(slot.startTime) ? 'UNAVAILABLE' : 'AVAILABLE',
    price: pitch.pricePerHour,
  }));

  await redis.setex(cacheKey, REDIS_TTL.pitchAvailability, JSON.stringify({ date, slots: result }));

  res.json({ success: true, data: { date, slots: result } });
}

// ── Create Pitch (Owner) ──────────────────────────────────────────────────────

export async function createPitch(req: AuthRequest, res: Response) {
  const data = createPitchSchema.parse(req.body);
  const ownerId = req.user!.id;

  const pitch = await prisma.pitch.create({
    data: {
      ...data,
      ownerId,
      amenities: data.amenities ? {
        create: data.amenities.map(a => ({ name: a.name, icon: a.icon || '⚽' })),
      } : undefined,
    },
    include: { amenities: true, images: true },
  });

  res.status(201).json({
    success: true,
    message: 'Pitch submitted for verification. Our team will review it within 5 business days.',
    data: pitch,
  });
}

// ── Update Pitch (Owner) ──────────────────────────────────────────────────────

export async function updatePitch(req: AuthRequest, res: Response) {
  const id = String(req.params.id);

  const pitch = await prisma.pitch.findUnique({ where: { id } });
  if (!pitch) throw new AppError('Pitch not found.', 404);
  if (pitch.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not own this pitch.', 403);
  }

  const updateSchema = createPitchSchema.partial();
  const data = updateSchema.parse(req.body);

  const updated = await prisma.pitch.update({
    where: { id },
    data: {
      ...data,
      amenities: data.amenities ? {
        deleteMany: {},
        create: data.amenities.map(a => ({ name: a.name, icon: a.icon || '⚽' })),
      } : undefined,
    },
    include: { amenities: true, images: true },
  });

  res.json({ success: true, data: updated });
}

// ── Helper Functions ──────────────────────────────────────────────────────────

function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) { return deg * (Math.PI / 180); }

function generateHourlySlots(open: string, close: string) {
  const slots = [];
  let [h] = open.split(':').map(Number);
  const [closeH] = close.split(':').map(Number);

  while (h < closeH) {
    const start = `${String(h).padStart(2, '0')}:00`;
    const end = `${String(h + 1).padStart(2, '0')}:00`;
    slots.push({ startTime: start, endTime: end });
    h++;
  }
  return slots;
}