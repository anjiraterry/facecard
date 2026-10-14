import { db } from '@/lib/db';

async function check() {
  const cols: any = await db.$queryRawUnsafe(
    "SELECT column_name::text, data_type::text FROM information_schema.columns WHERE table_schema = 'neon_auth' AND table_name = 'user'"
  );
  console.log('neon_auth.user columns:', cols);
}

check().catch(console.error).finally(() => process.exit(0));
