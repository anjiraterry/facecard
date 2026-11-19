import type {
  EffectKind,
  EquipmentSlot,
  ItemKind,
  ItemRarity,
  BoutiqueItemStatus,
  Tier,
} from '@prisma/client';

export type {
  EffectKind,
  EquipmentSlot,
  ItemKind,
  ItemRarity,
  BoutiqueItemStatus,
};

export type DurationPolicy =
  | 'PERMANENT'
  | 'UNTIL_CONSUMED'
  | 'TIME_LIMITED'
  | 'USAGE_LIMITED'
  | 'TIME_OR_USES';

export type ActivationPolicy = 'EQUIP' | 'AUTOMATIC' | 'MANUAL' | 'ON_SEND' | 'ON_ACCEPT';

export type StackPolicy = 'REPLACE_SLOT' | 'QUANTITY' | 'EXCLUSIVE_GROUP' | 'UNIQUE_OWNED';

export interface CosmeticEffectConfig {
  kind: 'EQUIP_COSMETIC';
  slot: EquipmentSlot;
  assetVersionId: string;
  durationPolicy: 'PERMANENT';
  activation: 'EQUIP';
  stackPolicy: 'REPLACE_SLOT';
  targets: string[];
  palette?: {
    from: string;
    to: string;
    text: string;
    accent?: string;
  };
}

export interface StreakProtectionEffectConfig {
  kind: 'STREAK_PROTECTION';
  durationPolicy: 'UNTIL_CONSUMED';
  activation: 'AUTOMATIC';
  maximumUses: 1;
  trigger: 'STREAK_MISSED_DAY';
  stackPolicy: 'QUANTITY';
  maximumOwned: number;
  targets: ['STREAK'];
}

export interface RewardMultiplierEffectConfig {
  kind: 'REWARD_MULTIPLIER';
  multiplierBps: number; // 15000 = 1.5x, 20000 = 2.0x
  durationPolicy: 'TIME_OR_USES';
  durationSeconds: number;
  maximumUses: number;
  activation: 'MANUAL';
  stackPolicy: 'EXCLUSIVE_GROUP';
  stackGroup: 'ACTIVITY_REWARD_BOOST';
  eligibleActivities: string[];
  maximumBonusPoints: number;
  balanceTarget: 'SPENDABLE';
  targets: ['ECONOMY'];
}

export interface FeatureEntitlementEffectConfig {
  kind: 'FEATURE_ENTITLEMENT';
  featureKey: string;
  durationPolicy: 'TIME_LIMITED';
  durationSeconds: number;
  activation: 'MANUAL';
  stackPolicy: 'EXCLUSIVE_GROUP';
  targets: string[];
}

export interface ExportEntitlementEffectConfig {
  kind: 'EXPORT_ENTITLEMENT';
  featureKey: string;
  durationPolicy: 'TIME_OR_USES';
  durationSeconds: number;
  maximumUses: number;
  activation: 'MANUAL';
  stackPolicy: 'QUANTITY';
  targets: ['SHARE'];
}

export interface SocialGiftEffectConfig {
  kind: 'SOCIAL_GIFT';
  recipientEffectSeconds?: number;
  requiresAcceptance: boolean;
  visibilityDurationLabel: string;
  targets: string[];
}

export interface CapacityIncreaseEffectConfig {
  kind: 'CAPACITY_INCREASE';
  capacityKey: string;
  delta: number;
  durationPolicy: 'PERMANENT';
  targets: string[];
}

export interface ProfileShowcaseEffectConfig {
  kind: 'PROFILE_SHOWCASE';
  durationPolicy: 'TIME_LIMITED';
  durationSeconds: number;
  activation: 'MANUAL';
  targets: ['PROFILE', 'ARENA'];
}

export interface CollectionCompletionEffectConfig {
  kind: 'COLLECTION_COMPLETION';
  collectionSlug: string;
  targets: ['PROFILE', 'COLLECTIONS'];
}

export type ItemEffectConfig =
  | CosmeticEffectConfig
  | StreakProtectionEffectConfig
  | RewardMultiplierEffectConfig
  | FeatureEntitlementEffectConfig
  | ExportEntitlementEffectConfig
  | SocialGiftEffectConfig
  | CapacityIncreaseEffectConfig
  | ProfileShowcaseEffectConfig
  | CollectionCompletionEffectConfig;

export interface EffectValidationResult {
  valid: boolean;
  errors: string[];
  normalizedConfig?: ItemEffectConfig;
}

export interface ResolvedPresentation {
  userId: string;
  actualTier: Tier;
  cardSkin?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  cardFrame?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  avatarFrame?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  avatarEffect?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  profileTitle?: { slug: string; name: string };
  nameplate?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  profileBackground?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  profileEffect?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  arenaEntrance?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  arenaVictory?: { slug: string; name: string; assetRef: string | null; config?: Record<string, unknown> };
  activeGiftBadges: Array<{ slug: string; name: string; expiresAt: string }>;
}
