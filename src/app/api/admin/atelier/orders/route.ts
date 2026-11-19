import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus } from '@prisma/client';
import { db } from '@/lib/db';
import {
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { getClientIp } from '@/lib/auth/rateLimit';
import { createNotification } from '@/lib/notifications';

const ALLOWED_STATUSES = new Set<OrderStatus>([
  'PENDING_PAYMENT',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
]);

export async function GET() {
  try {
    await requireStaffPermission('atelier.read');
    const orders = await db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        items: true,
        address: true,
      },
    });
    const serialized = orders.map((o) => ({
      ...o,
      subtotalMinor: Number(o.subtotalMinor),
      discountMinor: Number(o.discountMinor),
      shippingMinor: Number(o.shippingMinor),
      taxMinor: Number(o.taxMinor),
      totalMinor: Number(o.totalMinor),
      status: o.orderStatus,
    }));
    return NextResponse.json({ success: true, orders: serialized });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load Atelier orders' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('atelier.orders_write');
    const { orderId, status, note } = (await req.json().catch(() => ({}))) as {
      orderId?: string;
      status?: OrderStatus;
      note?: string;
    };

    if (!orderId || !status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Valid orderId and status are required' }, { status: 400 });
    }

    const updated = await db.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id: orderId } });
      const order = await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: status },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: existing?.orderStatus ?? null,
          toStatus: status,
          note: note || `Updated by ${staff.fullName}`,
          actorId: staff.id,
        },
      });

      return order;
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'ATELIER_ORDER_STATUS_UPDATED',
      targetType: 'ORDER',
      targetId: orderId,
      reason: note || `Status updated to ${status}`,
      detail: { status, orderNumber: updated.orderNumber },
      ip: getClientIp(req),
    });

    if (updated.userId) {
      void createNotification({
        userId: updated.userId,
        type: 'ORDER_UPDATE',
        title: `Atelier Order ${updated.orderNumber}`,
        body: `Your order status was updated to ${status}.${note ? ` ${note}` : ''}`,
        href: '/skincare',
        metadata: { orderId: updated.id, orderNumber: updated.orderNumber, status },
      });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updated.id,
        orderNumber: updated.orderNumber,
        orderStatus: updated.orderStatus,
      },
    });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
