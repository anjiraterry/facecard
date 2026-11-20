import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission, recordStaffAuditLog, StaffAuthError } from '@/lib/admin/auth';
import { getClientIp } from '@/lib/auth/rateLimit';
import {
  DEFAULT_LETHALITY_WEIGHTS,
  EXPERIMENTAL_FACTORS_ENABLED_IN_PROD,
  HARMONY_V2_1_EXPERIMENTAL_WEIGHTS,
  HARMONY_V2_1_RUBRIC_VERSION,
} from '@/lib/rating/lethalityEngine';
import { evaluateSkinObservations, SKIN_APPEARANCE_VERSION } from '@/lib/vision/skinAppearanceEngine';
import {
  CONCERN_INGREDIENT_MAPPINGS,
  INGREDIENT_COMPATIBILITIES,
  INGREDIENT_KB_VERSION,
  INGREDIENT_LIBRARY,
  ROUTINE_TEMPLATES,
  checkIngredientCompatibility,
} from '@/lib/beauty-intelligence/ingredients';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('economy.read');

    const [ruleVersions, interactions, totalScans, totalSkinProfiles, totalRoutines] = await Promise.all([
      db.recommendationRuleVersion.findMany({ orderBy: { version: 'desc' }, take: 20 }).catch(() => []),
      db.recommendationInteraction
        .groupBy({ by: ['eventType'], _count: { eventType: true } })
        .catch(() => []),
      db.scan.count().catch(() => 0),
      db.skinProfile.count().catch(() => 0),
      db.skincareRoutine.count({ where: { isActive: true } }).catch(() => 0),
    ]);

    const observationRegistry = evaluateSkinObservations({
      exposure: 82,
      sharpness: 84,
      lightingBalance: 82,
    }).observations.map((o) => ({
      id: o.id,
      label: o.label,
      method: o.measurementMethod,
      region: o.region,
      algorithmVersion: o.algorithmVersion,
    }));

    return NextResponse.json({
      success: true,
      rubric: {
        activeProductionVersion: 'v2.0-presentation',
        experimentalVersion: HARMONY_V2_1_RUBRIC_VERSION,
        experimentalEnabledInProd: EXPERIMENTAL_FACTORS_ENABLED_IN_PROD,
        productionWeights: DEFAULT_LETHALITY_WEIGHTS,
        experimentalWeights: HARMONY_V2_1_EXPERIMENTAL_WEIGHTS,
      },
      observationRegistry: {
        version: SKIN_APPEARANCE_VERSION,
        items: observationRegistry,
      },
      knowledgeBase: {
        version: INGREDIENT_KB_VERSION,
        ingredients: INGREDIENT_LIBRARY,
        compatibilities: INGREDIENT_COMPATIBILITIES,
        concernMappings: CONCERN_INGREDIENT_MAPPINGS,
        routineTemplates: ROUTINE_TEMPLATES,
      },
      ruleVersions,
      funnelAnalytics: {
        totalScans,
        totalSkinProfiles,
        totalRoutines,
        interactions: interactions.map((row) => ({
          eventType: row.eventType,
          count: row._count.eventType,
        })),
      },
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load Beauty Intelligence workspace' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: 'CREATE_RULE_DRAFT' | 'SIMULATE';
      rules?: Record<string, unknown>;
      notes?: string;
      concernSlugs?: string[];
      sensitivities?: string[];
      ingredientSlugs?: string[];
    };

    if (body.action === 'SIMULATE') {
      await requireStaffPermission('economy.read');
      const concernSlugs = Array.isArray(body.concernSlugs) ? body.concernSlugs : [];
      const sensitivities = (Array.isArray(body.sensitivities) ? body.sensitivities : []).map((s) =>
        s.toLowerCase()
      );
      const matchedMappings = CONCERN_INGREDIENT_MAPPINGS.filter(
        (m) =>
          concernSlugs.includes(m.concernSlug) &&
          !sensitivities.some((sens) => m.ingredientSlug.includes(sens))
      );
      const candidateSlugs =
        Array.isArray(body.ingredientSlugs) && body.ingredientSlugs.length > 0
          ? body.ingredientSlugs
          : matchedMappings.map((m) => m.ingredientSlug);
      const compatibilityWarnings = checkIngredientCompatibility(candidateSlugs);

      return NextResponse.json({
        success: true,
        simulation: {
          matchedMappings,
          compatibilityWarnings,
          safe: compatibilityWarnings.length === 0,
        },
      });
    }

    const staff = await requireStaffPermission('economy.adjust');
    const rulesObj = body.rules && typeof body.rules === 'object' ? body.rules : {};

    // Governance guard: never allow rules targeting users by low appearance/Lethality scores
    const serialized = JSON.stringify(rulesObj).toLowerCase();
    if (serialized.includes('lethalityscore') || serialized.includes('low_appearance')) {
      return NextResponse.json(
        { error: 'Targeting users based on appearance or Lethality scores is strictly prohibited.' },
        { status: 400 }
      );
    }

    const latest = await db.recommendationRuleVersion.findFirst({
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const created = await db.recommendationRuleVersion.create({
      data: {
        version: nextVersion,
        status: 'DRAFT',
        rules: rulesObj as object,
        notes: body.notes?.trim() || 'Beauty Intelligence recommendation rule draft',
        createdById: staff.id,
      },
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'BEAUTY_RULE_DRAFT_CREATED',
      targetType: 'RecommendationRuleVersion',
      targetId: created.id,
      detail: { version: created.version },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, ruleVersion: created }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to process Beauty Intelligence action' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('economy.adjust');
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      action?: 'PUBLISH' | 'ARCHIVE';
    };

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const row = await db.recommendationRuleVersion.findUnique({ where: { id: body.id } });
    if (!row) {
      return NextResponse.json({ error: 'Rule version not found' }, { status: 404 });
    }

    const action = body.action || 'PUBLISH';
    const updated = await db.$transaction(async (tx) => {
      if (action === 'PUBLISH') {
        await tx.recommendationRuleVersion.updateMany({
          where: { status: 'PUBLISHED' },
          data: { status: 'ARCHIVED' },
        });
      }
      return tx.recommendationRuleVersion.update({
        where: { id: row.id },
        data: {
          status: action === 'PUBLISH' ? 'PUBLISHED' : 'ARCHIVED',
          publishedById: action === 'PUBLISH' ? staff.id : row.publishedById,
          publishedAt: action === 'PUBLISH' ? new Date() : row.publishedAt,
        },
      });
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: `BEAUTY_RULE_${action}ED`,
      targetType: 'RecommendationRuleVersion',
      targetId: updated.id,
      detail: { version: updated.version },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, ruleVersion: updated });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update rule version' }, { status: 500 });
  }
}
