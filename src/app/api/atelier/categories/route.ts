import { db } from '@/lib/db';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await db.productCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return jsonResponse({ success: true, categories });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch categories', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
