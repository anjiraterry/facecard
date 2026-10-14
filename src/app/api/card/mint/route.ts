import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPin } from '@/lib/auth/pin';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { displayName, handle, pin } = await req.json();

    // 1. Validation
    const cleanName = (displayName || '').trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 50) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 50 characters.' },
        { status: 400 }
      );
    }

    const cleanHandle = (handle || '').replace(/^@/, '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanHandle)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters and contain only letters, numbers, or underscores.' },
        { status: 400 }
      );
    }

    const cleanPin = (pin || '').trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      return NextResponse.json(
        { error: 'Security PIN must be 4 to 6 numeric digits.' },
        { status: 400 }
      );
    }

    // 2. Check handle availability
    const existingUser = await db.user.findFirst({
      where: {
        handle: {
          equals: cleanHandle,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: `The username @${cleanHandle} is already claimed. Try another.` },
        { status: 409 }
      );
    }

    // 3. Hash PIN
    const hashedPin = await hashPin(cleanPin);

    // 4. Generate Card details
    const cardNumber = `FC-${Math.floor(1000 + Math.random() * 9000)}-2026`;
    const newUserId = randomUUID();
    const todayKey = new Date().toISOString().split('T')[0];

    // 5. Create user and Facecard in transaction
    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          id: newUserId,
          displayName: cleanName,
          handle: cleanHandle,
          pinHash: hashedPin,
          tier: 'CLASSIC',
          lifetimePoints: 100,
          spendableBalance: 100,
          streak: {
            create: {
              id: randomUUID(),
              currentCount: 1,
              longestCount: 1,
              lastScanDayKey: todayKey,
              freezesHeld: 0,
            },
          },
          cards: {
            create: {
              id: randomUUID(),
              cardNumber,
            },
          },
        },
        include: {
          cards: true,
          streak: true,
        },
      });

      // Credit welcome points to ledger
      await tx.pointsLedger.create({
        data: {
          id: randomUUID(),
          userId: newUserId,
          type: 'ADJUSTMENT',
          amount: 100,
          balanceKind: 'SPENDABLE',
          refType: 'MINT_BONUS',
          refId: createdUser.cards[0]?.id,
          idempotencyKey: `mint_bonus_${newUserId}`,
        },
      });

      return createdUser;
    });

    // 6. Generate session token & response
    const sessionToken = `fc_sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;

    const response = NextResponse.json({
      success: true,
      message: 'Facecard successfully minted!',
      user: {
        id: user.id,
        displayName: user.displayName,
        handle: `@${user.handle}`,
        tier: user.tier,
        lifetimePoints: user.lifetimePoints,
        spendableBalance: user.spendableBalance,
        streakDays: user.streak?.currentCount ?? 1,
        cardNumber,
      },
    });

    // 7. Set cookies (30 days)
    response.cookies.set('fc_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set('fc_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Error minting Facecard:', error);
    return NextResponse.json(
      { error: 'Failed to mint Facecard. Please try again.' },
      { status: 500 }
    );
  }
}
