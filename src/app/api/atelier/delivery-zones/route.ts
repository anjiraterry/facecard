import { db } from '@/lib/db';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const zones = await db.deliveryZone.findMany({
      where: { active: true },
      include: { rates: { where: { active: true }, orderBy: { amountMinor: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return jsonResponse({ success: true, zones });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch delivery zones', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
