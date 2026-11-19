import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { Band, Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

const SaveScanSchema = z.object({
  scanId: z.string().uuid().optional().nullable(),
  score: z.number().int().min(0).max(100),
  band: z.enum(['HARMLESS', 'SUSPICIOUS', 'DANGEROUS', 'LETHAL']),
  tier: z.enum(['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']),
  verdictLine: z.string().max(400).optional().nullable(),
  categoryScores: z.record(z.unknown()).optional().nullable(),
  imageDataUrl: z
    .string()
    .max(2_200_000, 'Image payload is too large (max ~1.5 MB).')
    .refine(
      (val) => /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(val),
      'Invalid image format'
    ),
  caption: z.string().max(160).optional().nullable(),
});

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db.savedScan.findMany({
      where: { userId: sessionUser.id },
      orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    });

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        scanId: item.scanId,
        score: item.score,
        band: item.band,
        tier: item.tier,
        verdictLine: item.verdictLine,
        categoryScores: item.categoryScores,
        imageDataUrl: item.imageDataUrl,
        caption: item.caption,
        isFavorite: item.isFavorite,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load saved scans',
        message: error instanceof Error ? error.message : 'Error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = SaveScanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid saved scan payload' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.scanId) {
      const existing = await db.savedScan.findFirst({
        where: { userId: sessionUser.id, scanId: data.scanId },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          alreadySaved: true,
          item: {
            id: existing.id,
            scanId: existing.scanId,
            score: existing.score,
            band: existing.band,
            tier: existing.tier,
            verdictLine: existing.verdictLine,
            categoryScores: existing.categoryScores,
            imageDataUrl: existing.imageDataUrl,
            caption: existing.caption,
            isFavorite: existing.isFavorite,
            createdAt: existing.createdAt.toISOString(),
          },
        });
      }
    }

    const created = await db.savedScan.create({
      data: {
        userId: sessionUser.id,
        scanId: data.scanId ?? null,
        score: data.score,
        band: data.band as Band,
        tier: data.tier as Tier,
        verdictLine: data.verdictLine ?? null,
        categoryScores: (data.categoryScores ?? undefined) as object | undefined,
        imageDataUrl: data.imageDataUrl,
        caption: data.caption?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        alreadySaved: false,
        item: {
          id: created.id,
          scanId: created.scanId,
          score: created.score,
          band: created.band,
          tier: created.tier,
          verdictLine: created.verdictLine,
          categoryScores: created.categoryScores,
          imageDataUrl: created.imageDataUrl,
          caption: created.caption,
          isFavorite: created.isFavorite,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to save scan to gallery',
        message: error instanceof Error ? error.message : 'Error',
      },
      { status: 500 }
    );
  }
}
