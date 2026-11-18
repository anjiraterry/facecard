import { NextRequest, NextResponse } from 'next/server';
import { ConsentPurpose } from '@prisma/client';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';

const VALID_PURPOSES = new Set<ConsentPurpose>([
  'AGE_CONFIRMATION',
  'TERMS_PRIVACY',
  'PORTRAIT_PROCESSING',
  'SKINCARE_PERSONALISATION',
  'PUBLIC_SHARE',
]);

export async function GET() {
  try {
    const user = await getRequiredUser();
    const records = await db.consentRecord.findMany({
      where: { userId: user.id },
      orderBy: { grantedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      ageConfirmedAt: user.ageConfirmedAt,
      consentAt: user.consentAt,
      consentVersion: user.consentVersion,
      records,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized', message: error instanceof Error ? error.message : 'Error' },
      { status: 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ageConfirmed,
      consentVersion = '1.0-NDPA',
      biometricConsent,
      purposes,
    } = body as {
      ageConfirmed?: boolean;
      consentVersion?: string;
      biometricConsent?: boolean;
      purposes?: ConsentPurpose[];
    };

    if (ageConfirmed !== true) {
      return NextResponse.json(
        { error: 'Explicit age confirmation (18+) is required to use Face Card' },
        { status: 400 }
      );
    }

    const user = await getRequiredUser();
    const now = new Date();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = req.headers.get('user-agent') || null;

    const grantedPurposes = new Set<ConsentPurpose>(['AGE_CONFIRMATION', 'TERMS_PRIVACY']);
    if (biometricConsent === true) {
      grantedPurposes.add('PORTRAIT_PROCESSING');
    }
    if (Array.isArray(purposes)) {
      for (const p of purposes) {
        if (VALID_PURPOSES.has(p)) grantedPurposes.add(p);
      }
    }

    const records = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          ageConfirmedAt: user.ageConfirmedAt ?? now,
          consentAt: now,
          consentVersion,
        },
      });

      const created = [];
      for (const purpose of grantedPurposes) {
        created.push(
          await tx.consentRecord.create({
            data: {
              userId: user.id,
              purpose,
              version: consentVersion,
              grantedAt: now,
              ip,
              userAgent,
            },
          })
        );
      }
      return created;
    });

    return NextResponse.json({
      success: true,
      consentRecorded: {
        userId: user.id,
        ageConfirmedAt: (user.ageConfirmedAt ?? now).toISOString(),
        consentVersion,
        purposes: Array.from(grantedPurposes),
        recordsCount: records.length,
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

export async function DELETE(req: NextRequest) {
  try {
    const user = await getRequiredUser();
    const { purpose } = (await req.json()) as { purpose?: ConsentPurpose };

    if (!purpose || !VALID_PURPOSES.has(purpose)) {
      return NextResponse.json({ error: 'Valid consent purpose is required' }, { status: 400 });
    }

    const now = new Date();
    const result = await db.consentRecord.updateMany({
      where: { userId: user.id, purpose, withdrawnAt: null },
      data: { withdrawnAt: now },
    });

    return NextResponse.json({
      success: true,
      purpose,
      withdrawnCount: result.count,
      withdrawnAt: now.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to withdraw consent', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
