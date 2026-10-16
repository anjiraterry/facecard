import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getRequiredUser();
    const body = await req.json().catch(() => ({}));
    const { avatarUrl } = body;

    if (typeof avatarUrl !== 'string' || avatarUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'A valid avatarUrl or image payload is required.' },
        { status: 400 }
      );
    }

    // Limit maximum avatar payload size (~4MB)
    if (avatarUrl.length > 5_500_000) {
      return NextResponse.json(
        { error: 'Avatar image is too large. Max size is 4MB.' },
        { status: 413 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: avatarUrl.trim(),
      } as Record<string, unknown>,
      select: {
        id: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
      } as Record<string, unknown>,
    }) as unknown as { id: string; displayName: string; handle: string | null; avatarUrl?: string | null };

    return NextResponse.json({
      success: true,
      message: 'Card portrait updated successfully!',
      user: {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        handle: `@${updatedUser.handle}`,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update avatar' },
      { status: 400 }
    );
  }
}
