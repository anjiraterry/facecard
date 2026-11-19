import { db } from '@/lib/db';
import type { ResolvedPresentation } from './types';
import type { Tier } from '@prisma/client';

/**
 * Shared server-side cosmetic presentation resolver.
 * Integrates Card, Profile, Circle, Leaderboard, Arena, and Share Card surfaces
 * while keeping actual Tier server-controlled.
 */
export async function resolveUserPresentation(userId: string): Promise<ResolvedPresentation | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tier: true,
      cards: {
        take: 1,
        include: {
          equippedSkin: { select: { slug: true, name: true, assetRef: true, effectConfig: true } },
          equippedFrame: { select: { slug: true, name: true, assetRef: true, effectConfig: true } },
          equippedTitle: { select: { slug: true, name: true } },
        },
      },
      equipment: {
        include: {
          item: { select: { slug: true, name: true, assetRef: true, effectConfig: true } },
        },
      },
      activeEffects: {
        where: {
          status: 'ACTIVE',
          effectKind: 'SOCIAL_GIFT',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          item: { select: { slug: true, name: true } },
        },
      },
    },
  });

  if (!user) return null;

  const bySlot = new Map(user.equipment.map((eq) => [eq.slot, eq.item]));
  const card = user.cards[0];

  const mapItem = (item?: { slug: string; name: string; assetRef: string | null; effectConfig: unknown } | null) =>
    item
      ? {
          slug: item.slug,
          name: item.name,
          assetRef: item.assetRef,
          config: (item.effectConfig as Record<string, unknown> | null) ?? undefined,
        }
      : undefined;

  return {
    userId: user.id,
    actualTier: user.tier as Tier,
    cardSkin: mapItem(bySlot.get('CARD_SKIN') ?? card?.equippedSkin),
    cardFrame: mapItem(bySlot.get('CARD_FRAME') ?? card?.equippedFrame),
    avatarFrame: mapItem(bySlot.get('AVATAR_FRAME')),
    avatarEffect: mapItem(bySlot.get('AVATAR_EFFECT')),
    profileTitle: bySlot.get('PROFILE_TITLE')
      ? { slug: bySlot.get('PROFILE_TITLE')!.slug, name: bySlot.get('PROFILE_TITLE')!.name }
      : card?.equippedTitle
        ? { slug: card.equippedTitle.slug, name: card.equippedTitle.name }
        : undefined,
    nameplate: mapItem(bySlot.get('NAMEPLATE')),
    profileBackground: mapItem(bySlot.get('PROFILE_BACKGROUND')),
    profileEffect: mapItem(bySlot.get('PROFILE_EFFECT')),
    arenaEntrance: mapItem(bySlot.get('ARENA_ENTRANCE')),
    arenaVictory: mapItem(bySlot.get('ARENA_VICTORY')),
    activeGiftBadges: user.activeEffects
      .filter((eff) => eff.expiresAt)
      .map((eff) => ({
        slug: eff.item.slug,
        name: eff.item.name,
        expiresAt: eff.expiresAt!.toISOString(),
      })),
  };
}
