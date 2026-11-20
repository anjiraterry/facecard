import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/admin/auth';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';
import { DEFAULT_TIER_RULES, getActiveRedemptionPolicy } from '@/lib/atelier/redemption';
import { RedemptionPolicyStatus, Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('atelier.read');
    await getActiveRedemptionPolicy(); // Ensure default v1 exists

    const policies = await db.redemptionPolicyVersion.findMany({
      include: { tierRules: true },
      orderBy: { version: 'desc' },
      take: 20,
    });

    return jsonResponse(toJsonSafe({ success: true, policies }));
  } catch (error) {
    console.error('List redemption policies error:', error);
    return jsonResponse({ error: 'Failed to load redemption policies' }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('economy.adjust');
    const body = await req.json().catch(() => ({}));

    const latest = await db.redemptionPolicyVersion.findFirst({
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const minimumTier = (['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK'].includes(body.minimumTier)
      ? body.minimumTier
      : 'GOLD') as Tier;
    const pointsPerUnit = typeof body.pointsPerUnit === 'number' && body.pointsPerUnit > 0 ? Math.round(body.pointsPerUnit) : 100;
    const valuePerUnitMinor = BigInt(typeof body.valuePerUnitMinor === 'number' && body.valuePerUnitMinor > 0 ? Math.round(body.valuePerUnitMinor) : 5000);
    const minimumSubtotalMinor = BigInt(typeof body.minimumSubtotalMinor === 'number' && body.minimumSubtotalMinor >= 0 ? Math.round(body.minimumSubtotalMinor) : 1000000);
    const marginFloorBps = typeof body.marginFloorBps === 'number' && body.marginFloorBps >= 0 ? Math.round(body.marginFloorBps) : 1500;
    const processingFeeBps = typeof body.processingFeeBps === 'number' && body.processingFeeBps >= 0 ? Math.round(body.processingFeeBps) : 150;
    const processingFeeFlatMinor = BigInt(typeof body.processingFeeFlatMinor === 'number' && body.processingFeeFlatMinor >= 0 ? Math.round(body.processingFeeFlatMinor) : 10000);
    const allowPromoStacking = Boolean(body.allowPromoStacking);
    const emergencyPaused = Boolean(body.emergencyPaused);
    const programmeBudgetMinor =
      typeof body.programmeBudgetMinor === 'number' && body.programmeBudgetMinor > 0
        ? BigInt(Math.round(body.programmeBudgetMinor))
        : null;

    const incomingTierRules = Array.isArray(body.tierRules) ? body.tierRules : [];
    const tierRulesToCreate = (['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK'] as Tier[]).map((t) => {
      const match = incomingTierRules.find((r: { tier?: string }) => r.tier === t);
      const def = DEFAULT_TIER_RULES[t];
      return {
        tier: t,
        enabled: typeof match?.enabled === 'boolean' ? match.enabled : def.enabled,
        maxDiscountBps: typeof match?.maxDiscountBps === 'number' ? Math.round(match.maxDiscountBps) : def.maxDiscountBps,
        perOrderCapMinor:
          typeof match?.perOrderCapMinor === 'number' ? BigInt(Math.round(match.perOrderCapMinor)) : def.perOrderCapMinor,
        monthlyCapMinor:
          typeof match?.monthlyCapMinor === 'number' ? BigInt(Math.round(match.monthlyCapMinor)) : def.monthlyCapMinor,
        frequencyLimit: typeof match?.frequencyLimit === 'number' ? Math.round(match.frequencyLimit) : def.frequencyLimit,
      };
    });

    const created = await db.redemptionPolicyVersion.create({
      data: {
        version: nextVersion,
        status: RedemptionPolicyStatus.DRAFT,
        minimumTier,
        pointsPerUnit,
        valuePerUnitMinor,
        minimumSubtotalMinor,
        marginFloorBps,
        processingFeeBps,
        processingFeeFlatMinor,
        allowPromoStacking,
        programmeBudgetMinor,
        emergencyPaused,
        notes: typeof body.notes === 'string' ? body.notes : null,
        createdById: staff.id,
        tierRules: { create: tierRulesToCreate },
      },
      include: { tierRules: true },
    });

    return jsonResponse(toJsonSafe({ success: true, policy: created }), 201);
  } catch (error) {
    console.error('Create redemption policy error:', error);
    return jsonResponse({ error: 'Failed to create redemption policy draft' }, 500);
  }
}
