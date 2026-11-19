import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { LAUNCH_BOUTIQUE_CATALOGUE, LAUNCH_COLLECTIONS } from '../src/lib/boutique/catalogue';

dotenv.config();

function createClient(): PrismaClient {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DIRECT_URL is required to seed Boutique.');
  }
  const adapter = new PrismaNeon({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter: adapter as any });
}

const prisma = createClient();

async function main() {
  console.log('Seeding Face Card Boutique launch catalogue (24 items) & collections...');

  const itemBySlug = new Map<string, string>();

  for (const entry of LAUNCH_BOUTIQUE_CATALOGUE) {
    const existing = await prisma.shopItem.findUnique({
      where: { slug: entry.slug },
      select: { id: true, currentVersionId: true },
    });

    const itemId = existing?.id ?? randomUUID();
    const versionId = existing?.currentVersionId ?? randomUUID();

    await prisma.shopItem.upsert({
      where: { slug: entry.slug },
      update: {
        sku: entry.sku,
        name: entry.name,
        description: entry.description,
        kind: entry.kind,
        category: entry.category,
        rarity: entry.rarity,
        status: entry.status,
        active: entry.status === 'PUBLISHED',
        price: entry.price,
        minTier: entry.minTier,
        maxOwned: entry.maxOwned,
        isGiftable: entry.isGiftable,
        slot: entry.slot ?? null,
        effectKind: entry.effectKind,
        effectConfig: entry.effectConfig as object,
        currentVersionId: versionId,
      },
      create: {
        id: itemId,
        sku: entry.sku,
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        kind: entry.kind,
        category: entry.category,
        rarity: entry.rarity,
        status: entry.status,
        active: entry.status === 'PUBLISHED',
        price: entry.price,
        minTier: entry.minTier,
        maxOwned: entry.maxOwned,
        isGiftable: entry.isGiftable,
        slot: entry.slot ?? null,
        effectKind: entry.effectKind,
        effectConfig: entry.effectConfig as object,
        currentVersionId: versionId,
      },
    });

    await prisma.shopItemVersion.upsert({
      where: { itemId_version: { itemId, version: 1 } },
      update: {
        name: entry.name,
        description: entry.description,
        rarity: entry.rarity,
        pricePoints: entry.price,
        maxOwned: entry.maxOwned,
        effectKind: entry.effectKind,
        effectConfig: entry.effectConfig as object,
      },
      create: {
        id: versionId,
        itemId,
        version: 1,
        name: entry.name,
        description: entry.description,
        rarity: entry.rarity,
        pricePoints: entry.price,
        maxOwned: entry.maxOwned,
        effectKind: entry.effectKind,
        effectConfig: entry.effectConfig as object,
      },
    });

    itemBySlug.set(entry.slug, itemId);
  }

  for (const col of LAUNCH_COLLECTIONS) {
    const collection = await prisma.shopCollection.upsert({
      where: { slug: col.slug },
      update: { name: col.name, description: col.description, status: 'PUBLISHED' },
      create: { slug: col.slug, name: col.name, description: col.description, status: 'PUBLISHED' },
    });

    for (const slug of col.itemSlugs) {
      const itemId = itemBySlug.get(slug);
      if (!itemId) continue;
      await prisma.shopCollectionItem.upsert({
        where: { collectionId_itemId: { collectionId: collection.id, itemId } },
        update: {},
        create: { collectionId: collection.id, itemId, required: true },
      });
    }
  }

  console.log(`Seeded ${LAUNCH_BOUTIQUE_CATALOGUE.length} Boutique items and ${LAUNCH_COLLECTIONS.length} collections.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
