import { NextRequest, NextResponse } from 'next/server';
import { requireStaffPermission, StaffAuthError } from '@/lib/admin/auth';
import {
  createEffectLabState,
  stepEffectLab,
  type EffectLabState,
} from '@/lib/boutique/effectRegistry';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireStaffPermission('boutique.effects.inspect');
    const body = (await req.json().catch(() => ({}))) as {
      mode?: EffectLabState['mode'];
      state?: EffectLabState;
      action?: 'RESET' | 'ACTIVATE' | 'SIMULATE_EVENT' | 'ADVANCE_1H' | 'ADVANCE_6H' | 'EXPIRE';
    };

    const mode = body.mode || 'AURA_CHARGE';
    if (!body.state || body.action === 'RESET') {
      return NextResponse.json({ success: true, state: createEffectLabState(mode) });
    }

    const nextState = stepEffectLab(body.state, body.action || 'ACTIVATE');
    return NextResponse.json({ success: true, state: nextState });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Effect Lab simulation failed' }, { status: 500 });
  }
}
