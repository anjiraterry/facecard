import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { postLedger, InsufficientBalanceError } from '@/lib/ledger';
import { hashRequest, parseIdempotencyKey, runIdempotent } from '@/lib/idempotency';

export const dynamic = 'force-dynamic';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/gifts
 * Sends a gift or eligible giftable cosmetic to another user.
 * Enforces blocking, recipient GiftPreference, idempotency, and atomic ledger debit.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      recipientId?: string;
      recipientHandle?: string;
      itemId?: string;
      message?: string;
    };

    if ((!body.recipientId && !body.recipientHandle) || !body.itemId) {
      return NextResponse.json(
        { error: 'recipientId (or recipientHandle) and itemId are required' },
        { status: 400 }
      );
    }

    const idempotencyKey =
      parseIdempotencyKey(req) ||
      `gift-send-${sessionUser.id}-${body.recipientId || body.recipientHandle}-${body.itemId}-${randomUUID()}`;

    const result = await runIdempotent(
      sessionUser.id,
      'social-gift-send',
      idempotencyKey,
      hashRequest(body),
      () => performSendGift(sessionUser.id, body)
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Send gift error:', error);
    return NextResponse.json({ error: 'Failed to send gift' }, { status: 500 });
  }
}

async function performSendGift(
  senderId: string,
  body: { recipientId?: string; recipientHandle?: string; itemId?: string; message?: string }
) {
  const recipient = await db.user.findFirst({
    where: body.recipientId
      ? { id: body.recipientId }
      : { handle: body.recipientHandle?.replace(/^@/, '').toLowerCase() },
    include: { giftPreference: true },
  });

  if (!recipient || recipient.status === 'BANNED' || recipient.status === 'DELETED') {
    return { status: 404, body: { error: 'Recipient not found' } };
  }

  if (recipient.id === senderId) {
    return { status: 400, body: { error: 'You cannot send a gift to yourself.' } };
  }

  // Check blocking & friendship
  const friendship = await db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: senderId, addresseeId: recipient.id },
        { requesterId: recipient.id, addresseeId: senderId },
      ],
    },
  });

  if (friendship?.status === 'BLOCKED') {
    return { status: 403, body: { error: 'Unable to send gift to this user.' } };
  }

  const pref = recipient.giftPreference;
  if (pref && (!pref.enabled || pref.allowedSenders === 'NONE')) {
    return { status: 403, body: { error: 'This member has disabled incoming gifts.' } };
  }
  if (pref?.allowedSenders === 'FRIENDS_ONLY' && friendship?.status !== 'ACCEPTED') {
    return { status: 403, body: { error: 'This member only accepts gifts from friends in their Circle.' } };
  }

  const item = await db.shopItem.findUnique({ where: { id: body.itemId! } });
  if (!item || !item.active || item.status !== 'PUBLISHED') {
    return { status: 404, body: { error: 'Gift item not found or unpublished' } };
  }
  if (!item.isGiftable) {
    return { status: 400, body: { error: 'This item is not eligible for gifting.' } };
  }

  const cleanMessage = body.message?.trim().slice(0, 200) || null;
  const purchaseId = randomUUID();
  const giftId = randomUUID();
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

  try {
    const txResult = await db.$transaction(async (tx) => {
      await postLedger(tx, {
        userId: senderId,
        type: 'SHOP_PURCHASE',
        amount: -item.price,
        balanceKind: 'SPENDABLE',
        refType: 'SOCIAL_GIFT',
        refId: giftId,
        idempotencyKey: `gift:${giftId}`,
      });

      const purchase = await tx.purchase.create({
        data: {
          id: purchaseId,
          userId: senderId,
          itemId: item.id,
          itemVersionId: item.currentVersionId,
          quantity: 1,
          price: item.price,
          idempotencyKey: `gift:${giftId}`,
        },
      });

      const gift = await tx.socialGift.create({
        data: {
          id: giftId,
          senderId,
          recipientId: recipient.id,
          itemId: item.id,
          itemVersionId: item.currentVersionId,
          purchaseId: purchase.id,
          status: 'PENDING',
          message: cleanMessage,
          expiresAt,
        },
        include: {
          item: { select: { name: true, slug: true, price: true } },
          recipient: { select: { id: true, handle: true, displayName: true } },
        },
      });

      const freshSender = await tx.user.findUnique({
        where: { id: senderId },
        select: { spendableBalance: true },
      });

      return { gift, remainingBalance: freshSender?.spendableBalance ?? 0 };
    });

    return {
      status: 201,
      body: {
        success: true,
        gift: txResult.gift,
        remainingSpendableBalance: txResult.remainingBalance,
      },
    };
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return { status: 400, body: { error: 'Insufficient spendable points for this gift.' } };
    }
    throw err;
  }
}
