import { db } from '@/lib/db';

async function main() {
  console.log('Truncating public tables before UUID column type migration...');
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "public"."User", 
      "public"."ShopItem", 
      "public"."FaceOff", 
      "public"."Scan", 
      "public"."PointsLedger", 
      "public"."Streak", 
      "public"."Card", 
      "public"."UserItem" 
    CASCADE;
  `);
  console.log('Public tables truncated cleanly.');
}

main().catch(console.error).finally(() => process.exit(0));
