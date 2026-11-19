import { NextResponse } from 'next/server';
import { requireStaffPermission, StaffAuthError } from '@/lib/admin/auth';
import { EFFECT_REGISTRY } from '@/lib/boutique/effectRegistry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('boutique.effects.inspect');
    const effectTypes = Object.values(EFFECT_REGISTRY).map((h) => ({
      kind: h.kind,
      handlerVersion: h.handlerVersion,
      label: h.label,
      description: h.description,
      allowedTargets: h.allowedTargets,
      schemaFields: h.schemaFields,
    }));
    return NextResponse.json({ success: true, effectTypes });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load effect registry' }, { status: 500 });
  }
}
