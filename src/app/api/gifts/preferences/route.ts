import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pref = await db.giftPreference.findUnique({ where: { userId: sessionUser.id } });
  return NextResponse.json({
    success: true,
    preference: pref ?? {
      userId: sessionUser.id,
      enabled: true,
      allowedSenders: 'ALL',
      publicDisplay: true,
    },
  });
}

export async function PUT(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    allowedSenders?: 'ALL' | 'FRIENDS_ONLY' | 'NONE';
    publicDisplay?: boolean;
  };

  const allowedSenders =
    body.allowedSenders && ['ALL', 'FRIENDS_ONLY', 'NONE'].includes(body.allowedSenders)
      ? body.allowedSenders
      : 'ALL';

  const preference = await db.giftPreference.upsert({
    where: { userId: sessionUser.id },
    update: {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      allowedSenders,
      publicDisplay: typeof body.publicDisplay === 'boolean' ? body.publicDisplay : true,
    },
    create: {
      userId: sessionUser.id,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
      allowedSenders,
      publicDisplay: typeof body.publicDisplay === 'boolean' ? body.publicDisplay : true,
    },
  });

  return NextResponse.json({ success: true, preference });
}
