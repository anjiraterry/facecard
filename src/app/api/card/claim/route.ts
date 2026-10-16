import { NextRequest, NextResponse } from 'next/server';
import crypto, { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { hashPin } from '@/lib/auth/pin';
import { getClientIp, isRateLimited, recordAttempt } from '@/lib/auth/rateLimit';
import { applySessionCookie, createSession } from '@/lib/auth/sessions';
import { grantSignupBonus, isUniqueViolation } from '@/lib/ledger';
import { getLagosDayKey } from '@/lib/scoring';

export async function POST(req: NextRequest) {
  let currentPhase = 'INIT';
  try {
    currentPhase = 'RATE_LIMIT_CHECK';
    const ip = getClientIp(req);
    console.log('[CLAIM Phase 1/6] Checking rate limit for IP:', ip);
    if (await isRateLimited('card_claim_ip', ip, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many cards created from this network. Please try again later.' },
        { status: 429 }
      );
    }

    currentPhase = 'INPUT_VALIDATION';
    const { displayName, handle, pin } = await req.json().catch(() => ({}));

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

    console.log('[CLAIM Phase 2/6] Input validated for handle:', cleanHandle);

    currentPhase = 'HANDLE_AVAILABILITY_CHECK';
    // 2. Check handle availability (case-insensitive check)
    const existingUser = await db.user.findFirst({
      where: {
        handle: {
          equals: cleanHandle,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      console.warn('[CLAIM Phase 2/6] Handle conflict:', cleanHandle);
      return NextResponse.json(
        { error: `The username @${cleanHandle} is already claimed. Try another.` },
        { status: 409 }
      );
    }

    currentPhase = 'CRYPTO_PREP';
    // 3. Hash PIN
    const hashedPin = await hashPin(cleanPin);

    // 4. Generate unique Card details (16M+ unique combinations)
    const cardSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const cardNumber = `FC-${cardSuffix}-2026`;
    const newUserId = randomUUID();
    const todayKey = getLagosDayKey();

    currentPhase = 'TRANSACTION_CREATE_USER';
    console.log('[CLAIM Phase 3/6] Starting DB transaction for user:', { newUserId, cleanHandle, cardNumber });
    // 5. Create user and Facecard in transaction
    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          id: newUserId,
          displayName: cleanName,
          handle: cleanHandle,
          pinHash: hashedPin,
          tier: 'CLASSIC',
          lifetimePoints: 0,
          spendableBalance: 0,
          ageConfirmedAt: new Date(),
          consentAt: new Date(),
          consentVersion: '1.0-NDPA',
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
        } as Parameters<typeof tx.user.create>[0]['data'],
        include: {
          cards: true,
          streak: true,
        },
      });

      // Credit welcome points to ledger via single source of truth
      await grantSignupBonus(tx, newUserId);

      const freshUser = await tx.user.findUnique({
        where: { id: newUserId },
        include: { cards: true, streak: true },
      });

      return freshUser || createdUser;
    });

    console.log('[CLAIM Phase 4/6] Transaction committed successfully for user:', user.id);

    currentPhase = 'RECORD_ATTEMPT';
    await recordAttempt('card_claim_ip', ip);

    currentPhase = 'CREATE_SESSION';
    console.log('[CLAIM Phase 5/6] Issuing session token for user:', user.id);
    // 6. Issue an opaque server-side session & response
    const sessionToken = await createSession(user.id, {
      ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    currentPhase = 'RESPONSE_PREPARATION';
    console.log('[CLAIM Phase 6/6] Claim complete. Setting session cookie.');
    const response = NextResponse.json({
      success: true,
      message: 'Facecard successfully claimed!',
      user: {
        id: user.id,
        displayName: user.displayName,
        handle: `@${user.handle}`,
        tier: user.tier,
        lifetimePoints: user.lifetimePoints,
        spendableBalance: user.spendableBalance,
        streakDays: (user as unknown as { streak?: { currentCount?: number } | null })?.streak?.currentCount ?? 1,
        cardNumber,
      },
    });

    return applySessionCookie(response, sessionToken);
  } catch (error) {
    console.error(`[CLAIM ERROR at phase: ${currentPhase}]:`, error);
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'This username is already taken. Please choose another username.' },
        { status: 409 }
      );
    }
    const message = error instanceof Error && error.message ? error.message : 'Failed to claim Facecard. Please try again.';
    return NextResponse.json(
      {
        error: message,
        phase: currentPhase,
        ...(process.env.NODE_ENV !== 'production' && error instanceof Error ? { stack: error.stack } : {}),
      },
      { status: 400 }
    );
  }
}
