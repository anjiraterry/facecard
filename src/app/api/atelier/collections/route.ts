import { db } from '@/lib/db';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const collections = await db.collection.findMany({
      where: { active: true },
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: { id: true, slug: true, name: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return jsonResponse({ success: true, collections });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to fetch collections', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
