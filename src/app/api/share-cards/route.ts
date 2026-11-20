import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';
import { getStreakMultiplier } from '@/lib/scoring';
import { consumeExportEntitlement, getActiveFeatureEntitlement } from '@/lib/boutique/effects';

export async function POST(req: NextRequest) {
  try {
    const user = await getRequiredUser();
    const { cardId, scanId, format = '1080x1920', template = 'STANDARD', score: bodyScore, tier: bodyTier } = await req.json();

    const [activeCard, streak, latestScan] = await Promise.all([
      db.card.findFirst({
        where: { userId: user.id },
        include: {
          equippedSkin: { select: { slug: true } },
          equippedFrame: { select: { slug: true } },
        },
      }),
      db.streak.findUnique({ where: { userId: user.id } }),
      scanId
        ? db.scan.findFirst({ where: { id: scanId, userId: user.id } })
        : db.scan.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    ]);

    const exportFeatureKey =
      template === 'PREMIUM_SHARE_STUDIO' || template === 'ARENA_VICTORY_PORTRAIT' ? template : null;
    if (exportFeatureKey) {
      const entitlement = await getActiveFeatureEntitlement(user.id, exportFeatureKey);
      if (!entitlement) {
        return NextResponse.json(
          { error: `An active ${exportFeatureKey === 'PREMIUM_SHARE_STUDIO' ? 'Share Studio Pass' : 'Victory Portrait'} is required for this template.` },
          { status: 403 }
        );
      }
    }

    const snapshotScore = typeof bodyScore === 'number' ? bodyScore : latestScan?.score ?? 0;
    const snapshotTier = user.tier;
    const streakDays = streak?.currentCount ?? 0;
    const multiplier = getStreakMultiplier(streakDays);
    const title =
      snapshotTier === 'BLACK'
        ? 'Velvet Matte'
        : snapshotTier === 'PLATINUM'
        ? 'Pearlescent'
        : snapshotTier === 'GOLD'
        ? 'Brushed Gold'
        : 'Classic';

    const publicId = `sc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    const equippedTheme = activeCard?.equippedThemeId
      ? await db.cardTheme.findUnique({ where: { themeId: activeCard.equippedThemeId } })
      : null;

    const { shareCard, snapshot } = await db.$transaction(async (tx) => {
      const snap = await tx.cardSnapshot.create({
        data: {
          userId: user.id,
          cardId: cardId || activeCard?.cardNumber || user.id,
          cardholderName: user.displayName,
          handle: user.handle,
          tier: snapshotTier,
          score: snapshotScore,
          band: latestScan?.band ?? null,
          title,
          skinSlug: activeCard?.equippedSkin?.slug ?? activeCard?.equippedSkinId ?? 'default',
          frameSlug: activeCard?.equippedFrame?.slug ?? activeCard?.equippedFrameId ?? 'default',
          themeId: equippedTheme?.themeId ?? activeCard?.equippedThemeId ?? null,
          themeVersion: equippedTheme?.version ?? null,
          themeSnapshot: equippedTheme
            ? {
                themeId: equippedTheme.themeId,
                name: equippedTheme.name,
                version: equippedTheme.version,
                backgroundAssetVersionId: equippedTheme.backgroundAssetVersionId,
                backgroundImageUrl: equippedTheme.backgroundImageUrl,
                textColor: equippedTheme.textColor,
                accentColor: equippedTheme.accentColor,
                material: equippedTheme.material,
                paletteFrom: equippedTheme.paletteFrom,
                paletteTo: equippedTheme.paletteTo,
              }
            : undefined,
          streakDays,
          multiplier,
          templateVersion: exportFeatureKey ? `${exportFeatureKey}:1.0` : '1.0',
        },
      });

      const sc = await tx.shareCard.create({
        data: {
          userId: user.id,
          publicId,
          scanId: latestScan?.id ?? null,
          snapshotId: snap.id,
          blobKey: publicId,
          expiresAt,
        },
      });

      return { shareCard: sc, snapshot: snap };
    });

    if (exportFeatureKey) {
      await consumeExportEntitlement({
        userId: user.id,
        featureKey: exportFeatureKey,
        eventId: `share:${shareCard.publicId}`,
        targetModule: 'SHARE',
      });
    }

    return NextResponse.json({
      success: true,
      publicId: shareCard.publicId,
      snapshotId: snapshot.id,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/s/${shareCard.publicId}`,
      expiresAt: shareCard.expiresAt.toISOString(),
      metadata: {
        format,
        score: snapshot.score,
        tier: bodyTier || snapshot.tier,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create share card in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
