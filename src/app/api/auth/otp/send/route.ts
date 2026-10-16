import { NextRequest, NextResponse } from 'next/server';
import { createAndSendOtp } from '@/lib/auth/otp';
import { getClientIp } from '@/lib/auth/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const result = await createAndSendOtp(email, getClientIp(req));

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, cooldownSeconds: result.cooldownSeconds },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      email: email.trim().toLowerCase(),
      expiresInMinutes: 10,
      resendCooldownSeconds: 60,
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : '';
    const isClientError = /disposable|temporary/i.test(raw);
    if (!isClientError) console.error('OTP send failed:', raw);
    return NextResponse.json(
      { error: isClientError ? raw : 'Could not send a code right now. Please try again.' },
      { status: isClientError ? 400 : 500 }
    );
  }
}
