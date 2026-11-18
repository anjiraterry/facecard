import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { getClientIp } from '@/lib/auth/rateLimit';

export async function GET() {
  try {
    await requireStaffPermission('atelier.read');
    const products = await db.atelierProduct.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        brand: { select: { name: true, slug: true } },
        variants: {
          include: {
            inventoryLevels: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, products });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load Atelier products' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('atelier.inventory_write');
    const { variantId, locationId, onHandDelta, reason } = (await req.json().catch(() => ({}))) as {
      variantId?: string;
      locationId?: string;
      onHandDelta?: number;
      reason?: string;
    };

    if (!variantId || !locationId || typeof onHandDelta !== 'number' || !reason) {
      return NextResponse.json(
        { error: 'variantId, locationId, onHandDelta, and reason are required' },
        { status: 400 }
      );
    }

    const level = await db.$transaction(async (tx) => {
      const updated = await tx.inventoryLevel.update({
        where: {
          variantId_locationId: { variantId, locationId },
        },
        data: {
          onHand: { increment: onHandDelta },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          variantId,
          locationId,
          type: 'ADJUSTMENT',
          onHandDelta,
          reservedDelta: 0,
          referenceType: 'STAFF_ADJUSTMENT',
          referenceId: variantId,
          operationKey: `staff-adj:${variantId}:${locationId}:${Date.now()}`,
          performedById: staff.id,
          reason: `${reason} (by ${staff.fullName})`,
        },
      });

      return updated;
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'ATELIER_INVENTORY_ADJUSTED',
      targetType: 'PRODUCT_VARIANT',
      targetId: variantId,
      reason,
      detail: { locationId, onHandDelta, newOnHand: level.onHand },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, level });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to adjust inventory' }, { status: 500 });
  }
}
