import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const user = await getRequiredUser();
    const { cardId, format = '1080x1920', score, tier } = await req.json();

    const publicId = `sc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    const shareCard = await db.shareCard.create({
      data: {
        userId: user.id,
        publicId,
        blobKey: publicId,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      publicId: shareCard.publicId,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/s/${shareCard.publicId}`,
      expiresAt: shareCard.expiresAt.toISOString(),
      metadata: {
        format,
        score,
        tier,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create share card in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
