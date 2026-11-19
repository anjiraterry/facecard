import { db } from '@/lib/db';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Safely creates an in-app notification without failing the caller's primary action.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    if (!db?.notification?.create) return;
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
  } catch (err) {
    console.warn('[notifications] Failed to create notification:', err);
  }
}

/**
 * Seeds a one-time welcome notification if the user has no notifications yet.
 */
export async function ensureWelcomeNotification(userId: string): Promise<void> {
  try {
    if (!db?.notification?.count || !db?.notification?.create) return;
    const count = await db.notification.count({ where: { userId } });
    if (count === 0) {
      await db.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Welcome to Face Card',
          body: 'You receive 3 free daily portrait scans every day at 00:00 WAT. Take your first scan to calibrate your Harmony Index and start your streak.',
          href: '/scan',
        },
      });
    }
  } catch (err) {
    console.warn('[notifications] Failed to seed welcome notification:', err);
  }
}
