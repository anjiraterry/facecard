import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { id } = await params;
    const order = await db.order.findFirst({
      where: { id, userId: user.id },
      include: {
        items: true,
        address: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) return jsonResponse({ error: 'Order not found' }, 404);
    return jsonResponse({ success: true, order });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load order', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
