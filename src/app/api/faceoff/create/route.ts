import { NextRequest, NextResponse } from 'next/server';
import { EconomyConfig } from '@/lib/economy';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';
import { FaceOffMode, FaceOffStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await getRequiredUser();
    const { 
      mode = 'STAKED', 
      stakeAmount = 100, 
      opponentHandle, 
    } = await req.json();

    const isStaked = mode === 'STAKED';
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + EconomyConfig.ARENA.EXPIRY_MINUTES * 60 * 1000);

    const faceOff = await db.faceOff.create({
      data: {
        challengerId: user.id,
        inviteCode,
        mode: isStaked ? FaceOffMode.STAKED : FaceOffMode.FRIENDLY,
        stake: isStaked ? Number(stakeAmount) : 0,
        status: FaceOffStatus.WAITING,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      duelId: faceOff.id,
      inviteCode,
      inviteUrl: `/faceoff?duel=${inviteCode}`,
      mode,
      stakeAmount: isStaked ? Number(stakeAmount) : 0,
      totalPot: isStaked ? Number(stakeAmount) * 2 : 0,
      status: 'WAITING',
      expiresInMinutes: EconomyConfig.ARENA.EXPIRY_MINUTES,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create arena duel', message: error instanceof Error ? error.message : 'Error' },
      { status: 400 }
    );
  }
}
