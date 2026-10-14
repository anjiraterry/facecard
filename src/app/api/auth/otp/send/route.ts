import { NextRequest, NextResponse } from 'next/server';

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    if (!NEON_AUTH_BASE_URL) {
      return NextResponse.json({ error: 'Auth service not configured' }, { status: 503 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Forward to Neon Auth's Email OTP endpoint.
    // Neon Managed Auth sends the 6-digit code via its shared SMTP (auth@mail.myneon.app).
    // No email provider setup needed — Neon handles delivery.
    const neonResponse = await fetch(
      `${NEON_AUTH_BASE_URL}/email-otp/send-verification-otp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          type: 'sign-in',
        }),
      }
    );

    if (!neonResponse.ok) {
      const errBody = await neonResponse.json().catch(() => ({}));
      const errMsg = errBody?.message || errBody?.error || 'Failed to send OTP';
      console.error('[OTP Send] Neon Auth error:', neonResponse.status, errBody);
      return NextResponse.json({ error: errMsg }, { status: neonResponse.status });
    }

    return NextResponse.json({
      success: true,
      message: 'One-time verification code sent to your email',
      email: normalizedEmail,
      expiresInMinutes: 10,
      resendCooldownSeconds: 60,
    });
  } catch (error) {
    console.error('[OTP Send] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP code', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
