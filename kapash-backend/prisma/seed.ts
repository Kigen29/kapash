import { PrismaClient, PitchType, PitchSize, PitchStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Kapash database...');

  // ── Admin User ───────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { phone: '+254700000001' },
    update: {},
    create: {
      phone: '+254700000001',
      email: 'admin@kapash.co.ke',
      name: 'Kapash Admin',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  // ── Pitch Owner ──────────────────────────────────────────────────────────
  const pitchOwner = await prisma.user.upsert({
    where: { phone: '+254711111111' },
    update: {},
    create: {
      phone: '+254711111111',
      email: 'owner@camptoyoyo.co.ke',
      name: 'Joseph Kamau',
      role: 'PITCH_OWNER',
      isVerified: true,
    },
  });

  // ── Customer ─────────────────────────────────────────────────────────────
  const customer = await prisma.user.upsert({
    where: { phone: '+254722222222' },
    update: {},
    create: {
      phone: '+254722222222',
      email: 'player@example.com',
      name: 'Brian Kigen',
      role: 'CUSTOMER',
      isVerified: true,
    },
  });

  // ── Sample Pitches ───────────────────────────────────────────────────────
  const pitches = [
    {
      ownerId: pitchOwner.id,
      name: 'Camp Toyoyo',
      description: 'Premium 7-a-side astro turf pitch in the heart of Jericho. Flood-lit for night games, fully fenced.',
      address: 'Jericho Estate, Makadara',
      city: 'Nairobi',
      county: 'Nairobi',
      latitude: -1.2957,
      longitude: 36.8706,
      type: PitchType.ASTRO_TURF,
      size: PitchSize.SEVEN_A_SIDE,
      pricePerHour: 2500,
      status: PitchStatus.ACTIVE,
      isVerified: true,
      avgRating: 4.9,
      reviewCount: 124,
      operatingHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '23:00' },
        saturday: { open: '06:00', close: '23:00' },
        sunday: { open: '07:00', close: '22:00' },
      },
    },
    {
      ownerId: pitchOwner.id,
      name: 'Ligi Ndogo Grounds',
      description: 'Historic full-size natural grass pitch on Ngong Road. Hosts corporate leagues and youth tournaments.',
      address: 'Ngong Road, Kilimani',
      city: 'Nairobi',
      county: 'Nairobi',
      latitude: -1.2921,
      longitude: 36.7784,
      type: PitchType.NATURAL_GRASS,
      size: PitchSize.ELEVEN_A_SIDE,
      pricePerHour: 2000,
      status: PitchStatus.ACTIVE,
      isVerified: true,
      avgRating: 4.7,
      reviewCount: 89,
      operatingHours: {
        monday: { open: '06:00', close: '21:00' },
        tuesday: { open: '06:00', close: '21:00' },
        wednesday: { open: '06:00', close: '21:00' },
        thursday: { open: '06:00', close: '21:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '06:00', close: '22:00' },
        sunday: { open: '07:00', close: '21:00' },
      },
    },
    {
      ownerId: pitchOwner.id,
      name: 'Arena One Kasarani',
      description: 'Brand new 5-a-side astro turf in Kasarani. Parking available, changing rooms, showers.',
      address: 'Kasarani, Nairobi',
      city: 'Nairobi',
      county: 'Nairobi',
      latitude: -1.2167,
      longitude: 36.8950,
      type: PitchType.ASTRO_TURF,
      size: PitchSize.FIVE_A_SIDE,
      pricePerHour: 2200,
      status: PitchStatus.ACTIVE,
      isVerified: true,
      avgRating: 4.8,
      reviewCount: 67,
      operatingHours: {
        monday: { open: '07:00', close: '22:00' },
        tuesday: { open: '07:00', close: '22:00' },
        wednesday: { open: '07:00', close: '22:00' },
        thursday: { open: '07:00', close: '22:00' },
        friday: { open: '07:00', close: '23:00' },
        saturday: { open: '06:00', close: '23:00' },
        sunday: { open: '07:00', close: '22:00' },
      },
    },
  ];

  for (const pitchData of pitches) {
    const pitch = await prisma.pitch.create({ data: pitchData });

    // Add amenities
    await prisma.pitchAmenity.createMany({
      data: [
        { pitchId: pitch.id, name: 'Floodlights', icon: '💡' },
        { pitchId: pitch.id, name: 'Showers', icon: '🚿' },
        { pitchId: pitch.id, name: 'Parking', icon: '🅿️' },
        { pitchId: pitch.id, name: 'Changing Rooms', icon: '👕' },
      ],
    });

    // Add a placeholder image
    await prisma.pitchImage.create({
      data: {
        pitchId: pitch.id,
        url: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
        publicId: 'kapash/placeholder',
        isPrimary: true,
        order: 0,
      },
    });

    console.log(`  ✅ Created pitch: ${pitch.name}`);
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('\nTest credentials:');
  console.log('  Admin:       +254700000001');
  console.log('  Pitch Owner: +254711111111');
  console.log('  Customer:    +254722222222');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });