import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth/session';
import { FaceOffError, lockInFaceOffScore } from '@/lib/faceoff';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: duelId } = await params;
    const user = await getRequiredUser();

    const result = await lockInFaceOffScore(duelId, user.id);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FaceOffError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to lock in score', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
