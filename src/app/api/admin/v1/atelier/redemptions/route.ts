import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/admin/auth';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('atelier.read');

    const [redemptions, reservations] = await Promise.all([
      db.pointsRedemption.findMany({
        include: { allocations: true, refunds: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.pointsReservation.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return jsonResponse(toJsonSafe({ success: true, redemptions, activeReservations: reservations }));
  } catch (error) {
    console.error('Admin redemptions list error:', error);
    return jsonResponse({ error: 'Failed to load Atelier redemptions' }, 500);
  }
}
