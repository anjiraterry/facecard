import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return jsonResponse({ error: 'Unauthorized' }, 401);

    const [redemptions, reservations] = await Promise.all([
      db.pointsRedemption.findMany({
        where: { userId: sessionUser.id },
        include: { refunds: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.pointsReservation.findMany({
        where: { userId: sessionUser.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return jsonResponse(toJsonSafe({ success: true, redemptions, activeReservations: reservations }));
  } catch (error) {
    console.error('Atelier rewards history error:', error);
    return jsonResponse({ error: 'Failed to load Atelier redemption history' }, 500);
  }
}
