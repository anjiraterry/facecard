import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPin, verifyPin } from '@/lib/auth/pin';
import { getClientIp, isRateLimited, recordAttempt } from '@/lib/auth/rateLimit';
import { applySessionCookie, createSession } from '@/lib/auth/sessions';

export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IDENTIFIER = 5;
const MAX_FAILS_PER_IP = 20;

const INVALID_CREDENTIALS = 'Incorrect username/card number or PIN.';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cleanIdentifier = String(body.identifier ?? '').replace(/^@/, '').trim().toLowerCase().slice(0, 64);
    const cleanPin = String(body.pin ?? '').trim();

    if (!cleanIdentifier || !cleanPin) {
      return NextResponse.json(
        { error: 'Username/card number and PIN are required.' },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);

    // Throttle brute force per target account and per source IP
    const [identifierLocked, ipLocked] = await Promise.all([
      isRateLimited('pin_fail_id', cleanIdentifier, MAX_FAILS_PER_IDENTIFIER, WINDOW_MS),
      isRateLimited('pin_fail_ip', ip, MAX_FAILS_PER_IP, WINDOW_MS),
    ]);
    if (identifierLocked || ipLocked) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    const fail = async () => {
      await Promise.all([recordAttempt('pin_fail_id', cleanIdentifier), recordAttempt('pin_fail_ip', ip)]);
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    };

    // Find user by handle or by card number
    const user = await db.user.findFirst({
      where: {
        OR: [
          { handle: { equals: cleanIdentifier, mode: 'insensitive' } },
          { cards: { some: { cardNumber: { equals: cleanIdentifier, mode: 'insensitive' } } } },
        ],
      },
      include: {
        cards: true,
        streak: true,
      },
    });

    // Same response and comparable work for unknown / PIN-less accounts (no user enumeration)
    if (!user || !user.pinHash) {
      await hashPin(cleanPin);
      return fail();
    }

    if (user.status === 'BANNED' || user.status === 'DELETED') {
      return fail();
    }

    const isValid = await verifyPin(cleanPin, user.pinHash);
    if (!isValid) {
      return fail();
    }

    const sessionToken = await createSession(user.id, {
      ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Access granted.',
      user: {
        id: user.id,
        displayName: user.displayName,
        handle: user.handle ? `@${user.handle}` : `@${user.displayName.toLowerCase()}`,
        tier: user.tier,
        lifetimePoints: user.lifetimePoints,
        spendableBalance: user.spendableBalance,
        streakDays: user.streak?.currentCount ?? 1,
        cardNumber: user.cards[0]?.cardNumber ?? '',
      },
    });

    return applySessionCookie(response, sessionToken);
  } catch (error) {
    console.error('Error during PIN login:', error);
    return NextResponse.json(
      { error: 'Sign-in failed. Please try again.' },
      { status: 500 }
    );
  }
}
