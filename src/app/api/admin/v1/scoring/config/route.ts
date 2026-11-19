import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission, recordStaffAuditLog, StaffAuthError } from '@/lib/admin/auth';
import { validateLethalityWeights } from '@/lib/rating/lethalityEngine';
import { validateRewardPolicy } from '@/lib/rewards/rewardPolicy';
import { getActiveLethalityWeights, getActiveRewardPolicy } from '@/lib/rewards/activeConfig';
import { getClientIp } from '@/lib/auth/rateLimit';
import type { ScoringConfigKind } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('economy.read');
    const [versions, activeWeights, activeRewardPolicy] = await Promise.all([
      db.scoringConfigVersion.findMany({
        orderBy: [{ kind: 'asc' }, { version: 'desc' }],
        take: 30,
      }),
      getActiveLethalityWeights(),
      getActiveRewardPolicy(),
    ]);

    return NextResponse.json({
      success: true,
      activeWeights,
      activeRewardPolicy,
      versions,
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load scoring & reward configs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('economy.adjust');
    const body = (await req.json().catch(() => ({}))) as {
      kind?: ScoringConfigKind;
      config?: unknown;
      notes?: string;
    };

    if (!body.kind || !['SCORING_WEIGHTS', 'REWARD_POLICY'].includes(body.kind)) {
      return NextResponse.json({ error: 'kind must be SCORING_WEIGHTS or REWARD_POLICY' }, { status: 400 });
    }

    if (body.kind === 'SCORING_WEIGHTS') {
      const check = validateLethalityWeights(body.config);
      if (!check.valid) {
        return NextResponse.json({ error: 'Invalid scoring weights', validationErrors: check.errors }, { status: 400 });
      }
    } else {
      const check = validateRewardPolicy(body.config);
      if (!check.valid) {
        return NextResponse.json({ error: 'Invalid reward policy', validationErrors: check.errors }, { status: 400 });
      }
    }

    const latest = await db.scoringConfigVersion.findFirst({
      where: { kind: body.kind },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const created = await db.scoringConfigVersion.create({
      data: {
        kind: body.kind,
        version: nextVersion,
        status: 'DRAFT',
        config: body.config as object,
        notes: body.notes?.trim() || null,
        createdById: staff.id,
      },
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'SCORING_CONFIG_DRAFT_CREATED',
      targetType: 'ScoringConfigVersion',
      targetId: created.id,
      detail: { kind: created.kind, version: created.version },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, configVersion: created }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to create config draft' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('economy.adjust');
    const body = (await req.json().catch(() => ({}))) as { id?: string; action?: 'PUBLISH' | 'ARCHIVE' };
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const row = await db.scoringConfigVersion.findUnique({ where: { id: body.id } });
    if (!row) {
      return NextResponse.json({ error: 'Config version not found' }, { status: 404 });
    }

    const action = body.action || 'PUBLISH';
    const updated = await db.$transaction(async (tx) => {
      if (action === 'PUBLISH') {
        await tx.scoringConfigVersion.updateMany({
          where: { kind: row.kind, status: 'PUBLISHED' },
          data: { status: 'ARCHIVED' },
        });
      }
      return tx.scoringConfigVersion.update({
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
      action: `SCORING_CONFIG_${action}ED`,
      targetType: 'ScoringConfigVersion',
      targetId: updated.id,
      detail: { kind: updated.kind, version: updated.version },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, configVersion: updated });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update config version' }, { status: 500 });
  }
}
