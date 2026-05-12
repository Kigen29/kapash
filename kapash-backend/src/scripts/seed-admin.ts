/**
 * Seed admin script — bootstraps the first ADMIN user in any environment.
 *
 * Usage:
 *   ts-node src/scripts/seed-admin.ts --phone +254700000000 --name "Admin Name" [--email admin@kapash.app]
 *
 * If a user with the phone already exists, their role is upgraded to ADMIN.
 */

import prisma from '../config/database';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const phone = arg('--phone');
  const name = arg('--name') || 'Admin';
  const email = arg('--email');

  if (!phone || !/^\+254\d{9}$/.test(phone)) {
    console.error('Usage: ts-node src/scripts/seed-admin.ts --phone +254XXXXXXXXX --name "Name" [--email a@b.com]');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { phone } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN', isVerified: true, phoneVerified: true, isActive: true, ...(email && { email }) },
    });
    console.log(`✓ Promoted existing user ${updated.name} (${updated.phone}) to ADMIN.`);
  } else {
    const created = await prisma.user.create({
      data: {
        phone, name, email,
        role: 'ADMIN', isVerified: true, phoneVerified: true, isActive: true,
      },
    });
    console.log(`✓ Created admin user ${created.name} (${created.phone}). Login via phone OTP.`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('seed-admin failed:', err);
  process.exit(1);
});
