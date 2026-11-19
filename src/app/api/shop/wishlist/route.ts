import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wishlist = await db.shopWishlistItem.findMany({
    where: { userId: sessionUser.id },
    include: { item: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, wishlist });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = (await req.json().catch(() => ({}))) as { itemId?: string };
  if (!itemId) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
  }

  const item = await db.shopItem.findUnique({ where: { id: itemId } });
  if (!item || !item.active) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const entry = await db.shopWishlistItem.upsert({
    where: { userId_itemId: { userId: sessionUser.id, itemId } },
    update: {},
    create: { userId: sessionUser.id, itemId },
  });

  return NextResponse.json({ success: true, entry });
}
