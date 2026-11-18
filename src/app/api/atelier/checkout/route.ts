import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { AtelierOrderError, createCheckoutAndOrder } from '@/lib/atelier/orders';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';
import { hashRequest, parseIdempotencyKey, runIdempotent } from '@/lib/idempotency';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const idempotencyKey = parseIdempotencyKey(req);
    if (!idempotencyKey) {
      return jsonResponse({ error: 'A valid Idempotency-Key header is required.' }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const addressId = typeof body.addressId === 'string' ? body.addressId.trim() : '';
    if (!addressId) {
      return jsonResponse({ error: 'addressId is required' }, 400);
    }

    const result = await runIdempotent(
      user.id,
      'atelier-checkout',
      idempotencyKey,
      hashRequest({ addressId }),
      async () => {
        const created = await createCheckoutAndOrder({ userId: user.id, addressId });
        return {
          status: 201,
          body: toJsonSafe({ success: true, checkout: created.checkout, order: created.order }),
        };
      }
    );

    return jsonResponse(result.body, result.status);
  } catch (error) {
    if (error instanceof AtelierOrderError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse(
      { error: 'Checkout failed', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
