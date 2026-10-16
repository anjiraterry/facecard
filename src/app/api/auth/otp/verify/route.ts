import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { verifyOtpCode } from '@/lib/auth/otp';
import { getClientIp } from '@/lib/auth/rateLimit';
import { applySessionCookie, createSession } from '@/lib/auth/sessions';
import { grantSignupBonus } from '@/lib/ledger';
import { getLagosDayKey } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email : '';
    const code = typeof body.code === 'string' ? body.code : '';

    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Valid 6-digit code and email required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ip = getClientIp(req);

    // Verify OTP against the persisted, hashed, single-use challenge
    const verification = await verifyOtpCode(normalizedEmail, code, ip);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.reason || 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // 1. Find or create user in Neon Postgres
    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { streak: true, cards: true },
    });

    if (user && (user.status === 'BANNED' || user.status === 'DELETED')) {
      return NextResponse.json({ error: 'This account is not available.' }, { status: 403 });
    }

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const baseHandle = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
      let handle = baseHandle;
      let counter = 1;
      while (await db.user.findUnique({ where: { handle } })) {
        handle = `${baseHandle}${counter++}`;
      }

      const newUserId = randomUUID();
      user = await db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            id: newUserId,
            email: normalizedEmail,
            displayName: baseHandle.charAt(0).toUpperCase() + baseHandle.slice(1),
            handle,
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
                lastScanDayKey: getLagosDayKey(),
                freezesHeld: 0,
              },
            },
            cards: {
              create: {
                id: randomUUID(),
                cardNumber: `FC-${Math.floor(1000 + Math.random() * 9000)}-2026`,
              },
            },
          },
          include: { streak: true, cards: true },
        });

        await grantSignupBonus(tx, newUserId);

        const fresh = await tx.user.findUnique({
          where: { id: newUserId },
          include: { streak: true, cards: true },
        });
        return fresh || created;
      });
    }

    // 2. Issue an opaque server-side session (only its hash is stored)
    const sessionToken = await createSession(user.id, {
      ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    const response = NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        handle: user.handle ? `@${user.handle.replace(/^@/, '')}` : `@${user.displayName.toLowerCase()}`,
        tier: user.tier,
        lifetimePoints: user.lifetimePoints,
        spendableBalance: user.spendableBalance,
        streakDays: user.streak?.currentCount ?? 1,
      },
    });

    // 3. Set the HTTP-only session cookie
    return applySessionCookie(response, sessionToken);
  } catch (error) {
    console.error('OTP verification failed:', error);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
