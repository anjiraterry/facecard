import { PrismaClient, ProductStatus, RitualStepKind, SkinType } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();

function createClient(): PrismaClient {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DIRECT_URL is required to seed Atelier.');
  }
  const adapter = new PrismaNeon({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter: adapter as any });
}

const prisma = createClient();

async function main() {
  console.log('Seeding Atelier catalogue, inventory, and delivery zones...');

  // 1. Default Inventory Location
  const location = await prisma.inventoryLocation.upsert({
    where: { code: 'LAGOS_MAIN' },
    update: { name: 'Lagos Flagship Hub', isDefault: true, active: true },
    create: {
      code: 'LAGOS_MAIN',
      name: 'Lagos Flagship Hub',
      city: 'Lagos',
      state: 'Lagos',
      country: 'NG',
      isDefault: true,
      active: true,
    },
  });

  // 2. Brands
  const brandAtelier = await prisma.brand.upsert({
    where: { slug: 'atelier-botanicals' },
    update: { name: 'Atelier Botanicals', active: true },
    create: {
      slug: 'atelier-botanicals',
      name: 'Atelier Botanicals',
      description: 'Restrained, barrier-first formulations calibrated for humid and tropical climates.',
      country: 'Nigeria',
    },
  });

  const brandLagos = await prisma.brand.upsert({
    where: { slug: 'lagos-glow-lab' },
    update: { name: 'Lagos Glow Lab', active: true },
    create: {
      slug: 'lagos-glow-lab',
      name: 'Lagos Glow Lab',
      description: 'Dermatologist-informed actives designed for melanin-rich skin.',
      country: 'Nigeria',
    },
  });

  // 3. Categories
  const catData = [
    { slug: 'cleansers', name: 'Cleansers', sortOrder: 1 },
    { slug: 'serums', name: 'Serums', sortOrder: 2 },
    { slug: 'moisturizers', name: 'Moisturisers', sortOrder: 3 },
    { slug: 'sun-care', name: 'SPF', sortOrder: 4 },
    { slug: 'ritual-sets', name: 'Ritual Sets', sortOrder: 5 },
  ];
  const categories: Record<string, string> = {};
  for (const c of catData) {
    const row = await prisma.productCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: c,
    });
    categories[c.slug] = row.id;
  }

  // 4. Skin Concerns
  const concernData = [
    { slug: 'hydration', name: 'More hydration', description: 'Restore plumpness and water retention.' },
    { slug: 'even-tone', name: 'Even-looking tone', description: 'Visibly brighten dark spots and post-blemish marks.' },
    { slug: 'breakouts', name: 'Fewer breakouts', description: 'Keep pores clear without stripping.' },
    { slug: 'barrier-repair', name: 'Barrier repair', description: 'Calm sensitivity and strengthen lipid barrier.' },
    { slug: 'sun-protection', name: 'Daily sun protection', description: 'No-white-cast broad-spectrum UV defense.' },
    { slug: 'healthy-routine', name: 'A healthier routine', description: 'Consistent, balanced daily essentials.' },
  ];
  const concerns: Record<string, string> = {};
  for (const sc of concernData) {
    const row = await prisma.skinConcern.upsert({
      where: { slug: sc.slug },
      update: { name: sc.name, description: sc.description },
      create: sc,
    });
    concerns[sc.slug] = row.id;
  }

  // 5. Ingredients
  const ingData = [
    { slug: 'niacinamide', name: 'Niacinamide', inciName: 'Niacinamide', isPotentialIrritant: false },
    { slug: 'hyaluronic-acid', name: 'Hyaluronic Acid', inciName: 'Sodium Hyaluronate', isPotentialIrritant: false },
    { slug: 'ceramides', name: 'Ceramide NP', inciName: 'Ceramide NP', isPotentialIrritant: false },
    { slug: 'azelaic-acid', name: 'Azelaic Acid', inciName: 'Azelaic Acid', isPotentialIrritant: true },
    { slug: 'centella', name: 'Centella Asiatica', inciName: 'Centella Asiatica Extract', isPotentialIrritant: false },
    { slug: 'uv-filters', name: 'Tinosorb S & M', inciName: 'Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine', isPotentialIrritant: false },
  ];
  const ingredients: Record<string, string> = {};
  for (const ing of ingData) {
    const row = await prisma.ingredient.upsert({
      where: { slug: ing.slug },
      update: { name: ing.name, inciName: ing.inciName },
      create: ing,
    });
    ingredients[ing.slug] = row.id;
  }

  // 6. Products + Variants + Inventory
  const products = [
    {
      slug: 'velvet-amino-cleanser',
      brandId: brandAtelier.id,
      categoryId: categories['cleansers'],
      name: 'Velvet Amino Gel Cleanser',
      subtitle: 'pH-balanced non-stripping wash with Centella and oat amino acids.',
      description: 'Dissolves daily SPF, excess sebum, and urban buildup while leaving the moisture barrier calm and supple.',
      benefits: ['Zero tight feeling', 'Fragrance-free', 'Suitable for daily AM/PM use'],
      howToUse: 'Massage 1-2 pumps onto damp skin for 30 seconds, then rinse with lukewarm water.',
      ritualStep: RitualStepKind.CLEANSE,
      featured: true,
      sku: 'ATL-CLN-150',
      variantName: '150 ml Bottle',
      sizeLabel: '150 ml',
      priceMinor: BigInt(1450000), // NGN 14,500
      concernSlugs: ['hydration', 'barrier-repair', 'healthy-routine'],
      ingredientSlugs: ['centella', 'hyaluronic-acid'],
      skinTypes: [SkinType.NORMAL, SkinType.DRY, SkinType.COMBINATION, SkinType.OILY],
    },
    {
      slug: 'radiance-niacinamide-serum',
      brandId: brandLagos.id,
      categoryId: categories['serums'],
      name: 'Radiance 5% Niacinamide Drops',
      subtitle: 'Balanced brightening serum formulated for melanin-rich complexions.',
      description: 'Targets uneven tone and post-blemish marks at an optimal 5% concentration that avoids irritation.',
      benefits: ['Visibly evens tone', 'Refines pore appearance', 'Lightweight water-gel texture'],
      howToUse: 'Apply 3 drops to clean, slightly damp skin morning and evening before moisturiser.',
      ritualStep: RitualStepKind.TREAT,
      featured: true,
      sku: 'LGL-SRM-030',
      variantName: '30 ml Dropper',
      sizeLabel: '30 ml',
      priceMinor: BigInt(1850000), // NGN 18,500
      concernSlugs: ['even-tone', 'breakouts', 'healthy-routine'],
      ingredientSlugs: ['niacinamide', 'hyaluronic-acid'],
      skinTypes: [SkinType.NORMAL, SkinType.OILY, SkinType.COMBINATION],
    },
    {
      slug: 'barrier-ceramide-cream',
      brandId: brandAtelier.id,
      categoryId: categories['moisturizers'],
      name: 'Barrier Repair Ceramide Cream',
      subtitle: 'Rich yet breathable lipid-replenishing moisturiser.',
      description: 'Skin-identical ceramides and squalane lock in hydration overnight without feeling heavy in humid weather.',
      benefits: ['Restores compromised barrier', 'Non-comedogenic', 'Soothing matte-satin finish'],
      howToUse: 'Press a pea-sized amount over face and neck as your final evening step.',
      ritualStep: RitualStepKind.HYDRATE,
      featured: true,
      sku: 'ATL-MST-050',
      variantName: '50 ml Jar',
      sizeLabel: '50 ml',
      priceMinor: BigInt(2200000), // NGN 22,000
      concernSlugs: ['hydration', 'barrier-repair', 'healthy-routine'],
      ingredientSlugs: ['ceramides', 'centella'],
      skinTypes: [SkinType.DRY, SkinType.NORMAL, SkinType.COMBINATION],
    },
    {
      slug: 'invisible-dew-spf50',
      brandId: brandLagos.id,
      categoryId: categories['sun-care'],
      name: 'Invisible Dew SPF 50+',
      subtitle: 'Zero white-cast broad-spectrum fluid with hybrid UV filters.',
      description: 'Dries completely transparent on every skin tone with a soft natural sheen and no eye sting.',
      benefits: ['Zero white cast', 'SPF 50+ PA++++', 'Sweat & humidity resistant'],
      howToUse: 'Apply two finger-lengths generously to face and neck 15 minutes before sun exposure.',
      ritualStep: RitualStepKind.PROTECT,
      featured: true,
      sku: 'LGL-SPF-050',
      variantName: '50 ml Tube',
      sizeLabel: '50 ml',
      priceMinor: BigInt(1900000), // NGN 19,000
      concernSlugs: ['sun-protection', 'even-tone', 'healthy-routine'],
      ingredientSlugs: ['uv-filters', 'niacinamide'],
      skinTypes: [SkinType.NORMAL, SkinType.DRY, SkinType.OILY, SkinType.COMBINATION],
    },
    {
      slug: 'calm-azelaic-emulsion',
      brandId: brandLagos.id,
      categoryId: categories['serums'],
      name: 'Calm 10% Azelaic Emulsion',
      subtitle: 'Targeted clarifying treatment for stubborn blemishes and dark marks.',
      description: 'Micronised 10% azelaic acid paired with Centella calms active congestion and fades hyperpigmentation.',
      benefits: ['Calms redness & bumps', 'Fades dark spots', 'Gentle leave-on emulsion'],
      howToUse: 'Use 2-3 evenings per week after cleansing; follow with Barrier Repair Ceramide Cream.',
      ritualStep: RitualStepKind.TREAT,
      featured: false,
      sku: 'LGL-AZL-030',
      variantName: '30 ml Pump',
      sizeLabel: '30 ml',
      priceMinor: BigInt(2150000), // NGN 21,500
      concernSlugs: ['breakouts', 'even-tone'],
      ingredientSlugs: ['azelaic-acid', 'centella'],
      skinTypes: [SkinType.OILY, SkinType.COMBINATION, SkinType.NORMAL],
    },
    {
      slug: 'morning-clarity-ritual-set',
      brandId: brandAtelier.id,
      categoryId: categories['ritual-sets'],
      name: 'Morning Clarity 3-Step Ritual',
      subtitle: 'Cleanser, Niacinamide Drops, and Invisible Dew SPF 50+ curated together.',
      description: 'A complete AM regimen designed to cleanse gently, brighten tone, and protect against UV-induced dark spots.',
      benefits: ['Save ₦3,000 vs individual', 'Complete 3-step AM routine', 'Gift-ready Soft Luxury box'],
      howToUse: 'Cleanse -> Apply 3 drops Radiance Serum -> Seal with Invisible Dew SPF 50+.',
      ritualStep: RitualStepKind.CLEANSE,
      featured: true,
      sku: 'ATL-SET-AM3',
      variantName: '3-Piece Full Size Set',
      sizeLabel: 'Full Set',
      priceMinor: BigInt(4900000), // NGN 49,000
      concernSlugs: ['hydration', 'even-tone', 'sun-protection', 'healthy-routine'],
      ingredientSlugs: ['niacinamide', 'uv-filters', 'centella'],
      skinTypes: [SkinType.NORMAL, SkinType.DRY, SkinType.OILY, SkinType.COMBINATION],
    },
  ];

  const PRODUCT_IMAGE_URLS: Record<string, string> = {
    'velvet-amino-cleanser':
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    'radiance-niacinamide-serum':
      'https://images.unsplash.com/photo-1782086816100-017c99c45109?auto=format&fit=crop&w=800&q=80',
    'barrier-ceramide-cream':
      'https://images.unsplash.com/photo-1691707895857-23090885ab4d?auto=format&fit=crop&w=800&q=80',
    'invisible-dew-spf50':
      'https://images.unsplash.com/photo-1623676714504-edd78728155e?auto=format&fit=crop&w=800&q=80',
    'calm-azelaic-emulsion':
      'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=80',
    'morning-clarity-ritual-set':
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
  };

  for (const p of products) {
    const product = await prisma.atelierProduct.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        benefits: p.benefits,
        howToUse: p.howToUse,
        ritualStep: p.ritualStep,
        status: ProductStatus.PUBLISHED,
        featured: p.featured,
        publishedAt: new Date(),
      },
      create: {
        slug: p.slug,
        brandId: p.brandId,
        categoryId: p.categoryId,
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        benefits: p.benefits,
        howToUse: p.howToUse,
        ritualStep: p.ritualStep,
        status: ProductStatus.PUBLISHED,
        featured: p.featured,
        publishedAt: new Date(),
      },
    });

    await prisma.productImage.deleteMany({
      where: { productId: product.id },
    });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        objectKey: PRODUCT_IMAGE_URLS[p.slug] || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
        altText: p.name,
        sortOrder: 0,
        isPrimary: true,
      },
    });

    const variant = await prisma.productVariant.upsert({
      where: { sku: p.sku },
      update: {
        name: p.variantName,
        sizeLabel: p.sizeLabel,
        priceMinor: p.priceMinor,
        isActive: true,
      },
      create: {
        productId: product.id,
        sku: p.sku,
        name: p.variantName,
        sizeLabel: p.sizeLabel,
        priceMinor: p.priceMinor,
        currency: 'NGN',
        isActive: true,
      },
    });

    await prisma.inventoryLevel.upsert({
      where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
      update: { onHand: 25 },
      create: {
        variantId: variant.id,
        locationId: location.id,
        onHand: 25,
        reserved: 0,
        reorderLevel: 5,
      },
    });

    for (const cSlug of p.concernSlugs) {
      await prisma.productConcern.upsert({
        where: { productId_concernId: { productId: product.id, concernId: concerns[cSlug] } },
        update: {},
        create: { productId: product.id, concernId: concerns[cSlug], strength: 2 },
      });
    }

    for (const iSlug of p.ingredientSlugs) {
      await prisma.productIngredient.upsert({
        where: { productId_ingredientId: { productId: product.id, ingredientId: ingredients[iSlug] } },
        update: {},
        create: { productId: product.id, ingredientId: ingredients[iSlug], isKeyActive: true },
      });
    }

    for (const st of p.skinTypes) {
      await prisma.productSkinType.upsert({
        where: { productId_skinType: { productId: product.id, skinType: st } },
        update: {},
        create: { productId: product.id, skinType: st },
      });
    }
  }

  // 7. Delivery Zones & Shipping Rates
  const lagosZone = await prisma.deliveryZone.upsert({
    where: { code: 'LAGOS_METRO' },
    update: { states: ['Lagos'], active: true },
    create: { code: 'LAGOS_METRO', name: 'Lagos Metro Express', states: ['Lagos'], active: true },
  });
  const existingLagosRate = await prisma.shippingRate.findFirst({ where: { zoneId: lagosZone.id } });
  if (!existingLagosRate) {
    await prisma.shippingRate.create({
      data: {
        zoneId: lagosZone.id,
        name: 'Same/Next-Day Lagos Courier',
        amountMinor: BigInt(200000), // NGN 2,000
        currency: 'NGN',
        estimatedDays: '1-2 business days',
      },
    });
  }

  const abujaZone = await prisma.deliveryZone.upsert({
    where: { code: 'ABUJA_SW' },
    update: { states: ['Abuja', 'FCT', 'Ogun', 'Oyo', 'Rivers'], active: true },
    create: { code: 'ABUJA_SW', name: 'Abuja & Major Cities', states: ['Abuja', 'FCT', 'Ogun', 'Oyo', 'Rivers'], active: true },
  });
  const existingAbujaRate = await prisma.shippingRate.findFirst({ where: { zoneId: abujaZone.id } });
  if (!existingAbujaRate) {
    await prisma.shippingRate.create({
      data: {
        zoneId: abujaZone.id,
        name: 'Express Inter-State Courier',
        amountMinor: BigInt(350000), // NGN 3,500
        currency: 'NGN',
        estimatedDays: '2-4 business days',
      },
    });
  }

  console.log('Atelier seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Atelier seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
