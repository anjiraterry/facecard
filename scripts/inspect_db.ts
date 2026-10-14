import 'dotenv/config';
import { db } from '../src/lib/db';

async function checkDb() {
  const cols = await db.$queryRawUnsafe<any[]>(`
    SELECT table_name::text, column_name::text, data_type::text, udt_name::text 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND (column_name = 'id' OR column_name LIKE '%Id')
    ORDER BY table_name, column_name;
  `);
  console.log('--- UUID COLUMNS (Count: ' + cols.length + ') ---');
  for (const c of cols) {
    console.log(`${c.table_name}.${c.column_name}: ${c.data_type} (${c.udt_name})`);
  }

  const fks = await db.$queryRawUnsafe<any[]>(`
    SELECT
      tc.table_name::text, 
      kcu.column_name::text, 
      ccu.table_name::text AS foreign_table,
      ccu.column_name::text AS foreign_column,
      rc.delete_rule::text
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `);
  console.log('\n--- FOREIGN KEY CONSTRAINTS (Count: ' + fks.length + ') ---');
  for (const f of fks) {
    console.log(`${f.table_name}.${f.column_name} -> ${f.foreign_table}.${f.foreign_column} [ON DELETE ${f.delete_rule}]`);
  }

  // Check constraints omitted for brevity

  const rls = await db.$queryRawUnsafe<any[]>(`
    SELECT tablename::text, rowsecurity::boolean FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `);
  console.log('\n--- ROW LEVEL SECURITY (RLS) ---');
  for (const r of rls) {
    console.log(`${r.tablename}: RLS enabled = ${r.rowsecurity}`);
  }

  // Check table row counts
  const userCount = await db.user.count();
  const shopItemCount = await db.shopItem.count();
  const cardCount = await db.card.count();
  const scanCount = await db.scan.count();
  const faceOffCount = await db.faceOff.count();
  console.log(`\n--- TABLE ROW COUNTS ---`);
  console.log(`Users: ${userCount}, ShopItems: ${shopItemCount}, Cards: ${cardCount}, Scans: ${scanCount}, FaceOffs: ${faceOffCount}`);
}

checkDb()
  .catch(err => {
    console.error('Error checking DB:', err);
  })
  .finally(() => {
    process.exit(0);
  });
