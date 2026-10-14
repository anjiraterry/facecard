import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import { verifyOtpCode } from '@/lib/auth/otp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: 'Valid 6-digit code and email required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify OTP against hashed token
    const verification = verifyOtpCode(normalizedEmail, code);
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
      user = await db.user.create({
        data: {
          id: newUserId,
          email: normalizedEmail,
          displayName: baseHandle.charAt(0).toUpperCase() + baseHandle.slice(1),
          handle,
          tier: 'CLASSIC',
          lifetimePoints: 100,
          spendableBalance: 100,
          streak: {
            create: {
              id: randomUUID(),
              currentCount: 1,
              longestCount: 1,
              lastScanDayKey: new Date().toISOString().split('T')[0],
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
    }

    // 2. Generate secure session token
    const sessionToken = `fc_sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;

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
      sessionToken,
    });

    // 3. Set HTTP-only session cookies
    response.cookies.set('fc_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set('fc_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
