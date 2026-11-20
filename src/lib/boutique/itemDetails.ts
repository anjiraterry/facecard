import type { EffectKind, EquipmentSlot, ItemKind, ItemRarity, Tier } from '@prisma/client';
import { EFFECT_REGISTRY, validateEffectDefinition } from './effectRegistry';
import type { ItemEffectConfig } from './types';

export type PrimaryActionType =
  | 'PURCHASE'
  | 'EARN_POINTS'
  | 'VIEW_TIER_REQUIREMENTS'
  | 'EQUIP'
  | 'UNEQUIP'
  | 'ACTIVATE'
  | 'VIEW_ACTIVE_EFFECT'
  | 'SEND_GIFT'
  | 'UNAVAILABLE'
  | 'NOT_PURCHASABLE';

export interface ItemLifecycleDetails {
  effectDescription: string;
  activationLabel: string;
  durationLabel: string;
  usesLabel: string;
  ownershipLimitLabel: string;
  stackingPolicyLabel: string;
  supportedModules: string[];
  usageInstructions: string[];
  endingBehavior: string;
  refundPolicy: string;
  isSupported: boolean;
  validationErrors: string[];
}

export interface ShopItemLike {
  id: string;
  sku: string | null;
  slug: string;
  name: string;
  description: string | null;
  kind: ItemKind;
  category: string;
  rarity: ItemRarity;
  price: number;
  minTier: Tier;
  maxOwned: number;
  isGiftable: boolean;
  active: boolean;
  status: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  slot?: EquipmentSlot | null;
  effectKind?: EffectKind | null;
  effectConfig?: unknown;
  usageInstructions?: string | null;
  endingBehavior?: string | null;
  refundPolicy?: string | null;
}

function formatDurationSeconds(seconds: number): string {
  if (seconds % 86400 === 0) {
    const days = seconds / 86400;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${Math.round(seconds / 60)} minutes`;
}

export function deriveItemLifecycleDetails(item: ShopItemLike): ItemLifecycleDetails {
  const effectKind = item.effectKind;
  const validation = effectKind
    ? validateEffectDefinition(effectKind, item.effectConfig)
    : { valid: false, errors: ['No effect handler registered for this item'] };

  const handler = effectKind ? EFFECT_REGISTRY[effectKind] : undefined;
  const cfg = validation.normalizedConfig as ItemEffectConfig | undefined;

  const supportedModules: string[] =
    cfg && 'targets' in cfg && Array.isArray(cfg.targets) && cfg.targets.length > 0
      ? cfg.targets
      : handler
        ? [...handler.allowedTargets]
        : [];

  let effectDescription = item.description || handler?.description || 'No effect details available.';
  let activationLabel = 'Manual';
  let durationLabel = 'Permanent';
  let usesLabel = 'Unlimited';
  let stackingPolicyLabel = 'Standard inventory limit';
  let endingBehavior = item.endingBehavior || 'Remains in your Vanity inventory.';
  let usageInstructions: string[] = [];

  if (item.usageInstructions) {
    usageInstructions = item.usageInstructions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (cfg) {
    switch (cfg.kind) {
      case 'EQUIP_COSMETIC': {
        activationLabel = 'Equip in Vanity';
        durationLabel = 'Permanent until unequipped';
        usesLabel = 'Unlimited';
        stackingPolicyLabel = `Replaces active item in ${cfg.slot.replace(/_/g, ' ').toLowerCase()} slot`;
        endingBehavior = item.endingBehavior || 'Unequipping or replacing returns this cosmetic to your Vanity without losing ownership.';
        if (usageInstructions.length === 0) {
          usageInstructions = [
            `Purchase ${item.name} from the Boutique.`,
            'Open your Vanity or equip directly from this page.',
            `Your ${cfg.slot.replace(/_/g, ' ').toLowerCase()} updates across ${supportedModules.join(', ')}.`,
            'Unequip or swap anytime — ownership is permanent.',
          ];
        }
        break;
      }
      case 'STREAK_PROTECTION': {
        effectDescription =
          'Automatically protects your existing streak against one eligible missed Africa/Lagos calendar day. It does not award points for the missed activity.';
        activationLabel = 'Automatic when needed';
        durationLabel = 'Until consumed';
        usesLabel = 'One missed day';
        stackingPolicyLabel = `Hold up to ${cfg.maximumOwned} at a time`;
        endingBehavior = item.endingBehavior || 'Consumed once when protecting a missed calendar day and recorded in your activity history.';
        if (usageInstructions.length === 0) {
          usageInstructions = [
            `Purchase ${item.name}.`,
            'Find it in your Vanity inventory.',
            'Protection is automatically applied to an eligible missed day.',
            'The consumed item is recorded in your activity history.',
          ];
        }
        break;
      }
      case 'REWARD_MULTIPLIER': {
        const mult = (cfg.multiplierBps / 10000).toFixed(1);
        effectDescription = `Multiplies spendable points earned from eligible activities by ${mult}x for ${formatDurationSeconds(cfg.durationSeconds)} or ${cfg.maximumUses} uses (capped at +${cfg.maximumBonusPoints} bonus PTS).`;
        activationLabel = 'Manual activation';
        durationLabel = `${formatDurationSeconds(cfg.durationSeconds)} or ${cfg.maximumUses} uses`;
        usesLabel = `${cfg.maximumUses} eligible activities (max +${cfg.maximumBonusPoints} PTS)`;
        stackingPolicyLabel = 'Exclusive — only one reward booster can be active at a time';
        endingBehavior =
          item.endingBehavior ||
          'Stops immediately when the timer expires, all uses are consumed, or the bonus points cap is reached.';
        if (usageInstructions.length === 0) {
          usageInstructions = [
            `Purchase ${item.name}.`,
            'Activate it from your Vanity when ready to scan.',
            'Complete eligible scans or challenges to earn boosted spendable points.',
            'Effect ends automatically at cap, use limit, or expiration.',
          ];
        }
        break;
      }
      case 'FEATURE_ENTITLEMENT': {
        activationLabel = 'Manual activation';
        durationLabel = formatDurationSeconds(cfg.durationSeconds);
        usesLabel = 'Unlimited during active window';
        stackingPolicyLabel = 'Exclusive active window';
        endingBehavior = item.endingBehavior || 'Access locks automatically when the duration expires.';
        if (usageInstructions.length === 0) {
          usageInstructions = [
            `Purchase ${item.name}.`,
            'Activate it from your Vanity or this page.',
            `Use the unlocked tools in ${supportedModules.join(', ')} while active.`,
            'Entitlement expires automatically after the active window.',
          ];
        }
        break;
      }
      case 'EXPORT_ENTITLEMENT': {
        activationLabel = 'Manual activation';
        durationLabel = `${formatDurationSeconds(cfg.durationSeconds)} or ${cfg.maximumUses} exports`;
        usesLabel = `${cfg.maximumUses} confirmed ${cfg.maximumUses === 1 ? 'export' : 'exports'}`;
        stackingPolicyLabel = 'Quantity stackable in inventory';
        endingBehavior = item.endingBehavior || 'Consumes 1 use per confirmed export; expires after all uses or duration elapses.';
        if (usageInstructions.length === 0) {
          usageInstructions = [
            `Purchase ${item.name}.`,
            'Activate the pass in your Vanity.',
            'Select the premium export layout when sharing your card or match recap.',
            'Uses decrement only on confirmed export.',
          ];
        }
        break;
      }
      case 'SOCIAL_GIFT': {
        activationLabel = cfg.requiresAcceptance ? 'Recipient acceptance' : 'On send';
        durationLabel = cfg.visibilityDurationLabel;
        usesLabel = '1 gift send';
        stackingPolicyLabel = 'Giftable to Circle friends';
        endingBehavior =
          item.endingBehavior ||
          'If declined or expired, points are automatically refunded to the sender. Accepted gifts remain in gift history.';
        if (usageInstructions.length === 0) {
          usageInstructions = [
            'Select a friend from your Circle.',
            `Send ${item.name} with an optional personal note.`,
            'Your friend accepts the gift to reveal it on their profile.',
            'Declined gifts automatically refund your points.',
          ];
        }
        break;
      }
      case 'CAPACITY_INCREASE': {
        activationLabel = 'Automatic on purchase';
        durationLabel = 'Permanent';
        usesLabel = `+${cfg.delta} slots`;
        stackingPolicyLabel = 'Permanent account expansion';
        endingBehavior = item.endingBehavior || 'Permanent capacity increase.';
        if (usageInstructions.length === 0) {
          usageInstructions = [
            `Purchase ${item.name}.`,
            `Your account capacity increases by +${cfg.delta} immediately.`,
          ];
        }
        break;
      }
      case 'PROFILE_SHOWCASE': {
        activationLabel = 'Manual activation';
        durationLabel = formatDurationSeconds(cfg.durationSeconds);
        usesLabel = '1 showcase window';
        stackingPolicyLabel = 'Time-limited spotlight';
        endingBehavior = item.endingBehavior || 'Showcase returns to standard profile layout when duration expires.';
        break;
      }
      case 'COLLECTION_COMPLETION': {
        activationLabel = 'Automatic on collection completion';
        durationLabel = 'Permanent';
        usesLabel = 'Unlimited';
        stackingPolicyLabel = 'Collection milestone reward';
        endingBehavior = item.endingBehavior || 'Permanent collection reward.';
        break;
      }
    }
  } else if (usageInstructions.length === 0) {
    usageInstructions = ['This item does not have a registered effect handler and is currently unavailable for purchase.'];
  }

  return {
    effectDescription,
    activationLabel,
    durationLabel,
    usesLabel,
    ownershipLimitLabel: item.maxOwned === 1 ? '1 per account' : `${item.maxOwned} at a time`,
    stackingPolicyLabel,
    supportedModules,
    usageInstructions,
    endingBehavior,
    refundPolicy:
      item.refundPolicy ||
      (cfg?.kind === 'SOCIAL_GIFT'
        ? 'Refunded automatically if the recipient declines or the gift expires.'
        : 'Digital Boutique purchases are final once delivered to your Vanity.'),
    isSupported: validation.valid,
    validationErrors: validation.errors,
  };
}

export function resolveCustomerPrimaryAction(params: {
  item: ShopItemLike;
  isSupported: boolean;
  userTierRank: number;
  requiredTierRank: number;
  spendableBalance: number;
  ownedQuantity: number;
  isEquipped: boolean;
  hasActiveEffect: boolean;
}): {
  action: PrimaryActionType;
  label: string;
  reason?: string;
} {
  const { item, isSupported, userTierRank, requiredTierRank, spendableBalance, ownedQuantity, isEquipped, hasActiveEffect } = params;
  const now = new Date();
  const inWindow = (!item.startsAt || item.startsAt <= now) && (!item.endsAt || item.endsAt >= now);

  if (!isSupported) {
    return {
      action: 'NOT_PURCHASABLE',
      label: 'Not purchasable',
      reason: 'This item is disabled until its effect integration is verified.',
    };
  }

  if (!item.active || item.status !== 'PUBLISHED' || !inWindow) {
    if (ownedQuantity > 0 && isEquipped) {
      return { action: 'UNEQUIP', label: 'Unequip' };
    }
    if (ownedQuantity > 0 && item.effectKind === 'EQUIP_COSMETIC') {
      return { action: 'EQUIP', label: 'Equip' };
    }
    return {
      action: 'UNAVAILABLE',
      label: 'Currently unavailable',
      reason: 'This item is not currently available in the Boutique.',
    };
  }

  if (hasActiveEffect) {
    return { action: 'VIEW_ACTIVE_EFFECT', label: 'View active effect' };
  }

  if (ownedQuantity > 0) {
    if (item.effectKind === 'EQUIP_COSMETIC') {
      return isEquipped
        ? { action: 'UNEQUIP', label: 'Unequip' }
        : { action: 'EQUIP', label: 'Equip' };
    }
    if (
      item.effectKind &&
      ['REWARD_MULTIPLIER', 'FEATURE_ENTITLEMENT', 'EXPORT_ENTITLEMENT', 'PROFILE_SHOWCASE'].includes(item.effectKind)
    ) {
      return { action: 'ACTIVATE', label: 'Activate or use' };
    }
    if (item.isGiftable && item.effectKind === 'SOCIAL_GIFT') {
      return { action: 'SEND_GIFT', label: 'Send as gift' };
    }
    // Automatic consumable like Streak Freeze: allow buying more up to maxOwned
    if (ownedQuantity < item.maxOwned) {
      if (spendableBalance < item.price) {
        return {
          action: 'EARN_POINTS',
          label: 'Earn points',
          reason: `You need ${item.price - spendableBalance} more PTS to purchase another.`,
        };
      }
      return { action: 'PURCHASE', label: 'Purchase item' };
    }
    return { action: 'VIEW_ACTIVE_EFFECT', label: 'Owned (Max held)' };
  }

  if (userTierRank < requiredTierRank) {
    return {
      action: 'VIEW_TIER_REQUIREMENTS',
      label: 'View unlock requirements',
      reason: `Requires ${item.minTier} tier or higher.`,
    };
  }

  if (item.isGiftable && item.effectKind === 'SOCIAL_GIFT') {
    if (spendableBalance < item.price) {
      return {
        action: 'EARN_POINTS',
        label: 'Earn points',
        reason: `You need ${item.price - spendableBalance} more PTS.`,
      };
    }
    return { action: 'SEND_GIFT', label: 'Send as gift' };
  }

  if (spendableBalance < item.price) {
    return {
      action: 'EARN_POINTS',
      label: 'Earn points',
      reason: `You need ${item.price - spendableBalance} more PTS to purchase this item.`,
    };
  }

  return { action: 'PURCHASE', label: 'Purchase item' };
}
