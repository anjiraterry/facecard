import { NextRequest } from 'next/server';
import { requireStaffPermission } from '@/lib/admin/auth';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';
import { refundPointsRedemption } from '@/lib/atelier/redemption';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const staff = await requireStaffPermission('atelier.orders_write');
    const { orderId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const refundRatioBps =
      typeof body.refundRatioBps === 'number' && Number.isInteger(body.refundRatioBps)
        ? body.refundRatioBps
        : 10000;
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Staff refund';
    const refundReference =
      typeof body.refundReference === 'string' && body.refundReference.trim()
        ? body.refundReference.trim()
        : `ref:${orderId}:${Date.now()}`;

    const refund = await refundPointsRedemption({
      orderId,
      refundReference,
      refundRatioBps,
      reason,
      staffId: staff.id,
    });

    return jsonResponse(toJsonSafe({ success: true, refund }));
  } catch (error) {
    console.error('Admin redemption refund error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Failed to process redemption refund' },
      400
    );
  }
}
