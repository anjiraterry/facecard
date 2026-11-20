import { db } from '@/lib/db';
import { SkinType } from '@prisma/client';
import { checkIngredientCompatibility, IngredientCompatibilityRule } from '@/lib/beauty-intelligence/ingredients';

export interface RecommendedProductItem {
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  ritualStep: string;
  minPriceMinor: string;
  currency: string;
  score: number;
  matchedGoal: string;
  relevantIngredients: string[];
  rationale: string;
  reasons: string[];
  confidence: number;
  limitations: string[];
  usageGuidance: string | null;
  precautions: string[];
  routinePlacement: 'AM' | 'PM' | 'AM & PM';
  available: boolean;
  isPromoted: boolean;
  alternatives: Array<{ productId: string; slug: string; name: string; minPriceMinor: string }>;
}

export interface RecommendationGenerationResult {
  hasProfile: boolean;
  ruleVersion: number;
  noPurchaseSuggested: boolean;
  noPurchaseReason: string | null;
  compatibilityWarnings: IngredientCompatibilityRule[];
  recommendations: RecommendedProductItem[];
}

function inferRoutinePlacement(ritualStep: string, ingredientSlugs: string[]): 'AM' | 'PM' | 'AM & PM' {
  const step = ritualStep.toUpperCase();
  if (step.includes('SPF') || step.includes('SUN') || ingredientSlugs.includes('vitamin-c')) {
    return 'AM';
  }
  if (ingredientSlugs.includes('retinol') || ingredientSlugs.includes('salicylic-acid')) {
    return 'PM';
  }
  return 'AM & PM';
}

/**
 * Deterministic, explainable skincare recommendation engine (V2.1).
 * Driven strictly by voluntary SkinProfile + verified product metadata.
 * Never uses entertainment Lethality Score or Harmony Index as an input.
 */
export async function generateSkinRecommendations(userId: string): Promise<RecommendationGenerationResult> {
  const profile = await db.skinProfile.findUnique({
    where: { userId },
    include: {
      concerns: { include: { concern: true } },
      sensitivities: true,
    },
  });

  if (!profile) {
    return {
      hasProfile: false,
      ruleVersion: 1,
      noPurchaseSuggested: false,
      noPurchaseReason: null,
      compatibilityWarnings: [],
      recommendations: [],
    };
  }

  const concernIds = new Set(profile.concerns.map((c) => c.concernId));
  const concernSlugs = profile.concerns.map((c) => c.concern.slug);
  const sensitivityLabels = profile.sensitivities.map((s) => s.label.toLowerCase());
  const restrictions = ((profile as { restrictions?: string[] }).restrictions ?? []).map((r) => r.toLowerCase());
  const existingProducts = ((profile as { existingProducts?: string[] }).existingProducts ?? []).map((p) =>
    p.toLowerCase()
  );
  const allExclusions = [...sensitivityLabels, ...restrictions];

  // Check if minimal routine is already covered by user's existing owned products
  const hasCleanser = existingProducts.some((p) => p.includes('cleans') || p.includes('wash'));
  const hasMoisturiser = existingProducts.some((p) => p.includes('moistur') || p.includes('cream'));
  const hasSpf = existingProducts.some((p) => p.includes('spf') || p.includes('sunscreen'));
  const routineAlreadyCoversMinimal =
    profile.routinePreference === 'MINIMAL' && hasCleanser && hasMoisturiser && hasSpf && concernSlugs.length === 0;

  if (routineAlreadyCoversMinimal) {
    return {
      hasProfile: true,
      ruleVersion: 1,
      noPurchaseSuggested: true,
      noPurchaseReason:
        'Your current routine already covers gentle cleansing, moisturising, and daily SPF for your stated goals. No new purchase is needed right now.',
      compatibilityWarnings: [],
      recommendations: [],
    };
  }

  const products = await db.atelierProduct.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      brand: { select: { name: true } },
      variants: {
        where: { isActive: true },
        orderBy: { priceMinor: 'asc' },
        include: { inventoryLevels: true },
      },
      concerns: { include: { concern: true } },
      skinTypes: true,
      ingredients: { include: { ingredient: true } },
    },
  });

  const scored: RecommendedProductItem[] = [];

  const isVariantAvailable = (v: {
    isActive?: boolean;
    inventoryLevels?: Array<{ onHand: number; reserved: number }>;
  }) => {
    if (!v.inventoryLevels || v.inventoryLevels.length === 0) return Boolean(v.isActive ?? true);
    return v.inventoryLevels.some((il) => il.onHand - il.reserved > 0);
  };

  for (const p of products) {
    const activeVariant = p.variants.find((v) => isVariantAvailable(v)) ?? p.variants[0];
    if (!activeVariant) continue;
    const available = p.variants.some((v) => isVariantAvailable(v));

    // 1. Exclude products containing any user-reported allergy, sensitivity, or restriction
    const hasConflict =
      p.ingredients.some((pi) => {
        const ingName = pi.ingredient.name.toLowerCase();
        const inci = (pi.ingredient.inciName || '').toLowerCase();
        const slug = pi.ingredient.slug.toLowerCase();
        return allExclusions.some((ex) => ingName.includes(ex) || slug.includes(ex) || (inci && inci.includes(ex)));
      }) ||
      (restrictions.includes('pregnancy') &&
        p.ingredients.some((pi) => pi.ingredient.slug === 'retinol'));

    if (hasConflict) continue;

    // 2. Respect optional max budget
    if (profile.budgetMaxMinor && activeVariant.priceMinor > profile.budgetMaxMinor) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];
    const matchedGoals: string[] = [];
    const limitations: string[] = [];
    const precautions: string[] = [];
    let confidence = 0.85;

    // Treat incomplete ingredient metadata as uncertainty rather than proof of suitability
    if (p.ingredients.length === 0) {
      confidence -= 0.3;
      limitations.push('Full ingredient breakdown is not yet listed; check the product label before use.');
    }

    const matchesSkinType = p.skinTypes.some((st) => st.skinType === profile.skinType);
    if (matchesSkinType) {
      score += 30;
      reasons.push(`Formulated for ${profile.skinType.toLowerCase()} skin`);
    } else if (profile.skinType === SkinType.UNSURE) {
      score += 10;
      confidence -= 0.08;
    }

    for (const pc of p.concerns) {
      if (concernIds.has(pc.concernId)) {
        score += 25 * pc.strength;
        matchedGoals.push(pc.concern.name);
        reasons.push(`Targets ${pc.concern.name.toLowerCase()}`);
      }
    }

    if (profile.sensitivityLevel === 'FREQUENT') {
      const hasIrritant = p.ingredients.some((pi) => pi.ingredient.isPotentialIrritant);
      if (hasIrritant) {
        score -= 25;
        precautions.push('Contains active ingredients that may feel strong on sensitive skin; patch test first.');
      } else if (p.ingredients.length > 0) {
        score += 12;
        reasons.push('Gentle profile without flagged common irritants');
      }
    }

    // Penalise out-of-stock items in suitability availability without hiding alternatives
    if (!available) {
      score -= 10;
      limitations.push('Currently out of stock; see available alternatives.');
    }

    if (score > 0) {
      const ingredientNames = p.ingredients.map((pi) => pi.ingredient.name);
      const ingredientSlugs = p.ingredients.map((pi) => pi.ingredient.slug);
      const placement = inferRoutinePlacement(p.ritualStep, ingredientSlugs);

      if (p.ingredients.some((pi) => pi.ingredient.isPotentialIrritant)) {
        precautions.push('Patch test on your jawline or inner forearm for 24 hours before full use.');
      }

      scored.push({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        brandName: p.brand.name,
        ritualStep: p.ritualStep,
        minPriceMinor: activeVariant.priceMinor.toString(),
        currency: activeVariant.currency,
        score,
        matchedGoal: matchedGoals[0] || `${profile.skinType.toLowerCase()} skin care`,
        relevantIngredients: ingredientNames,
        rationale: reasons.slice(0, 3).join('. ') + '.',
        reasons: reasons.slice(0, 3),
        confidence: Number(Math.max(0.35, Math.min(0.95, confidence)).toFixed(2)),
        limitations,
        usageGuidance:
          placement === 'PM'
            ? 'Introduce gradually in your evening routine and pair with daily AM SPF.'
            : placement === 'AM'
            ? 'Apply in your morning routine.'
            : 'Suitable for morning or evening use as tolerated.',
        precautions,
        routinePlacement: placement,
        available,
        isPromoted: false, // Merchandising is never allowed to override suitability ranking
        alternatives: [],
      });
    }
  }

  // Deterministic suitability ranking (no margin or promotion boosting)
  scored.sort((a, b) => b.score - a.score || Number(a.minPriceMinor) - Number(b.minPriceMinor));
  const top = scored.slice(0, 12);

  // Populate alternatives in the same ritualStep
  for (const item of top) {
    item.alternatives = scored
      .filter((other) => other.productId !== item.productId && other.ritualStep === item.ritualStep && other.available)
      .slice(0, 2)
      .map((alt) => ({
        productId: alt.productId,
        slug: alt.slug,
        name: alt.name,
        minPriceMinor: alt.minPriceMinor,
      }));
  }

  const allIngredientSlugs = products
    .filter((p) => top.slice(0, 4).some((t) => t.productId === p.id))
    .flatMap((p) => p.ingredients.map((pi) => pi.ingredient.slug));
  const compatibilityWarnings = checkIngredientCompatibility(allIngredientSlugs);

  const noPurchaseSuggested = top.length === 0;
  const noPurchaseReason = noPurchaseSuggested
    ? 'No catalog products matched your allergies, restrictions, and budget with sufficient confidence. Maintain a gentle minimal routine or consult a dermatologist.'
    : null;

  // Best-effort provenance persistence (safe if DB tables aren't migrated in local preview/unit tests)
  try {
    const sessCreate = (db as unknown as {
      recommendationSession?: { create: (args: unknown) => Promise<unknown> };
    }).recommendationSession;
    if (typeof sessCreate?.create === 'function') {
      await sessCreate.create({
        data: {
          userId,
          skinType: profile.skinType,
          concernSlugs,
          sensitivities: sensitivityLabels,
          budgetMaxMinor: profile.budgetMaxMinor ?? null,
          noPurchaseSuggested,
          noPurchaseReason,
          products: {
            create: top.slice(0, 6).map((item, idx) => ({
              productId: item.productId,
              matchedGoal: item.matchedGoal,
              relevantIngredients: item.relevantIngredients,
              rationale: item.rationale,
              confidence: item.confidence,
              limitations: item.limitations,
              usageGuidance: item.usageGuidance,
              precautions: item.precautions,
              routinePlacement: item.routinePlacement,
              isPromoted: item.isPromoted,
              rankOrder: idx + 1,
            })),
          },
        },
      });
    }
  } catch {
    // Do not block recommendation response if provenance table is unavailable
  }

  return {
    hasProfile: true,
    ruleVersion: 1,
    noPurchaseSuggested,
    noPurchaseReason,
    compatibilityWarnings,
    recommendations: top,
  };
}
