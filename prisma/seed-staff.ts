import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { DEFAULT_ROLE_DEFINITIONS } from '../src/lib/admin/permissions';
import { hashStaffPassword } from '../src/lib/admin/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const roleDef of DEFAULT_ROLE_DEFINITIONS) {
    await prisma.staffRole.upsert({
      where: { slug: roleDef.slug },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        permissions: roleDef.permissions,
        isSystem: true,
      },
      create: {
        slug: roleDef.slug,
        name: roleDef.name,
        description: roleDef.description,
        permissions: roleDef.permissions,
        isSystem: true,
      },
    });
  }

  const superAdminRole = await prisma.staffRole.findUniqueOrThrow({
    where: { slug: 'super_admin' },
  });

  const adminEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@facecard.ng').toLowerCase();
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'FaceCardAdmin!2026';

  const existing = await prisma.staffUser.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.staffUser.create({
      data: {
        email: adminEmail,
        fullName: 'Face Card Super Admin',
        passwordHash: hashStaffPassword(adminPassword),
        status: 'ACTIVE',
        roleId: superAdminRole.id,
      },
    });
    console.log(`Seeded Super Admin staff user: ${adminEmail}`);
  } else {
    console.log(`Super Admin staff user already exists: ${adminEmail}`);
  }
}

main()
  .catch((err) => {
    console.error('Staff seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
