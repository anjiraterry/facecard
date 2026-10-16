import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { verifyOtpCode } from '@/lib/auth/otp';
import { getClientIp } from '@/lib/auth/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, code } = await req.json();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Ownership proof: a code issued to this address via /api/auth/otp/send
    const verification = await verifyOtpCode(cleanEmail, String(code ?? ''), getClientIp(req));
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.reason || 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // Check if email already in use by another user
    const existing = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: 'This email is already associated with another Facecard.' },
        { status: 409 }
      );
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { email: cleanEmail },
    });

    return NextResponse.json({
      success: true,
      message: 'Email linked successfully to your Facecard.',
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        handle: updated.handle,
      },
    });
  } catch (error) {
    console.error('Error linking email:', error);
    return NextResponse.json(
      { error: 'Failed to link email. Please try again.' },
      { status: 500 }
    );
  }
}
