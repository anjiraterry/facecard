import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const UpdateSavedScanSchema = z.object({
  isFavorite: z.boolean().optional(),
  caption: z.string().max(160).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.savedScan.findUnique({ where: { id } });
    if (!existing || existing.userId !== sessionUser.id) {
      return NextResponse.json({ error: 'Saved scan not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateSavedScanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
    }

    const updated = await db.savedScan.update({
      where: { id },
      data: {
        ...(parsed.data.isFavorite !== undefined ? { isFavorite: parsed.data.isFavorite } : {}),
        ...(parsed.data.caption !== undefined ? { caption: parsed.data.caption?.trim() || null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        scanId: updated.scanId,
        score: updated.score,
        band: updated.band,
        tier: updated.tier,
        verdictLine: updated.verdictLine,
        categoryScores: updated.categoryScores,
        imageDataUrl: updated.imageDataUrl,
        caption: updated.caption,
        isFavorite: updated.isFavorite,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update saved scan', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.savedScan.findUnique({ where: { id } });
    if (!existing || existing.userId !== sessionUser.id) {
      return NextResponse.json({ error: 'Saved scan not found' }, { status: 404 });
    }

    await db.savedScan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete saved scan', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
