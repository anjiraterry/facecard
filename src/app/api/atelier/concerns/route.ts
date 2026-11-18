import { db } from '@/lib/db';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const concerns = await db.skinConcern.findMany({
      orderBy: { name: 'asc' },
    });
    return jsonResponse({ success: true, concerns });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch skin concerns', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
