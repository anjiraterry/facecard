import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { AtelierOrderError, createCheckoutAndOrder } from '@/lib/atelier/orders';
import { jsonResponse, toJsonSafe } from '@/lib/atelier/serialize';

const GuestBuySchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
  email: z.string().trim().email('Valid email is required'),
  recipientName: z.string().trim().min(2, 'Full name is required').max(120),
  phone: z.string().trim().min(7, 'Phone number is required').max(30),
  streetLine1: z.string().trim().min(5, 'Delivery street address is required').max(240),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State is required').max(100),
  deliveryZoneId: z.string().uuid().optional().nullable(),
  callbackUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = GuestBuySchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: parsed.error.issues[0]?.message || 'Invalid checkout details' },
        400
      );
    }

    const data = parsed.data;
    const cleanEmail = data.email.toLowerCase();

    const sessionUser = await getSessionUser();
    let userId = sessionUser?.id;

    if (!userId) {
      const existingByEmail = await db.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true },
      });

      if (existingByEmail) {
        userId = existingByEmail.id;
      } else {
        const guestUser = await db.user.create({
          data: {
            email: cleanEmail,
            displayName: data.recipientName,
          },
          select: { id: true },
        });
        userId = guestUser.id;
      }
    }

    const variant = await db.productVariant.findUnique({
      where: { id: data.variantId },
      select: { id: true, priceMinor: true },
    });
    if (!variant) {
      return jsonResponse({ error: 'Product variant not found' }, 404);
    }

    // Create a fresh active bag for this instant purchase so we don't collide with any saved bag
    await db.shoppingBag.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'ABANDONED' },
    });

    await db.shoppingBag.create({
      data: {
        userId,
        status: 'ACTIVE',
        items: {
          create: {
            variantId: variant.id,
            quantity: data.quantity,
          },
        },
      },
    });

    const address = await db.address.create({
      data: {
        userId,
        label: 'Guest Express',
        recipientName: data.recipientName,
        phone: data.phone,
        line1: data.streetLine1,
        city: data.city,
        state: data.state,
        isDefault: false,
      },
      select: { id: true },
    });

    const created = await createCheckoutAndOrder({ userId, addressId: address.id });
    const order = created.order;

    const reference = `atl_${order.orderNumber}_${crypto.randomBytes(4).toString('hex')}`;
    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

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
      return jsonResponse(
        toJsonSafe({
          success: true,
          mode: 'mock',
          reference: txRecord.reference,
          authorizationUrl: null,
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            totalMinor: Number(order.totalMinor),
            shippingMinor: Number(order.shippingMinor),
            subtotalMinor: Number(order.subtotalMinor),
            currency: order.currency,
          },
        }),
        201
      );
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        amount: Number(order.totalMinor),
        currency: order.currency,
        reference,
        callback_url: data.callbackUrl,
        metadata: { orderId: order.id, userId, guest: !sessionUser, domain: 'ATELIER' },
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

    const paystackData = (await paystackRes.json()) as {
      data?: { authorization_url?: string };
    };

    return jsonResponse(
      toJsonSafe({
        success: true,
        mode: 'paystack',
        reference: txRecord.reference,
        authorizationUrl: paystackData.data?.authorization_url ?? null,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalMinor: Number(order.totalMinor),
          shippingMinor: Number(order.shippingMinor),
          subtotalMinor: Number(order.subtotalMinor),
          currency: order.currency,
        },
      }),
      201
    );
  } catch (error) {
    if (error instanceof AtelierOrderError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse(
      { error: 'Guest purchase failed', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
