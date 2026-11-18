import { db } from '@/lib/db';
import { SkinType } from '@prisma/client';

export interface RecommendedProductItem {
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  ritualStep: string;
  minPriceMinor: string;
  currency: string;
  score: number;
  reasons: string[];
}

/**
 * Deterministic, explainable skincare recommendation engine.
 * Driven strictly by voluntary SkinProfile + product metadata (never by entertainment Scan scores).
 */
export async function generateSkinRecommendations(userId: string): Promise<{
  hasProfile: boolean;
  recommendations: RecommendedProductItem[];
}> {
  const profile = await db.skinProfile.findUnique({
    where: { userId },
    include: {
      concerns: { include: { concern: true } },
      sensitivities: true,
    },
  });

  if (!profile) {
    return { hasProfile: false, recommendations: [] };
  }

  const concernIds = new Set(profile.concerns.map((c) => c.concernId));
  const sensitivityLabels = profile.sensitivities.map((s) => s.label.toLowerCase());

  const products = await db.atelierProduct.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      brand: { select: { name: true } },
      variants: {
        where: { isActive: true },
        orderBy: { priceMinor: 'asc' },
        take: 1,
      },
      concerns: { include: { concern: true } },
      skinTypes: true,
      ingredients: { include: { ingredient: true } },
    },
  });

  const scored: RecommendedProductItem[] = [];

  for (const p of products) {
    const firstVariant = p.variants[0];
    if (!firstVariant) continue;

    // Exclude products containing any user-reported sensitivity ingredient
    const hasConflict = p.ingredients.some((pi) => {
      const ingName = pi.ingredient.name.toLowerCase();
      const inci = (pi.ingredient.inciName || '').toLowerCase();
      return sensitivityLabels.some((s) => ingName.includes(s) || (inci && inci.includes(s)));
    });
    if (hasConflict) continue;

    // Respect optional max budget
    if (profile.budgetMaxMinor && firstVariant.priceMinor > profile.budgetMaxMinor) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    // 1. Skin type match
    const matchesSkinType = p.skinTypes.some((st) => st.skinType === profile.skinType);
    if (matchesSkinType) {
      score += 30;
      reasons.push(`Formulated for ${profile.skinType.toLowerCase()} skin`);
    } else if (profile.skinType === SkinType.UNSURE) {
      score += 10;
    }

    // 2. Concern matches
    for (const pc of p.concerns) {
      if (concernIds.has(pc.concernId)) {
        score += 25 * pc.strength;
        reasons.push(`Targets ${pc.concern.name.toLowerCase()}`);
      }
    }

    // 3. Sensitivity caution: penalize potential irritants for frequent sensitivity
    if (profile.sensitivityLevel === 'FREQUENT') {
      const hasIrritant = p.ingredients.some((pi) => pi.ingredient.isPotentialIrritant);
      if (hasIrritant) score -= 20;
      else {
        score += 10;
        reasons.push('Gentle profile without common irritants');
      }
    }

    if (score > 0) {
      scored.push({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        brandName: p.brand.name,
        ritualStep: p.ritualStep,
        minPriceMinor: firstVariant.priceMinor.toString(),
        currency: firstVariant.currency,
        score,
        reasons: reasons.slice(0, 3),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return { hasProfile: true, recommendations: scored.slice(0, 12) };
}
