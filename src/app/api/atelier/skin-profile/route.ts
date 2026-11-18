import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';
import { RoutineExperience, RoutinePreference, SensitivityLevel, SkinType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const [profile, activeConsent] = await Promise.all([
      db.skinProfile.findUnique({
        where: { userId: user.id },
        include: {
          concerns: { include: { concern: true }, orderBy: { priority: 'asc' } },
          sensitivities: true,
        },
      }),
      db.skinConsent.findFirst({
        where: { userId: user.id, withdrawnAt: null },
        orderBy: { grantedAt: 'desc' },
      }),
    ]);

    return jsonResponse({
      success: true,
      hasConsent: Boolean(activeConsent),
      profile,
    });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load skin profile', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const activeConsent = await db.skinConsent.findFirst({
      where: { userId: user.id, withdrawnAt: null },
    });
    if (!activeConsent) {
      return jsonResponse(
        { error: 'Explicit skincare data consent is required before saving a skin profile.', requiresConsent: true },
        403
      );
    }

    const body = await req.json().catch(() => ({}));
    const skinType = Object.values(SkinType).includes(body.skinType) ? (body.skinType as SkinType) : SkinType.UNSURE;
    const sensitivityLevel = Object.values(SensitivityLevel).includes(body.sensitivityLevel)
      ? (body.sensitivityLevel as SensitivityLevel)
      : undefined;
    const experienceLevel = Object.values(RoutineExperience).includes(body.experienceLevel)
      ? (body.experienceLevel as RoutineExperience)
      : undefined;
    const routinePreference = Object.values(RoutinePreference).includes(body.routinePreference)
      ? (body.routinePreference as RoutinePreference)
      : undefined;

    const concernIds: string[] = Array.isArray(body.concernIds)
      ? body.concernIds.filter((c: unknown): c is string => typeof c === 'string')
      : [];
    const sensitivities: string[] = Array.isArray(body.sensitivities)
      ? body.sensitivities
          .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => s.trim().slice(0, 64))
      : [];

    const budgetMinMinor = body.budgetMinMinor != null ? BigInt(body.budgetMinMinor) : undefined;
    const budgetMaxMinor = body.budgetMaxMinor != null ? BigInt(body.budgetMaxMinor) : undefined;

    const profile = await db.$transaction(async (tx) => {
      const upserted = await tx.skinProfile.upsert({
        where: { userId: user.id },
        update: {
          skinType,
          sensitivityLevel,
          experienceLevel,
          routinePreference,
          budgetMinMinor,
          budgetMaxMinor,
          completedAt: new Date(),
        },
        create: {
          userId: user.id,
          skinType,
          sensitivityLevel,
          experienceLevel,
          routinePreference,
          budgetMinMinor,
          budgetMaxMinor,
          completedAt: new Date(),
        },
      });

      await tx.skinProfileConcern.deleteMany({ where: { skinProfileId: upserted.id } });
      if (concernIds.length > 0) {
        await tx.skinProfileConcern.createMany({
          data: concernIds.map((concernId, idx) => ({
            skinProfileId: upserted.id,
            concernId,
            priority: idx + 1,
          })),
          skipDuplicates: true,
        });
      }

      await tx.skinProfileSensitivity.deleteMany({ where: { skinProfileId: upserted.id } });
      if (sensitivities.length > 0) {
        await tx.skinProfileSensitivity.createMany({
          data: sensitivities.map((label) => ({
            skinProfileId: upserted.id,
            label,
          })),
          skipDuplicates: true,
        });
      }

      return tx.skinProfile.findUnique({
        where: { id: upserted.id },
        include: {
          concerns: { include: { concern: true }, orderBy: { priority: 'asc' } },
          sensitivities: true,
        },
      });
    });

    return jsonResponse({ success: true, profile });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to save skin profile', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    await db.skinProfile.deleteMany({ where: { userId: user.id } });
    return jsonResponse({ success: true, message: 'Skin profile deleted' });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to delete skin profile', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
