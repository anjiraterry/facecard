import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPin } from '@/lib/auth/pin';

export async function POST(req: NextRequest) {
  try {
    const { identifier, pin } = await req.json();

    const cleanIdentifier = (identifier || '').replace(/^@/, '').trim();
    const cleanPin = (pin || '').trim();

    if (!cleanIdentifier || !cleanPin) {
      return NextResponse.json(
        { error: 'Username/card number and PIN are required.' },
        { status: 400 }
      );
    }

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

    if (!user) {
      return NextResponse.json(
        { error: 'Facecard not found for this username or card number.' },
        { status: 404 }
      );
    }

    if (!user.pinHash) {
      return NextResponse.json(
        { error: 'This card does not have a PIN configured yet. Please sign in via email or contact support.' },
        { status: 400 }
      );
    }

    const isValid = await verifyPin(cleanPin, user.pinHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect PIN. Please try again.' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionToken = `fc_sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;

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

    // Set cookies
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
    console.error('Error during PIN login:', error);
    return NextResponse.json(
      { error: 'Sign-in failed. Please try again.' },
      { status: 500 }
    );
  }
}
