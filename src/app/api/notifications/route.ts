import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { ensureWelcomeNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';

    await ensureWelcomeNotification(sessionUser.id);

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: {
          userId: sessionUser.id,
          ...(unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.notification.count({
        where: { userId: sessionUser.id, readAt: null },
      }),
    ]);

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        metadata: n.metadata,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load notifications',
        message: error instanceof Error ? error.message : 'Error',
      },
      { status: 500 }
    );
  }
}
