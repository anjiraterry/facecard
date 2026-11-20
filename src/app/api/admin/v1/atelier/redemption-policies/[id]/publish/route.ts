import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/admin/auth';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';
import { RedemptionPolicyStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await requireStaffPermission('economy.adjust');
    const { id } = await context.params;

    const target = await db.redemptionPolicyVersion.findUnique({
      where: { id },
      include: { tierRules: true },
    });
    if (!target) return jsonResponse({ error: 'Policy version not found' }, 404);
    if (target.tierRules.length === 0) {
      return jsonResponse({ error: 'Policy must define tier rules before publication' }, 400);
    }

    const published = await db.$transaction(async (tx) => {
      await tx.redemptionPolicyVersion.updateMany({
        where: { status: RedemptionPolicyStatus.PUBLISHED },
        data: { status: RedemptionPolicyStatus.ARCHIVED },
      });

      const next = await tx.redemptionPolicyVersion.update({
        where: { id },
        data: {
          status: RedemptionPolicyStatus.PUBLISHED,
          publishedById: staff.id,
          publishedAt: new Date(),
        },
        include: { tierRules: true },
      });

      await tx.staffAuditLog.create({
        data: {
          staffUserId: staff.id,
          action: 'ATELIER_REDEMPTION_POLICY_PUBLISHED',
          targetType: 'RedemptionPolicyVersion',
          targetId: next.id,
          detail: { version: next.version, minimumTier: next.minimumTier },
        },
      });

      return next;
    });

    return jsonResponse(toJsonSafe({ success: true, policy: published }));
  } catch (error) {
    console.error('Publish redemption policy error:', error);
    return jsonResponse({ error: 'Failed to publish redemption policy' }, 500);
  }
}
