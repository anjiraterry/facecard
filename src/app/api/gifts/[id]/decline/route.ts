import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { postLedger } from '@/lib/ledger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gifts/:id/decline
 * Recipient declines a PENDING gift -> issues a compensating BOUTIQUE_REFUND to the sender.
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
      include: { purchase: true, item: true },
    });

    if (!gift) {
      return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    }
    if (gift.recipientId !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (gift.status !== 'PENDING') {
      return NextResponse.json({ error: `Gift is already ${gift.status.toLowerCase()}` }, { status: 400 });
    }

    const refundPoints = gift.purchase?.price ?? gift.item.price;
    const now = new Date();

    await db.$transaction(async (tx) => {
      const updated = await tx.socialGift.updateMany({
        where: { id: gift.id, status: 'PENDING', recipientId: sessionUser.id },
        data: { status: 'DECLINED', declinedAt: now },
      });
      if (updated.count !== 1) {
        throw new Error('GIFT_ALREADY_PROCESSED');
      }

      if (refundPoints > 0) {
        await postLedger(tx, {
          userId: gift.senderId,
          type: 'BOUTIQUE_REFUND',
          amount: refundPoints,
          balanceKind: 'SPENDABLE',
          refType: 'SOCIAL_GIFT_DECLINED',
          refId: gift.id,
          idempotencyKey: `gift-refund:${gift.id}`,
        });
      }
    });

    return NextResponse.json({ success: true, refundedToSender: refundPoints });
  } catch (error) {
    if (error instanceof Error && error.message === 'GIFT_ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'Gift already processed' }, { status: 409 });
    }
    console.error('Decline gift error:', error);
    return NextResponse.json({ error: 'Failed to decline gift' }, { status: 500 });
  }
}
