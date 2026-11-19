import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gifts/:id/accept
 * Only the intended recipient can accept a PENDING gift before expiresAt.
 * Grants permanent cosmetic ownership OR creates a timed ActiveEffect (e.g., Golden Crown 24h).
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const gift = await db.socialGift.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }
    if (gift.recipientId !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden: only the recipient can accept this gift' }, { status: 403 });
    }
    if (gift.status !== 'PENDING') {
      return NextResponse.json({ error: `Gift is already ${gift.status.toLowerCase()}` }, { status: 400 });
    }
    if (gift.expiresAt <= new Date()) {
      await db.socialGift.update({ where: { id: gift.id }, data: { status: 'EXPIRED' } });
      return NextResponse.json({ error: 'This gift has expired.' }, { status: 400 });
    }

    const now = new Date();
    const result = await db.$transaction(async (tx) => {
      // Atomic guard against duplicate acceptance
      const updated = await tx.socialGift.updateMany({
        where: { id: gift.id, status: 'PENDING', recipientId: sessionUser.id },
        data: { status: 'ACCEPTED', acceptedAt: now },
      });
      if (updated.count !== 1) {
        throw new Error('GIFT_ALREADY_PROCESSED');
      }

      // Grant UserItem to recipient
      const userItem = await tx.userItem.upsert({
        where: { userId_itemId: { userId: sessionUser.id, itemId: gift.itemId } },
        update: { quantity: { increment: 1 } },
        create: { userId: sessionUser.id, itemId: gift.itemId, quantity: 1 },
      });

      await tx.userItemMovement.create({
        data: {
          userId: sessionUser.id,
          userItemId: userItem.id,
          itemId: gift.itemId,
          quantityDelta: 1,
          reason: 'GIFT_ACCEPTED',
          referenceId: gift.id,
        },
      });

      // If social gift carries a timed recipient badge (e.g. Golden Crown 24h), activate it
      const cfg = (gift.item.effectConfig ?? {}) as { recipientEffectSeconds?: number };
      let activeEffect = null;
      if (gift.item.effectKind === 'SOCIAL_GIFT' && typeof cfg.recipientEffectSeconds === 'number' && cfg.recipientEffectSeconds > 0) {
        activeEffect = await tx.activeEffect.create({
          data: {
            userId: sessionUser.id,
            userItemId: userItem.id,
            itemId: gift.itemId,
            effectKind: 'SOCIAL_GIFT',
            config: cfg as object,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt: new Date(now.getTime() + cfg.recipientEffectSeconds * 1000),
          },
        });
      }

      return { userItem, activeEffect };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === 'GIFT_ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'Gift already processed' }, { status: 409 });
    }
    console.error('Accept gift error:', error);
    return NextResponse.json({ error: 'Failed to accept gift' }, { status: 500 });
  }
}
