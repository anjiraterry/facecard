import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth/session';
import { joinFaceOff, FaceOffError } from '@/lib/faceoff';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: duelId } = await params;
    const user = await getRequiredUser();

    const duel = await joinFaceOff(duelId, user.id);

    return NextResponse.json({
      success: true,
      duelId: duel?.id ?? duelId,
      status: duel?.status ?? 'ACTIVE',
      message: 'You have entered the Arena duel! Complete your selfie scan to lock in your score.',
      attemptsRemaining: 3,
    });
  } catch (error) {
    if (error instanceof FaceOffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to join duel in database', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
