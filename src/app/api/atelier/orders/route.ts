import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const orders = await db.order.findMany({
      where: { userId: user.id },
      include: {
        items: true,
        address: true,
      },
      orderBy: { placedAt: 'desc' },
      take: 50,
    });

    return jsonResponse({ success: true, orders });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load orders', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
