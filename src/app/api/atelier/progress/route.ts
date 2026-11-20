import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const entries = await db.skinProgressEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    return jsonResponse({ success: true, entries });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load progress journal', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const adherencePercent =
      typeof body.adherencePercent === 'number'
        ? Math.max(0, Math.min(100, Math.round(body.adherencePercent)))
        : null;
    const userNotes = typeof body.userNotes === 'string' ? body.userNotes.trim().slice(0, 600) : null;
    const productsUsed = Array.isArray(body.productsUsed)
      ? body.productsUsed.filter((p: unknown): p is string => typeof p === 'string').slice(0, 15)
      : [];

    const captureConditions =
      body.captureConditions && typeof body.captureConditions === 'object' ? body.captureConditions : null;
    const comparisonEligible = Boolean(
      captureConditions &&
        (captureConditions as { lightingMatched?: boolean }).lightingMatched &&
        !(captureConditions as { makeupPresent?: boolean }).makeupPresent
    );

    const entry = await db.skinProgressEntry.create({
      data: {
        userId: user.id,
        routineId: typeof body.routineId === 'string' ? body.routineId : null,
        adherencePercent,
        userNotes,
        productsUsed,
        captureConditions: captureConditions ?? undefined,
        observationVersion: 'v2.1-observation',
        comparisonEligible,
      },
    });

    return jsonResponse({ success: true, entry }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to save progress entry', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const entryId = new URL(req.url).searchParams.get('id');
    if (entryId) {
      await db.skinProgressEntry.deleteMany({
        where: { id: entryId, userId: user.id },
      });
    } else {
      await db.skinProgressEntry.deleteMany({
        where: { userId: user.id },
      });
    }

    return jsonResponse({ success: true, message: 'Progress entry data deleted' });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to delete progress entry', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
