import { db } from '@/lib/db';

async function check() {
  const schemas: any = await db.$queryRawUnsafe('SELECT schema_name::text FROM information_schema.schemata');
  console.log('Schemas:', schemas.map((s: any) => s.schema_name));

  const tables: any = await db.$queryRawUnsafe(
    "SELECT table_schema::text, table_name::text FROM information_schema.tables WHERE table_schema::text NOT IN ('information_schema', 'pg_catalog')"
  );
  console.log('Tables:', tables);
}

check().catch(console.error).finally(() => process.exit(0));
