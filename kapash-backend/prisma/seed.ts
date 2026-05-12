/**
 * KAPASH seed — populates a realistic dev/demo dataset.
 *
 * Run with: npx prisma db seed   (after `prisma migrate dev`)
 *
 * Idempotent: safe to re-run on top of an existing DB; uses upserts where it can,
 * and skips creation if data of the same kind already exists in volume.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// ── Tuning ────────────────────────────────────────────────────────────────────
const COUNTS = {
  players: 100,
  owners: 15,
  pitchesPerOwner: 2,
  bookingsPerPlayer: 6,
  reviewsRatio: 0.4,           // fraction of completed bookings that get a review
  corporates: 6,
  bookersPerCorporate: 3,
  eventsPerCorporate: 2,
};

const NAIROBI_CENTER = { lat: -1.286389, lng: 36.817223 };
const jitter = (n: number, r: number) => n + (Math.random() - 0.5) * r;

const cities = ['Nairobi', 'Westlands', 'Karen', 'Lavington', 'Ngong', 'Kileleshwa', 'Kasarani', 'Embakasi'];
const pitchTypes = ['ASTRO_TURF', 'NATURAL_GRASS', 'CONCRETE', 'HYBRID'] as const;
const pitchSizes = ['FIVE_A_SIDE', 'SEVEN_A_SIDE', 'ELEVEN_A_SIDE'] as const;

const AMENITIES = [
  { name: 'Changing Rooms',  icon: '🚿', category: 'comfort' },
  { name: 'Parking',         icon: '🅿️', category: 'comfort' },
  { name: 'Floodlights',     icon: '💡', category: 'play' },
  { name: 'Artificial Turf', icon: '🌿', category: 'play' },
  { name: 'Spectator Seats', icon: '💺', category: 'comfort' },
  { name: 'Refreshments',    icon: '🍶', category: 'comfort' },
  { name: 'Wi-Fi',           icon: '📶', category: 'comfort' },
  { name: 'First Aid',       icon: '🏥', category: 'safety' },
  { name: 'Goalkeeper Kits', icon: '🧤', category: 'play' },
  { name: 'Showers',         icon: '🚿', category: 'comfort' },
  { name: 'Ball Provided',   icon: '⚽', category: 'play' },
  { name: 'Bibs Provided',   icon: '👕', category: 'play' },
  { name: 'Coaching',        icon: '🧑‍🏫', category: 'play' },
  { name: 'Security',        icon: '🛡️', category: 'safety' },
  { name: 'CCTV',            icon: '📹', category: 'safety' },
];

const ADMINS = [
  { name: 'Super Admin',      phone: '+254700000003', email: 'super@kapash.local',      tier: 'SUPER'      as const },
  { name: 'Operations Admin', phone: '+254700000004', email: 'operations@kapash.local', tier: 'OPERATIONS' as const },
  { name: 'Finance Admin',    phone: '+254700000005', email: 'finance@kapash.local',    tier: 'FINANCE'    as const },
  { name: 'Support Admin',    phone: '+254700000006', email: 'support@kapash.local',    tier: 'SUPPORT'    as const },
];

function kenyanPhone(): string {
  return `+2547${faker.string.numeric(8)}`;
}

function pickN<T>(arr: T[], n: number): T[] {
  return faker.helpers.arrayElements(arr, Math.min(n, arr.length));
}

async function main() {
  console.log('🌱 Seeding KAPASH…');

  // 1. Amenities catalog
  console.log('  · amenities catalog');
  for (const a of AMENITIES) {
    await prisma.amenity.upsert({
      where: { name: a.name },
      update: { icon: a.icon, category: a.category, isActive: true },
      create: { name: a.name, icon: a.icon, category: a.category, isActive: true },
    });
  }

  // 2. Admins (4 tiers)
  console.log('  · admins (4 tiers)');
  for (const a of ADMINS) {
    await prisma.user.upsert({
      where: { phone: a.phone },
      update: { name: a.name, email: a.email, role: 'ADMIN', adminTier: a.tier, isActive: true, phoneVerified: true, isVerified: true },
      create: { name: a.name, phone: a.phone, email: a.email, role: 'ADMIN', adminTier: a.tier, isActive: true, phoneVerified: true, isVerified: true },
    });
  }

  // 3. System settings
  console.log('  · system settings');
  await prisma.systemSetting.upsert({
    where: { key: 'commission_rate' },
    update: { value: 0.13 },
    create: { key: 'commission_rate', value: 0.13 },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'auto_verify_pitches' },
    update: { value: false },
    create: { key: 'auto_verify_pitches', value: false },
  });

  // 4. Players
  const existingPlayers = await prisma.user.count({ where: { role: 'PLAYER', corporateId: null } });
  if (existingPlayers < COUNTS.players) {
    console.log(`  · ${COUNTS.players - existingPlayers} players`);
    const playerData: Prisma.UserCreateManyInput[] = [];
    for (let i = 0; i < COUNTS.players - existingPlayers; i++) {
      playerData.push({
        name: faker.person.fullName(),
        phone: kenyanPhone(),
        email: faker.internet.email().toLowerCase(),
        role: 'PLAYER',
        isVerified: true,
        phoneVerified: true,
        isActive: faker.helpers.weightedArrayElement([
          { weight: 9, value: true }, { weight: 1, value: false },
        ]),
      });
    }
    await prisma.user.createMany({ data: playerData, skipDuplicates: true });
  }
  const players = await prisma.user.findMany({
    where: { role: 'PLAYER', corporateId: null }, take: COUNTS.players,
  });

  // 5. Owners
  const existingOwners = await prisma.user.count({ where: { role: 'OWNER' } });
  if (existingOwners < COUNTS.owners) {
    console.log(`  · ${COUNTS.owners - existingOwners} owners`);
    for (let i = 0; i < COUNTS.owners - existingOwners; i++) {
      await prisma.user.create({
        data: {
          name: faker.person.fullName(),
          phone: kenyanPhone(),
          email: faker.internet.email().toLowerCase(),
          role: 'OWNER', isVerified: true, phoneVerified: true,
        },
      });
    }
  }
  const owners = await prisma.user.findMany({ where: { role: 'OWNER' }, take: COUNTS.owners });

  // 6. Pitches
  const existingPitches = await prisma.pitch.count();
  if (existingPitches < owners.length * COUNTS.pitchesPerOwner) {
    console.log(`  · creating pitches`);
    for (const owner of owners) {
      const have = await prisma.pitch.count({ where: { ownerId: owner.id } });
      for (let i = have; i < COUNTS.pitchesPerOwner; i++) {
        const city = faker.helpers.arrayElement(cities);
        const pitchName = `${city} ${faker.helpers.arrayElement(['Arena', 'Grounds', 'Park', 'Pitch', 'Stadium'])} ${faker.number.int({ min: 1, max: 99 })}`;
        const amenityNames = pickN(AMENITIES.map(a => a.name), faker.number.int({ min: 3, max: 7 }));
        const status = faker.helpers.weightedArrayElement([
          { weight: 7, value: 'ACTIVE' as const },
          { weight: 1, value: 'PENDING_VERIFICATION' as const },
          { weight: 1, value: 'SUSPENDED' as const },
          { weight: 1, value: 'INACTIVE' as const },
        ]);
        const isActive = status === 'ACTIVE';
        await prisma.pitch.create({
          data: {
            ownerId: owner.id,
            name: pitchName,
            description: faker.lorem.sentence({ min: 8, max: 16 }),
            address: `${faker.location.streetAddress()}, ${city}`,
            city, county: 'Nairobi',
            latitude: jitter(NAIROBI_CENTER.lat, 0.15),
            longitude: jitter(NAIROBI_CENTER.lng, 0.15),
            type: faker.helpers.arrayElement(pitchTypes),
            size: faker.helpers.arrayElement(pitchSizes),
            pricePerHour: faker.helpers.arrayElement([1500, 2000, 2500, 3000, 3500, 4000, 5000]),
            status,
            isVerified: isActive,
            verifiedAt: isActive ? faker.date.recent({ days: 60 }) : null,
            avgRating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
            reviewCount: faker.number.int({ min: 0, max: 50 }),
            operatingHours: {
              monday: { open: '06:00', close: '22:00' }, tuesday: { open: '06:00', close: '22:00' },
              wednesday: { open: '06:00', close: '22:00' }, thursday: { open: '06:00', close: '22:00' },
              friday: { open: '06:00', close: '22:00' }, saturday: { open: '06:00', close: '22:00' },
              sunday: { open: '06:00', close: '22:00' },
            },
            images: {
              create: [{
                url: faker.helpers.arrayElement([
                  'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800',
                  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
                  'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=800',
                  'https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?w=800',
                ]),
                publicId: `seed-${faker.string.uuid()}`,
                isPrimary: true,
                order: 0,
              }],
            },
            amenities: {
              create: amenityNames.map(name => {
                const a = AMENITIES.find(x => x.name === name)!;
                return { name: a.name, icon: a.icon };
              }),
            },
          },
        });
      }
    }
  }
  const activePitches = await prisma.pitch.findMany({ where: { status: 'ACTIVE' }, take: 200 });

  // 7. Bookings + payments + payouts
  const existingBookings = await prisma.booking.count();
  if (existingBookings < 50) {
    console.log(`  · bookings + payments + payouts`);
    let count = 0;
    for (const player of players.slice(0, 80)) {
      for (let i = 0; i < COUNTS.bookingsPerPlayer; i++) {
        const pitch = faker.helpers.arrayElement(activePitches);
        const offsetDays = faker.number.int({ min: -300, max: 14 });
        const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offsetDays);
        const startHour = faker.number.int({ min: 6, max: 20 });
        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        const endTime   = `${String(startHour + 1).padStart(2, '0')}:00`;

        const status = offsetDays < 0
          ? faker.helpers.weightedArrayElement([
              { weight: 7, value: 'COMPLETED' as const },
              { weight: 1, value: 'CANCELLED' as const },
              { weight: 1, value: 'NO_SHOW' as const },
            ])
          : faker.helpers.weightedArrayElement([
              { weight: 6, value: 'CONFIRMED' as const },
              { weight: 1, value: 'CANCELLED' as const },
            ]);

        try {
          const slot = await prisma.timeSlot.upsert({
            where: { pitchId_date_startTime: { pitchId: pitch.id, date, startTime } },
            update: { status: 'BOOKED', endTime },
            create: { pitchId: pitch.id, date, startTime, endTime, status: 'BOOKED' },
          });
          const existsBooking = await prisma.booking.findUnique({ where: { slotId: slot.id } });
          if (existsBooking) continue;

          const total = pitch.pricePerHour;
          const commission = total * 0.13;
          const ownerAmt = total - commission;

          const booking = await prisma.booking.create({
            data: {
              userId: player.id, pitchId: pitch.id, slotId: slot.id,
              pitchName: pitch.name, pitchAddress: pitch.address,
              date, startTime, endTime, durationMins: 60,
              pricePerHour: pitch.pricePerHour,
              totalAmount: total, commissionAmount: commission, ownerAmount: ownerAmt,
              status,
              cancelledAt: status === 'CANCELLED' ? faker.date.recent() : null,
              cancelReason: status === 'CANCELLED' ? 'Player cancelled' : null,
              createdAt: faker.date.between({
                from: new Date(Date.now() + offsetDays * 86400000 - 30 * 86400000),
                to: new Date(Date.now() + Math.max(offsetDays, -1) * 86400000),
              }),
            },
          });

          if (status === 'CONFIRMED' || status === 'COMPLETED') {
            await prisma.payment.create({
              data: {
                bookingId: booking.id, userId: player.id, amount: total,
                method: 'MPESA', status: 'COMPLETED',
                mpesaPhone: player.phone, mpesaReceiptNumber: faker.string.alphanumeric({ length: 10, casing: 'upper' }),
                mpesaTransactionDate: date.toISOString(),
              },
            });
            if (status === 'COMPLETED') {
              const payoutStatus = faker.helpers.weightedArrayElement([
                { weight: 7, value: 'COMPLETED'  as const },
                { weight: 2, value: 'PENDING'    as const },
                { weight: 1, value: 'PROCESSING' as const },
              ]);
              await prisma.payout.create({
                data: {
                  ownerId: pitch.ownerId, pitchId: pitch.id, bookingId: booking.id,
                  amount: ownerAmt, status: payoutStatus,
                  mpesaPhone: '+254700000000',
                  mpesaTransactionId: payoutStatus === 'COMPLETED' ? faker.string.alphanumeric({ length: 10, casing: 'upper' }) : null,
                  scheduledFor: new Date(date.getTime() + 86400000),
                  processedAt: payoutStatus === 'COMPLETED' ? new Date(date.getTime() + 2 * 86400000) : null,
                },
              });
              if (Math.random() < COUNTS.reviewsRatio) {
                try {
                  await prisma.review.create({
                    data: {
                      userId: player.id, pitchId: pitch.id, bookingId: booking.id,
                      rating: faker.number.int({ min: 3, max: 5 }),
                      comment: faker.lorem.sentence({ min: 5, max: 15 }),
                    },
                  });
                } catch { /* unique violation */ }
              }
            }
          }
          count++;
        } catch {
          // slot conflict or other transient — skip
        }
      }
    }
    console.log(`     created ${count} bookings`);
  }

  // 8. Corporates + bookers + events + invoices
  const existingCorps = await prisma.corporate.count();
  if (existingCorps < COUNTS.corporates) {
    console.log(`  · ${COUNTS.corporates - existingCorps} corporates with bookers, events, invoices`);
    for (let i = 0; i < COUNTS.corporates - existingCorps; i++) {
      const companyName = faker.company.name();
      const corp = await prisma.corporate.create({
        data: {
          name: companyName,
          tradingName: faker.company.buzzNoun(),
          email: faker.internet.email().toLowerCase(),
          phone: kenyanPhone(),
          billingAddress: `${faker.location.streetAddress()}\n${faker.helpers.arrayElement(cities)}, Nairobi\nKenya`,
          kraPin: `P${faker.string.numeric(9)}A`,
          creditLimit: faker.helpers.arrayElement([0, 50_000, 100_000, 250_000]),
          paymentTermDays: faker.helpers.arrayElement([7, 14, 30]),
        },
      });

      const corpAdmin = await prisma.user.create({
        data: {
          name: faker.person.fullName(), phone: kenyanPhone(),
          email: faker.internet.email().toLowerCase(), role: 'PLAYER',
          corporateId: corp.id, isCorpAdmin: true,
          isVerified: true, phoneVerified: true,
        },
      });
      for (let j = 0; j < COUNTS.bookersPerCorporate - 1; j++) {
        await prisma.user.create({
          data: {
            name: faker.person.fullName(), phone: kenyanPhone(),
            email: faker.internet.email().toLowerCase(), role: 'PLAYER',
            corporateId: corp.id, isCorpAdmin: false,
            isVerified: true, phoneVerified: true,
          },
        });
      }

      for (let j = 0; j < COUNTS.eventsPerCorporate; j++) {
        const offsetDays = faker.number.int({ min: -120, max: 30 });
        const eventDate = new Date(); eventDate.setHours(0, 0, 0, 0); eventDate.setDate(eventDate.getDate() + offsetDays);
        const isComplete = offsetDays < 0;

        const event = await prisma.bookingEvent.create({
          data: {
            name: `${faker.company.buzzPhrase()} ${j === 0 ? 'Tournament' : 'Team Building'}`.slice(0, 119),
            date: eventDate,
            organizerId: corpAdmin.id,
            corporateId: corp.id,
            status: isComplete ? 'COMPLETED' : 'CONFIRMED',
            notes: faker.lorem.sentence(),
          },
        });

        const eventPitches = pickN(activePitches, faker.number.int({ min: 2, max: 4 }));
        let eventTotal = 0;
        const startHour = faker.number.int({ min: 9, max: 16 });
        for (let k = 0; k < eventPitches.length; k++) {
          const p = eventPitches[k];
          const st = `${String(startHour + k).padStart(2, '0')}:00`;
          const et = `${String(startHour + k + 1).padStart(2, '0')}:00`;
          try {
            const slot = await prisma.timeSlot.upsert({
              where: { pitchId_date_startTime: { pitchId: p.id, date: eventDate, startTime: st } },
              update: { status: 'BOOKED', endTime: et },
              create: { pitchId: p.id, date: eventDate, startTime: st, endTime: et, status: 'BOOKED' },
            });
            const exists = await prisma.booking.findUnique({ where: { slotId: slot.id } });
            if (exists) continue;
            const subtotal = p.pricePerHour;
            const commission = subtotal * 0.13;
            await prisma.booking.create({
              data: {
                userId: corpAdmin.id, pitchId: p.id, slotId: slot.id,
                pitchName: p.name, pitchAddress: p.address,
                date: eventDate, startTime: st, endTime: et, durationMins: 60,
                pricePerHour: p.pricePerHour,
                totalAmount: subtotal, commissionAmount: commission, ownerAmount: subtotal - commission,
                status: isComplete ? 'COMPLETED' : 'CONFIRMED',
                eventId: event.id, corporateId: corp.id,
              },
            });
            eventTotal += subtotal;
          } catch { /* slot conflict */ }
        }
        await prisma.bookingEvent.update({ where: { id: event.id }, data: { totalAmount: eventTotal } });

        if (isComplete && eventTotal > 0) {
          const year = eventDate.getFullYear();
          const seq = await prisma.invoice.count({ where: { number: { startsWith: `INV-${year}-` } } }) + 1;
          const tax = Math.round(eventTotal * 0.16);
          const total = eventTotal + tax;
          const invoiceStatus = faker.helpers.weightedArrayElement([
            { weight: 6, value: 'PAID' as const },
            { weight: 2, value: 'SENT' as const },
            { weight: 1, value: 'OVERDUE' as const },
          ]);
          const invoice = await prisma.invoice.create({
            data: {
              number: `INV-${year}-${String(seq).padStart(4, '0')}`,
              corporateId: corp.id,
              amount: eventTotal, tax, total,
              dueDate: new Date(eventDate.getTime() + 7 * 86400000),
              status: invoiceStatus,
              paidAt: invoiceStatus === 'PAID' ? new Date(eventDate.getTime() + 5 * 86400000) : null,
              paymentRef: invoiceStatus === 'PAID' ? faker.string.alphanumeric({ length: 10, casing: 'upper' }) : null,
              lineItems: [{ description: `${event.name} — ${eventPitches.length} pitches`, qty: 1, unitPrice: eventTotal, total: eventTotal }],
              createdBy: corpAdmin.id,
            },
          });
          await prisma.bookingEvent.update({ where: { id: event.id }, data: { invoiceId: invoice.id } });
        }
      }
    }
  }

  console.log('✓ Seed complete.');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
