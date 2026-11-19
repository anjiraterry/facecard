import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gifts = await db.socialGift.findMany({
    where: { senderId: sessionUser.id },
    include: {
      item: { select: { id: true, name: true, slug: true, price: true } },
      recipient: { select: { id: true, handle: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ success: true, gifts });
}
