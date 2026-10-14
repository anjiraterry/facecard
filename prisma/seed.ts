import { PrismaClient, Tier, ItemKind, Band, ScanSource, LedgerType, BalanceKind, FaceOffMode, FaceOffStatus } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();

function createClient(): PrismaClient {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DIRECT_URL is required to seed.');
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter: adapter as any });
}

const prisma = createClient();

export const SEED_SHOP_ITEMS = [
  {
    id: 'a0000001-0000-4000-a000-000000000001',
    slug: 'streak-freeze',
    name: 'Streak Freeze',
    kind: ItemKind.CONSUMABLE,
    price: 150,
    minTier: Tier.CLASSIC,
    description: 'Protects your daily streak if you miss a calendar day. Holds max 2.',
  },
  {
    id: 'a0000002-0000-4000-a000-000000000002',
    slug: 'title-lethal-weapon',
    name: 'Title: "Lethal Weapon"',
    kind: ItemKind.TITLE,
    price: 300,
    minTier: Tier.GOLD,
    description: 'Embossed typography title displayed prominently on your Gold Face Card.',
  },
  {
    id: 'a0000003-0000-4000-a000-000000000003',
    slug: 'skin-lavender-holo',
    name: 'Lavender Hologram',
    kind: ItemKind.SKIN,
    price: 500,
    minTier: Tier.PLATINUM,
    description: 'Iridescent lavender surface with specular chromatic shifting reflection.',
  },
  {
    id: 'a0000004-0000-4000-a000-000000000004',
    slug: 'skin-black-sheen',
    name: 'Specular Black Sheen',
    kind: ItemKind.SKIN,
    price: 1200,
    minTier: Tier.BLACK,
    description: 'Ultra-exclusive diagonal sheen beam across obsidian card finish.',
  },
  {
    id: 'a0000005-0000-4000-a000-000000000005',
    slug: 'frame-solar-flare',
    name: 'Solar Flare Foil',
    kind: ItemKind.FRAME,
    price: 350,
    minTier: Tier.GOLD,
    description: 'Luminescent edge foil rim glowing in warm golden peach hues.',
  },
  {
    id: 'a0000006-0000-4000-a000-000000000006',
    slug: 'boost-aura-2x',
    name: 'Double Points Surge',
    kind: ItemKind.CONSUMABLE,
    price: 250,
    minTier: Tier.CLASSIC,
    description: 'Doubles all aura rating points earned from your next 3 scans.',
  },
];

export const PRIMARY_USER_ID = '11111111-1111-4111-a111-111111111111';
export const ZAINAB_USER_ID = '22222222-2222-4222-a222-222222222222';
export const TAIWO_USER_ID = '33333333-3333-4333-a333-333333333333';
export const KOLA_USER_ID = '44444444-4444-4444-a444-444444444444';
export const EMMA_USER_ID = '55555555-5555-4555-a555-555555555555';

async function main() {
  console.log('Seeding Neon Postgres with native UUIDs and relational constraints...');

  // 1. Seed Shop Items (UUID IDs with unique slugs)
  for (const item of SEED_SHOP_ITEMS) {
    await prisma.shopItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }
  console.log(`Seeded ${SEED_SHOP_ITEMS.length} ShopItems with UUID primary keys.`);

  // 2. Seed Primary User (Chidinma Okon)
  await prisma.user.upsert({
    where: { id: PRIMARY_USER_ID },
    update: {
      email: 'chidinma.okon@example.com',
      displayName: 'Chidinma Okon',
      handle: 'chidinma',
      tier: Tier.GOLD,
      lifetimePoints: 2350,
      spendableBalance: 850,
    },
    create: {
      id: PRIMARY_USER_ID,
      email: 'chidinma.okon@example.com',
      displayName: 'Chidinma Okon',
      handle: 'chidinma',
      tier: Tier.GOLD,
      lifetimePoints: 2350,
      spendableBalance: 850,
      ageConfirmedAt: new Date(),
      consentAt: new Date(),
      consentVersion: '1.0-NDPA',
    },
  });

  // Streak (UUID, foreign key to User)
  await prisma.streak.upsert({
    where: { userId: PRIMARY_USER_ID },
    update: {
      currentCount: 7,
      longestCount: 14,
      lastScanDayKey: '2026-10-13',
      freezesHeld: 1,
    },
    create: {
      userId: PRIMARY_USER_ID,
      currentCount: 7,
      longestCount: 14,
      lastScanDayKey: '2026-10-13',
      freezesHeld: 1,
    },
  });

  // Card (UUID, foreign keys to User and ShopItem for equipped cosmetics)
  const titleItemId = 'a0000002-0000-4000-a000-000000000002';
  await prisma.card.upsert({
    where: { cardNumber: 'FC-8492-2026' },
    update: {
      equippedTitleId: titleItemId,
      equippedSkinId: null,
      equippedFrameId: null,
    },
    create: {
      userId: PRIMARY_USER_ID,
      cardNumber: 'FC-8492-2026',
      equippedTitleId: titleItemId,
      equippedSkinId: null,
      equippedFrameId: null,
    },
  });

  // User Items (Foreign keys to User and ShopItem)
  await prisma.userItem.upsert({
    where: { userId_itemId: { userId: PRIMARY_USER_ID, itemId: 'a0000001-0000-4000-a000-000000000001' } },
    update: { quantity: 1 },
    create: { userId: PRIMARY_USER_ID, itemId: 'a0000001-0000-4000-a000-000000000001', quantity: 1 },
  });

  await prisma.userItem.upsert({
    where: { userId_itemId: { userId: PRIMARY_USER_ID, itemId: titleItemId } },
    update: { quantity: 1 },
    create: { userId: PRIMARY_USER_ID, itemId: titleItemId, quantity: 1 },
  });

  // Scan (UUID, foreign key to User)
  const existingScans = await prisma.scan.count({ where: { userId: PRIMARY_USER_ID } });
  if (existingScans === 0) {
    await prisma.scan.create({
      data: {
        userId: PRIMARY_USER_ID,
        score: 84,
        band: Band.DANGEROUS,
        modelVersion: 'v1.2-neon',
        promptVersion: 'p2.0',
        scanIndexOfDay: 1,
        dayKey: '2026-10-13',
        source: ScanSource.SOLO,
        categoryScores: {
          photoCraft: 94,
          harmony: 88,
          skinClarity: 91,
          expression: 95,
          aura: 98,
          featureDefinition: 84,
          symmetry: 82,
        },
      },
    });
  }

  // Points Ledger (UUID, foreign key to User with RESTRICT delete behavior)
  const existingLedger = await prisma.pointsLedger.count({ where: { userId: PRIMARY_USER_ID } });
  if (existingLedger === 0) {
    await prisma.pointsLedger.createMany({
      data: [
        {
          userId: PRIMARY_USER_ID,
          type: LedgerType.SCAN,
          amount: 500,
          balanceKind: BalanceKind.SPENDABLE,
          refType: 'SCAN',
          idempotencyKey: `seed-scan-1-${PRIMARY_USER_ID}`,
        },
        {
          userId: PRIMARY_USER_ID,
          type: LedgerType.SCAN,
          amount: 500,
          balanceKind: BalanceKind.LIFETIME,
          refType: 'SCAN',
          idempotencyKey: `seed-scan-1-lifetime-${PRIMARY_USER_ID}`,
        },
        {
          userId: PRIMARY_USER_ID,
          type: LedgerType.SHOP_PURCHASE,
          amount: -300,
          balanceKind: BalanceKind.SPENDABLE,
          refType: 'SHOP_PURCHASE',
          refId: titleItemId,
          idempotencyKey: `seed-purchase-1-${PRIMARY_USER_ID}`,
        },
      ],
    });
  }

  // 3. Seed Friends/Contenders with UUIDs
  const friends = [
    {
      id: ZAINAB_USER_ID,
      email: 'zainab@example.com',
      displayName: 'Zainab Danjuma',
      handle: 'zainab',
      tier: Tier.BLACK,
      lifetimePoints: 9200,
      spendableBalance: 200,
      streakCount: 45,
    },
    {
      id: TAIWO_USER_ID,
      email: 'taiwo@example.com',
      displayName: 'Taiwo Bello',
      handle: 'taiwo',
      tier: Tier.PLATINUM,
      lifetimePoints: 4800,
      spendableBalance: 600,
      streakCount: 18,
    },
    {
      id: KOLA_USER_ID,
      email: 'kola@example.com',
      displayName: 'Kolawole Ade',
      handle: 'kola_ade',
      tier: Tier.GOLD,
      lifetimePoints: 2100,
      spendableBalance: 350,
      streakCount: 12,
    },
    {
      id: EMMA_USER_ID,
      email: 'emma@example.com',
      displayName: 'Emma Okafor',
      handle: 'emma',
      tier: Tier.CLASSIC,
      lifetimePoints: 750,
      spendableBalance: 150,
      streakCount: 5,
    },
  ];

  for (const f of friends) {
    await prisma.user.upsert({
      where: { id: f.id },
      update: {
        email: f.email,
        displayName: f.displayName,
        handle: f.handle,
        tier: f.tier,
        lifetimePoints: f.lifetimePoints,
        spendableBalance: f.spendableBalance,
      },
      create: {
        id: f.id,
        email: f.email,
        displayName: f.displayName,
        handle: f.handle,
        tier: f.tier,
        lifetimePoints: f.lifetimePoints,
        spendableBalance: f.spendableBalance,
        ageConfirmedAt: new Date(),
        consentAt: new Date(),
        consentVersion: '1.0-NDPA',
      },
    });

    await prisma.streak.upsert({
      where: { userId: f.id },
      update: { currentCount: f.streakCount, longestCount: f.streakCount, lastScanDayKey: '2026-10-13' },
      create: { userId: f.id, currentCount: f.streakCount, longestCount: f.streakCount, lastScanDayKey: '2026-10-13' },
    });
  }

  // 4. Seed Arena FaceOffs (UUID IDs and UUID foreign keys)
  const existingFaceOffs = await prisma.faceOff.count();
  if (existingFaceOffs === 0) {
    await prisma.faceOff.create({
      data: {
        challengerId: ZAINAB_USER_ID,
        opponentId: PRIMARY_USER_ID,
        inviteCode: 'ZAINAB96',
        mode: FaceOffMode.STAKED,
        stake: 200,
        status: FaceOffStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await prisma.faceOff.create({
      data: {
        challengerId: TAIWO_USER_ID,
        opponentId: null,
        inviteCode: 'TAIWO89',
        mode: FaceOffMode.FRIENDLY,
        stake: 0,
        status: FaceOffStatus.WAITING,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    await prisma.faceOff.create({
      data: {
        challengerId: KOLA_USER_ID,
        opponentId: null,
        inviteCode: 'KOLA82',
        mode: FaceOffMode.STAKED,
        stake: 100,
        status: FaceOffStatus.WAITING,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    });
  }

  console.log('Seeded database with native UUIDs and full foreign key constraints successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
