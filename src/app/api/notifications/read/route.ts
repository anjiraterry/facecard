import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const ReadSchema = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = ReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const now = new Date();
    if (parsed.data.all) {
      await db.notification.updateMany({
        where: { userId: sessionUser.id, readAt: null },
        data: { readAt: now },
      });
    } else if (parsed.data.id) {
      await db.notification.updateMany({
        where: { id: parsed.data.id, userId: sessionUser.id, readAt: null },
        data: { readAt: now },
      });
    } else {
      return NextResponse.json({ error: 'Provide id or all: true' }, { status: 400 });
    }

    const unreadCount = await db.notification.count({
      where: { userId: sessionUser.id, readAt: null },
    });

    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update notifications',
        message: error instanceof Error ? error.message : 'Error',
      },
      { status: 500 }
    );
  }
}
