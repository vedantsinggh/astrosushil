import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedRbac } from '../src/modules/admin/rbac/rbac.seed';
import { consultationTypesService } from '../src/modules/consultations/consultation-types.service';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding administrative users...');

  const passwordHash = await bcrypt.hash('AdminPass123!', 10);

  const defaultAdmins = [
    {
      email: 'admin@astrosushil.com',
      fullName: 'Super Administrator',
      role: 'SUPER_ADMIN' as any,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      email: 'operator@astrosushil.com',
      fullName: 'Operations Administrator',
      role: 'ADMIN' as any,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      email: 'support@astrosushil.com',
      fullName: 'Customer Support Representative',
      role: 'SUPPORT' as any,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  ];

  for (const adminData of defaultAdmins) {
    const existing = await prisma.user.findUnique({
      where: { email: adminData.email },
    });

    if (!existing) {
      await prisma.user.create({
        data: adminData,
      });
      console.log(`Created admin account: ${adminData.email} (${adminData.role})`);
    } else {
      await prisma.user.update({
        where: { email: adminData.email },
        data: { role: adminData.role },
      });
      console.log(`Updated admin account: ${adminData.email} (${adminData.role})`);
    }
  }

  // Staff roles: seeds the system roles and gives every existing admin a staff profile on the
  // role matching its User.role (docs/integration/modules/rbac.md).
  console.log('Seeding staff roles...');
  await seedRbac(prisma, { log: (message) => console.log(message) });

  // Consultation types: the tiers that were constants in the commerce catalogue, with the same
  // catalog ids and prices. Existing rows are never changed (docs/integration/modules/bookings.md).
  console.log('Seeding consultation types...');
  const createdTiers = await consultationTypesService.seedDefaults();
  console.log(`Consultation types created: ${createdTiers}`);

  console.log('Seeding complete!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
