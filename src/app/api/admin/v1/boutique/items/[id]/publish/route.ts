import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission, recordStaffAuditLog, StaffAuthError } from '@/lib/admin/auth';
import { validateEffectDefinition } from '@/lib/boutique/effectRegistry';
import { getClientIp } from '@/lib/auth/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: 'PUBLISH' | 'PAUSE' | 'RETIRE' };
    const action = body.action || 'PUBLISH';

    const requiredPerm =
      action === 'PAUSE'
        ? 'boutique.items.pause'
        : action === 'RETIRE'
          ? 'boutique.items.retire'
          : 'boutique.items.publish';

    const staff = await requireStaffPermission(requiredPerm);
    const { id } = await context.params;

    const item = await db.shopItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Boutique item not found' }, { status: 404 });
    }

    if (action === 'PUBLISH') {
      if (!item.effectKind) {
        return NextResponse.json({ error: 'Cannot publish item without an effectKind' }, { status: 400 });
      }
      const validation = validateEffectDefinition(item.effectKind, item.effectConfig);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Publication blocked: invalid effect configuration', validationErrors: validation.errors },
          { status: 400 }
        );
      }
    }

    const nextStatus = action === 'PUBLISH' ? 'PUBLISHED' : action === 'PAUSE' ? 'PAUSED' : 'RETIRED';
    const updated = await db.shopItem.update({
      where: { id },
      data: {
        status: nextStatus,
        active: nextStatus === 'PUBLISHED',
      },
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: `BOUTIQUE_ITEM_${nextStatus}`,
      targetType: 'ShopItem',
      targetId: item.id,
      detail: { sku: item.sku, slug: item.slug },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update publication state' }, { status: 500 });
  }
}
