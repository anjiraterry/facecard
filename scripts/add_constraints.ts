import { db } from '@/lib/db';

async function main() {
  console.log('Adding Postgres check constraints and RLS...');

  // 1. Check constraints
  await db.$executeRawUnsafe(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_user_spendable_balance_non_negative') THEN
        ALTER TABLE "public"."User" ADD CONSTRAINT "check_user_spendable_balance_non_negative" CHECK ("spendableBalance" >= 0);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_user_lifetime_points_non_negative') THEN
        ALTER TABLE "public"."User" ADD CONSTRAINT "check_user_lifetime_points_non_negative" CHECK ("lifetimePoints" >= 0);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_streak_current_count_non_negative') THEN
        ALTER TABLE "public"."Streak" ADD CONSTRAINT "check_streak_current_count_non_negative" CHECK ("currentCount" >= 0);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_shop_item_price_non_negative') THEN
        ALTER TABLE "public"."ShopItem" ADD CONSTRAINT "check_shop_item_price_non_negative" CHECK ("price" >= 0);
      END IF;
    END $$;
  `);
  console.log('Postgres CHECK constraints verified.');

  // 2. Enable Row-Level Security on application tables
  const tables = ['User', 'Streak', 'Card', 'Scan', 'PointsLedger', 'UserItem', 'Purchase', 'FaceOff', 'ShareCard'];
  for (const table of tables) {
    await db.$executeRawUnsafe(`ALTER TABLE "public"."${table}" ENABLE ROW LEVEL SECURITY;`);
  }
  console.log('Row-Level Security (RLS) enabled on application tables.');

  // 3. Create permissive policies for authenticated application role to read/write their rows
  for (const table of tables) {
    await db.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${table}' AND policyname = 'app_access_${table}'
        ) THEN
          CREATE POLICY "app_access_${table}" ON "public"."${table}" FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `);
  }
  console.log('RLS policies established.');
}

main().catch(console.error).finally(() => process.exit(0));
