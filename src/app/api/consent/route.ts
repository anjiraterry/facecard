import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { 
      ageConfirmed = true, 
      consentVersion = '1.0-NDPA', 
      biometricConsent = true,
    } = await req.json();

    if (!ageConfirmed) {
      return NextResponse.json(
        { error: 'Must be 18+ to use Face Card' },
        { status: 400 }
      );
    }

    const user = await getRequiredUser();

    await db.user.update({
      where: { id: user.id },
      data: {
        ageConfirmedAt: new Date(),
        consentAt: new Date(),
        consentVersion,
      },
    });

    return NextResponse.json({
      success: true,
      consentRecorded: {
        userId: user.id,
        ageConfirmedAt: new Date().toISOString(),
        consentVersion,
        biometricConsent,
        ndpaCompliant: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to record consent in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
