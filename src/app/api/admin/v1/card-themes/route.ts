import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/admin/auth';
import {
  bootstrapCardThemes,
  recordThemeVersionSnapshot,
  serializeCardTheme,
  validateThemeContrast,
} from '@/lib/card/themes';
import { CardThemeStatus, ThemeAcquisition, ThemeMaterial, Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('boutique.items.read');
    await bootstrapCardThemes();
    const themes = await db.cardTheme.findMany({
      include: { versions: { orderBy: { version: 'desc' }, take: 5 } },
      orderBy: [{ minimumTier: 'asc' }, { pricePoints: 'asc' }],
    });
    return NextResponse.json({ success: true, themes });
  } catch (error) {
    console.error('Admin get card themes error:', error);
    return NextResponse.json({ error: 'Failed to load card themes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('boutique.items.create');
    const body = await req.json().catch(() => ({}));

    const themeId = typeof body.themeId === 'string' ? body.themeId.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const collectionName = typeof body.collectionName === 'string' ? body.collectionName.trim() : 'The Essentials';
    const minimumTier = (['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK'].includes(body.minimumTier)
      ? body.minimumTier
      : 'CLASSIC') as Tier;
    const acquisition = (['TIER_UNLOCK', 'POINTS_PURCHASE', 'ACHIEVEMENT', 'STAFF_GRANT'].includes(body.acquisition)
      ? body.acquisition
      : 'POINTS_PURCHASE') as ThemeAcquisition;
    const pricePoints = typeof body.pricePoints === 'number' && body.pricePoints >= 0 ? Math.round(body.pricePoints) : 500;
    const textColor = typeof body.textColor === 'string' ? body.textColor.trim() : '#FAF7F4';
    const accentColor = typeof body.accentColor === 'string' ? body.accentColor.trim() : '#EBDCD5';
    const paletteFrom = typeof body.paletteFrom === 'string' ? body.paletteFrom.trim() : '#96788D';
    const paletteTo = typeof body.paletteTo === 'string' ? body.paletteTo.trim() : '#65475D';
    const material = (['SATIN', 'BRUSHED_METAL', 'PEARLESCENT', 'CERAMIC', 'GLASS', 'STONE'].includes(body.material)
      ? body.material
      : 'SATIN') as ThemeMaterial;
    const status = (['DRAFT', 'PUBLISHED', 'RETIRED'].includes(body.status)
      ? body.status
      : 'PUBLISHED') as CardThemeStatus;

    if (!themeId || !name || !description) {
      return NextResponse.json({ error: 'themeId, name, and description are required' }, { status: 400 });
    }

    const contrast = validateThemeContrast(textColor, paletteFrom, paletteTo);
    if (!contrast.valid) {
      return NextResponse.json(
        { error: `WCAG AA contrast validation failed (${contrast.minRatio.toFixed(2)}:1 < 4.5:1).` },
        { status: 400 }
      );
    }

    const created = await db.$transaction(async (tx) => {
      const existing = await tx.cardTheme.findUnique({ where: { themeId } });
      const nextVersion = existing ? existing.version + 1 : 1;

      const theme = await tx.cardTheme.upsert({
        where: { themeId },
        update: {
          name,
          description,
          collectionName,
          minimumTier,
          acquisition,
          pricePoints,
          status,
          textColor,
          accentColor,
          paletteFrom,
          paletteTo,
          material,
          backgroundImageUrl: typeof body.backgroundImageUrl === 'string' ? body.backgroundImageUrl.trim() || null : undefined,
          backgroundAssetVersionId: `${themeId}-v${nextVersion}`,
          previewAssetVersionId: `${themeId}-preview-v${nextVersion}`,
          version: nextVersion,
        },
        create: {
          themeId,
          slug: themeId,
          name,
          description,
          collectionName,
          minimumTier,
          acquisition,
          pricePoints,
          status,
          textColor,
          mutedTextColor: textColor,
          accentColor,
          paletteFrom,
          paletteTo,
          material,
          backgroundImageUrl: typeof body.backgroundImageUrl === 'string' ? body.backgroundImageUrl.trim() || null : null,
          backgroundAssetVersionId: `${themeId}-v1`,
          previewAssetVersionId: `${themeId}-preview-v1`,
          version: 1,
        },
      });

      await recordThemeVersionSnapshot(tx, theme.id, theme.version, serializeCardTheme(theme), staff.id);

      await tx.staffAuditLog.create({
        data: {
          staffUserId: staff.id,
          action: existing ? 'CARD_THEME_UPDATED' : 'CARD_THEME_CREATED',
          targetType: 'CardTheme',
          targetId: theme.id,
          detail: { themeId: theme.themeId, version: theme.version, status: theme.status },
        },
      });

      return theme;
    });

    return NextResponse.json({ success: true, theme: created, contrastRatio: contrast.minRatio });
  } catch (error) {
    console.error('Admin upsert card theme error:', error);
    return NextResponse.json({ error: 'Failed to save card theme' }, { status: 500 });
  }
}
