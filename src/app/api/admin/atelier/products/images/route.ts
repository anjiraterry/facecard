import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recordStaffAuditLog,
  requireStaffPermission,
  StaffAuthError,
} from '@/lib/admin/auth';
import { uploadProductImage } from '@/lib/storage';
import { getClientIp } from '@/lib/auth/rateLimit';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('atelier.write');
    const formData = await req.formData();

    const productId = String(formData.get('productId') || '').trim();
    const altText = String(formData.get('altText') || '').trim() || null;
    const isPrimary = String(formData.get('isPrimary') || 'false') === 'true';
    const file = formData.get('file');

    if (!productId || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'productId and image file are required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported image format. Use JPEG, PNG, WebP, or AVIF.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image must be 5 MB or smaller.' },
        { status: 400 }
      );
    }

    const product = await db.atelierProduct.findUnique({
      where: { id: productId },
      select: { id: true, slug: true, name: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = await uploadProductImage({
      productSlug: product.slug,
      filename: file.name || 'product.jpg',
      contentType: file.type,
      body: bytes,
    });

    const image = await db.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.productImage.updateMany({
          where: { productId: product.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const existingCount = await tx.productImage.count({
        where: { productId: product.id },
      });

      return tx.productImage.create({
        data: {
          productId: product.id,
          objectKey: uploaded.url,
          altText: altText || product.name,
          sortOrder: existingCount,
          isPrimary: isPrimary || existingCount === 0,
        },
      });
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'ATELIER_PRODUCT_IMAGE_UPLOADED',
      targetType: 'ATELIER_PRODUCT',
      targetId: product.id,
      detail: { imageId: image.id, bucketKey: uploaded.key, url: uploaded.url },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, image, url: uploaded.url }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to upload product image', message: error instanceof Error ? error.message : 'Error' },
      { status: 500 }
    );
  }
}
