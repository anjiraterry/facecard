import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { requireStaffPermission, recordStaffAuditLog, StaffAuthError } from '@/lib/admin/auth';
import { validateEffectDefinition } from '@/lib/boutique/effectRegistry';
import { validateAppearanceConfig } from '@/lib/boutique/palette';
import { getClientIp } from '@/lib/auth/rateLimit';
import type { EffectKind, EquipmentSlot, ItemKind, ItemRarity, Tier } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireStaffPermission('boutique.items.read');
    const items = await db.shopItem.findMany({
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
      include: {
        versions: { orderBy: { version: 'desc' }, take: 5 },
        _count: { select: { purchases: true, activeEffects: true } },
      },
    });
    return NextResponse.json({ success: true, items });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load Boutique items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffPermission('boutique.items.create');
    const body = (await req.json().catch(() => ({}))) as {
      sku?: string;
      slug?: string;
      name?: string;
      description?: string;
      kind?: ItemKind;
      category?: string;
      rarity?: ItemRarity;
      price?: number;
      minTier?: Tier;
      maxOwned?: number;
      isGiftable?: boolean;
      slot?: EquipmentSlot | null;
      effectKind?: EffectKind;
      effectConfig?: unknown;
      appearance?: unknown;
      assetRef?: string;
    };

    if (!body.sku || !body.slug || !body.name || !body.kind || typeof body.price !== 'number' || body.price <= 0 || !body.effectKind) {
      return NextResponse.json(
        { error: 'sku, slug, name, kind, positive integer price, and effectKind are required' },
        { status: 400 }
      );
    }

    const validation = validateEffectDefinition(body.effectKind, body.effectConfig ?? {});
    if (!validation.valid || !validation.normalizedConfig) {
      return NextResponse.json(
        { error: 'Invalid effect configuration', validationErrors: validation.errors },
        { status: 400 }
      );
    }

    let normalizedAppearance = undefined;
    if (body.appearance !== undefined) {
      const appCheck = validateAppearanceConfig(body.appearance);
      if (!appCheck.valid || !appCheck.normalized) {
        return NextResponse.json(
          { error: 'Invalid appearance configuration', validationErrors: appCheck.errors },
          { status: 400 }
        );
      }
      normalizedAppearance = appCheck.normalized;
    }

    const finalEffectConfig = normalizedAppearance
      ? { ...validation.normalizedConfig, appearance: normalizedAppearance }
      : validation.normalizedConfig;

    const itemId = randomUUID();
    const versionId = randomUUID();

    const item = await db.$transaction(async (tx) => {
      const created = await tx.shopItem.create({
        data: {
          id: itemId,
          sku: body.sku!.trim().toUpperCase(),
          slug: body.slug!.trim().toLowerCase(),
          name: body.name!.trim(),
          description: body.description?.trim() || null,
          kind: body.kind!,
          category: body.category || 'CARDS',
          rarity: body.rarity || 'ESSENTIAL',
          status: 'DRAFT',
          active: false,
          price: Math.trunc(body.price!),
          minTier: body.minTier || 'CLASSIC',
          maxOwned: body.maxOwned && body.maxOwned > 0 ? body.maxOwned : 1,
          isGiftable: Boolean(body.isGiftable),
          slot: body.slot ?? null,
          effectKind: body.effectKind!,
          effectConfig: finalEffectConfig as object,
          assetRef: body.assetRef?.trim() || normalizedAppearance?.artworkUrl || null,
          currentVersionId: versionId,
        },
      });

      await tx.shopItemVersion.create({
        data: {
          id: versionId,
          itemId: created.id,
          version: 1,
          name: created.name,
          description: created.description,
          rarity: created.rarity,
          pricePoints: created.price,
          maxOwned: created.maxOwned,
          effectKind: body.effectKind!,
          effectConfig: finalEffectConfig as object,
          assetRef: created.assetRef,
        },
      });

      return created;
    });

    await recordStaffAuditLog({
      staffUserId: staff.id,
      action: 'BOUTIQUE_ITEM_DRAFT_CREATED',
      targetType: 'ShopItem',
      targetId: item.id,
      detail: { sku: item.sku, slug: item.slug, effectKind: item.effectKind },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Create boutique item error:', error);
    return NextResponse.json({ error: 'Failed to create Boutique draft item' }, { status: 500 });
  }
}
