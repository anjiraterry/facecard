import { NextRequest } from 'next/server';
import { calculateShippingQuote } from '@/lib/atelier/orders';
import { jsonResponse } from '@/lib/atelier/serialize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const state = typeof body.state === 'string' ? body.state.trim() : '';
    if (!state) return jsonResponse({ error: 'state is required' }, 400);

    const quote = await calculateShippingQuote(state);
    return jsonResponse({ success: true, quote });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to calculate shipping quote', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
