import { db } from '@/lib/db';

async function check() {
  const users: any = await db.$queryRawUnsafe('SELECT id::text, email, name FROM neon_auth.user');
  console.log('neon_auth.user rows:', users);
}

check().catch(console.error).finally(() => process.exit(0));
