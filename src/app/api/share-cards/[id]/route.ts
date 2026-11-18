import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: publicId } = await params;

    const shareCard = await db.shareCard.findFirst({
      where: {
        OR: [
          { publicId },
          ...(publicId.length === 36 ? [{ id: publicId }] : []),
        ],
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            scans: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        scan: true,
        snapshot: true,
      },
    });

    if (!shareCard) {
      return NextResponse.json({ error: 'Share card not found or expired' }, { status: 404 });
    }

    const snap = shareCard.snapshot;
    const scan = shareCard.scan ?? shareCard.user.scans[0];

    return NextResponse.json({
      success: true,
      shareCard: {
        id: shareCard.id,
        publicId: shareCard.publicId,
        snapshotId: snap?.id ?? null,
        score: snap?.score ?? scan?.score ?? 0,
        band: snap?.band ?? scan?.band ?? null,
        tier: snap?.tier ?? shareCard.user.tier,
        cardholderName: (snap?.cardholderName ?? shareCard.user.displayName).toUpperCase(),
        skinSlug: snap?.skinSlug ?? 'default',
        frameSlug: snap?.frameSlug ?? 'default',
        expiresAt: shareCard.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Share card not found or expired', message: error instanceof Error ? error.message : 'Error' },
      { status: 404 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: publicId } = await params;

    const existing = await db.shareCard.findFirst({
      where: {
        OR: [
          { publicId },
          ...(publicId.length === 36 ? [{ id: publicId }] : []),
        ],
      },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Share card not found' }, { status: 404 });
    }

    if (existing.userId !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.shareCard.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `Share card ${publicId} deleted`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete share card', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
