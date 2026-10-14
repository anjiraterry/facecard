import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
          { id: publicId.length === 36 ? publicId : undefined },
        ],
      },
      include: {
        user: {
          include: {
            scans: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        scan: true,
      },
    });

    if (!shareCard) {
      return NextResponse.json({ error: 'Share card not found or expired' }, { status: 404 });
    }

    const scan = shareCard.scan ?? shareCard.user.scans[0];

    return NextResponse.json({
      success: true,
      shareCard: {
        id: shareCard.id,
        publicId: shareCard.publicId,
        score: scan?.score ?? 0,
        band: scan?.band ?? null,
        tier: shareCard.user.tier,
        cardholderName: shareCard.user.displayName.toUpperCase(),
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
    const { id: publicId } = await params;

    await db.shareCard.deleteMany({
      where: {
        OR: [
          { publicId },
          { id: publicId.length === 36 ? publicId : undefined },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Share card ${publicId} deleted from database`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete share card', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
