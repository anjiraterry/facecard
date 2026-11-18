import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { productId } = await params;

    await db.wishlistItem.deleteMany({
      where: { userId: user.id, productId },
    });

    return jsonResponse({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to remove from wishlist', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
