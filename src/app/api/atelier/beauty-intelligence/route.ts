import { NextRequest } from 'next/server';
import {
  CONCERN_INGREDIENT_MAPPINGS,
  INGREDIENT_COMPATIBILITIES,
  INGREDIENT_KB_VERSION,
  INGREDIENT_LIBRARY,
  ROUTINE_TEMPLATES,
  checkIngredientCompatibility,
} from '@/lib/beauty-intelligence/ingredients';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  return jsonResponse({
    success: true,
    version: INGREDIENT_KB_VERSION,
    ingredients: INGREDIENT_LIBRARY,
    compatibilities: INGREDIENT_COMPATIBILITIES,
    concernMappings: CONCERN_INGREDIENT_MAPPINGS,
    routineTemplates: ROUTINE_TEMPLATES,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slugs = Array.isArray(body.ingredientSlugs)
    ? body.ingredientSlugs.filter((s: unknown): s is string => typeof s === 'string')
    : [];

  const warnings = checkIngredientCompatibility(slugs);
  return jsonResponse({
    success: true,
    ingredientSlugs: slugs,
    compatible: warnings.length === 0,
    warnings,
  });
}
