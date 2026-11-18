import { NextRequest } from 'next/server';
import { SkinType } from '@prisma/client';
import { db } from '@/lib/db';
import { getRequiredUser } from '@/lib/auth/session';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await db.atelierProduct.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!product) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }

    const reviews = await db.productReview.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, displayName: true, handle: true } },
      },
    });

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
        : null;

    return jsonResponse({ success: true, reviews, averageRating, reviewCount });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load reviews', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await getRequiredUser();
    const { slug } = await params;
    const { rating, title, body, skinType } = (await req.json().catch(() => ({}))) as {
      rating?: number;
      title?: string;
      body?: string;
      skinType?: string;
    };

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return jsonResponse({ error: 'Rating must be an integer between 1 and 5' }, 400);
    }
    if (!body || body.trim().length < 5) {
      return jsonResponse({ error: 'Review body must be at least 5 characters' }, 400);
    }

    const product = await db.atelierProduct.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!product) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }

    const paidPurchase = await db.orderItem.findFirst({
      where: {
        variant: { productId: product.id },
        order: { userId: user.id, paymentStatus: 'PAID' },
      },
      select: { id: true },
    });

    const normalizedSkinType =
      skinType && Object.values(SkinType).includes(skinType.toUpperCase() as SkinType)
        ? (skinType.toUpperCase() as SkinType)
        : null;

    const review = await db.productReview.upsert({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      update: {
        rating: numericRating,
        title: title?.trim() || null,
        body: body.trim(),
        skinType: normalizedSkinType,
        verifiedPurchase: Boolean(paidPurchase),
      },
      create: {
        productId: product.id,
        userId: user.id,
        rating: numericRating,
        title: title?.trim() || null,
        body: body.trim(),
        skinType: normalizedSkinType,
        verifiedPurchase: Boolean(paidPurchase),
      },
      include: {
        user: { select: { id: true, displayName: true, handle: true } },
      },
    });

    return jsonResponse({ success: true, review }, 201);
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to submit review', message: error instanceof Error ? error.message : 'Error' },
      401
    );
  }
}
