import { db } from '@/lib/db';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const brands = await db.brand.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    return jsonResponse({ success: true, brands });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch brands', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
