import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = await context.params;
  await db.shopWishlistItem.deleteMany({
    where: { userId: sessionUser.id, itemId },
  });

  return NextResponse.json({ success: true });
}
