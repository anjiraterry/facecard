import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const callbackUrl = typeof body.callbackUrl === 'string' ? body.callbackUrl.trim() : undefined;

    if (!orderId) return jsonResponse({ error: 'orderId is required' }, 400);

    const order = await db.order.findFirst({
      where: { id: orderId, userId: user.id },
    });
    if (!order) return jsonResponse({ error: 'Order not found' }, 404);
    if (order.paymentStatus === PaymentStatus.PAID) {
      return jsonResponse({ error: 'Order is already paid' }, 400);
    }

    const email = user.email || `${user.id}@atelier.facecard.app`;
    const reference = `atl_${order.orderNumber}_${crypto.randomBytes(4).toString('hex')}`;
    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

    // Create PaymentTransaction BEFORE external Paystack call
    const txRecord = await db.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.PAYSTACK,
        reference,
        amountMinor: order.totalMinor,
        currency: order.currency,
        status: PaymentStatus.PENDING,
      },
    });

    if (!secretKey) {
      return jsonResponse({
        success: true,
        reference: txRecord.reference,
        authorizationUrl: `https://checkout.paystack.com/mock-${txRecord.reference}`,
        mode: 'mock',
      });
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Number(order.totalMinor),
        currency: order.currency,
        reference,
        callback_url: callbackUrl,
        metadata: { orderId: order.id, userId: user.id, domain: 'ATELIER' },
      }),
    });

    if (!paystackRes.ok) {
      const errText = await paystackRes.text();
      await db.paymentTransaction.update({
        where: { id: txRecord.id },
        data: { status: PaymentStatus.FAILED, failureReason: errText.slice(0, 500) },
      });
      return jsonResponse({ error: `Paystack initialization failed (${paystackRes.status})` }, 502);
    }

    const data = (await paystackRes.json()) as {
      data?: { authorization_url?: string; access_code?: string; reference?: string };
    };

    return jsonResponse({
      success: true,
      reference: data.data?.reference || reference,
      authorizationUrl: data.data?.authorization_url,
      accessCode: data.data?.access_code,
    });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to initialize payment', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
