import type { EffectKind, EquipmentSlot } from '@prisma/client';
import type { ItemEffectConfig, EffectValidationResult } from './types';

export interface EffectHandlerDescriptor {
  kind: EffectKind;
  handlerVersion: string;
  label: string;
  description: string;
  allowedTargets: readonly string[];
  validateConfig: (raw: unknown) => EffectValidationResult;
  schemaFields: Array<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'select' | 'string[]';
    required?: boolean;
    options?: string[];
  }>;
}

const VALID_SLOTS: readonly EquipmentSlot[] = [
  'CARD_SKIN',
  'CARD_FRAME',
  'AVATAR_FRAME',
  'AVATAR_EFFECT',
  'PROFILE_BACKGROUND',
  'PROFILE_EFFECT',
  'PROFILE_TITLE',
  'NAMEPLATE',
  'ARENA_ENTRANCE',
  'ARENA_VICTORY',
  'ARENA_THEME',
  'SHARE_TEMPLATE',
  'ROUTINE_THEME',
];

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function asPositiveInt(val: unknown): number | null {
  if (typeof val !== 'number' || !Number.isInteger(val) || val <= 0) return null;
  return val;
}

export const EFFECT_REGISTRY: Record<EffectKind, EffectHandlerDescriptor> = {
  EQUIP_COSMETIC: {
    kind: 'EQUIP_COSMETIC',
    handlerVersion: '1.0',
    label: 'Equipable Cosmetic',
    description: 'Permanent cosmetic bound to an equipment slot. Replaces previous slot occupant without deleting it.',
    allowedTargets: ['CARD', 'PROFILE', 'CIRCLE', 'LEADERBOARD', 'ARENA', 'SHARE'],
    schemaFields: [
      { key: 'slot', label: 'Equipment Slot', type: 'select', required: true, options: [...VALID_SLOTS] },
      { key: 'assetVersionId', label: 'Asset Version ID', type: 'string', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const errors: string[] = [];
      const slot = obj.slot as EquipmentSlot;
      if (!VALID_SLOTS.includes(slot)) errors.push(`Invalid equipment slot: ${String(obj.slot)}`);
      const assetVersionId = typeof obj.assetVersionId === 'string' ? obj.assetVersionId.trim() : '';
      if (!assetVersionId || assetVersionId === 'REQUIRED') {
        errors.push('Valid assetVersionId is required before publishing');
      }
      if (errors.length > 0) return { valid: false, errors };
      const targets = Array.isArray(obj.targets) && obj.targets.length > 0
        ? obj.targets.map(String)
        : ['CARD', 'PROFILE'];
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'EQUIP_COSMETIC',
          slot,
          assetVersionId,
          durationPolicy: 'PERMANENT',
          activation: 'EQUIP',
          stackPolicy: 'REPLACE_SLOT',
          targets,
          palette: asRecord(obj.palette) as ItemEffectConfig extends { palette?: infer P } ? P : never,
        },
      };
    },
  },

  STREAK_PROTECTION: {
    kind: 'STREAK_PROTECTION',
    handlerVersion: '1.0',
    label: 'Streak Protection',
    description: 'Automatically consumes 1 unit to protect an eligible missed Africa/Lagos calendar day.',
    allowedTargets: ['STREAK'],
    schemaFields: [
      { key: 'maximumOwned', label: 'Max Held Freezes', type: 'number', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const maximumOwned = asPositiveInt(obj.maximumOwned) ?? 2;
      if (maximumOwned > 10) {
        return { valid: false, errors: ['maximumOwned cannot exceed 10'] };
      }
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'STREAK_PROTECTION',
          durationPolicy: 'UNTIL_CONSUMED',
          activation: 'AUTOMATIC',
          maximumUses: 1,
          trigger: 'STREAK_MISSED_DAY',
          stackPolicy: 'QUANTITY',
          maximumOwned,
          targets: ['STREAK'],
        },
      };
    },
  },

  REWARD_MULTIPLIER: {
    kind: 'REWARD_MULTIPLIER',
    handlerVersion: '1.0',
    label: 'Reward Multiplier (Aura Charge)',
    description: 'Time- and use-limited spendable reward multiplier with explicit bonus cap and exclusive stack group.',
    allowedTargets: ['ECONOMY'],
    schemaFields: [
      { key: 'multiplierBps', label: 'Multiplier (bps: 15000=1.5x, 20000=2x)', type: 'number', required: true },
      { key: 'durationSeconds', label: 'Duration (seconds)', type: 'number', required: true },
      { key: 'maximumUses', label: 'Max Uses', type: 'number', required: true },
      { key: 'maximumBonusPoints', label: 'Max Bonus Points Cap', type: 'number', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const errors: string[] = [];
      const multiplierBps = asPositiveInt(obj.multiplierBps);
      if (!multiplierBps || multiplierBps < 11000 || multiplierBps > 25000) {
        errors.push('multiplierBps must be between 11000 (1.1x) and 25000 (2.5x)');
      }
      const durationSeconds = asPositiveInt(obj.durationSeconds);
      if (!durationSeconds || durationSeconds > 720 * 3600) {
        errors.push('durationSeconds must be between 1 and 2592000 (720h)');
      }
      const maximumUses = asPositiveInt(obj.maximumUses);
      if (!maximumUses || maximumUses > 100) {
        errors.push('maximumUses must be between 1 and 100');
      }
      const maximumBonusPoints = asPositiveInt(obj.maximumBonusPoints);
      if (!maximumBonusPoints || maximumBonusPoints > 1000) {
        errors.push('maximumBonusPoints must be between 1 and 1000');
      }
      if (errors.length > 0) return { valid: false, errors };
      const eligibleActivities = Array.isArray(obj.eligibleActivities) && obj.eligibleActivities.length > 0
        ? obj.eligibleActivities.map(String)
        : ['SOLO_SCAN_COMPLETED', 'COMMUNITY_CHALLENGE_COMPLETED', 'FRIENDLY_CHALLENGE_COMPLETED'];
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'REWARD_MULTIPLIER',
          multiplierBps: multiplierBps!,
          durationPolicy: 'TIME_OR_USES',
          durationSeconds: durationSeconds!,
          maximumUses: maximumUses!,
          activation: 'MANUAL',
          stackPolicy: 'EXCLUSIVE_GROUP',
          stackGroup: 'ACTIVITY_REWARD_BOOST',
          eligibleActivities,
          maximumBonusPoints: maximumBonusPoints!,
          balanceTarget: 'SPENDABLE',
          targets: ['ECONOMY'],
        },
      };
    },
  },

  FEATURE_ENTITLEMENT: {
    kind: 'FEATURE_ENTITLEMENT',
    handlerVersion: '1.0',
    label: 'Feature Entitlement',
    description: 'Timed noncompetitive feature unlock (e.g., Studio Pass presentation tools).',
    allowedTargets: ['SCAN', 'SHARE', 'PROFILE'],
    schemaFields: [
      { key: 'featureKey', label: 'Feature Key', type: 'string', required: true },
      { key: 'durationSeconds', label: 'Duration (seconds)', type: 'number', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const errors: string[] = [];
      const featureKey = typeof obj.featureKey === 'string' ? obj.featureKey.trim() : '';
      if (!featureKey) errors.push('featureKey is required');
      const durationSeconds = asPositiveInt(obj.durationSeconds);
      if (!durationSeconds || durationSeconds > 720 * 3600) {
        errors.push('durationSeconds must be between 1 and 2592000');
      }
      if (errors.length > 0) return { valid: false, errors };
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'FEATURE_ENTITLEMENT',
          featureKey,
          durationPolicy: 'TIME_LIMITED',
          durationSeconds: durationSeconds!,
          activation: 'MANUAL',
          stackPolicy: 'EXCLUSIVE_GROUP',
          targets: Array.isArray(obj.targets) ? obj.targets.map(String) : ['SCAN'],
        },
      };
    },
  },

  EXPORT_ENTITLEMENT: {
    kind: 'EXPORT_ENTITLEMENT',
    handlerVersion: '1.0',
    label: 'Export Entitlement (Share Pass)',
    description: 'Usage- and time-limited premium export pass; decrements only on confirmed export.',
    allowedTargets: ['SHARE'],
    schemaFields: [
      { key: 'featureKey', label: 'Export Feature Key', type: 'string', required: true },
      { key: 'durationSeconds', label: 'Duration (seconds)', type: 'number', required: true },
      { key: 'maximumUses', label: 'Max Exports', type: 'number', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const errors: string[] = [];
      const featureKey = typeof obj.featureKey === 'string' ? obj.featureKey.trim() : 'PREMIUM_SHARE_STUDIO';
      const durationSeconds = asPositiveInt(obj.durationSeconds) ?? 7 * 86400;
      const maximumUses = asPositiveInt(obj.maximumUses) ?? 3;
      if (maximumUses > 50) errors.push('maximumUses cannot exceed 50');
      if (errors.length > 0) return { valid: false, errors };
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'EXPORT_ENTITLEMENT',
          featureKey,
          durationPolicy: 'TIME_OR_USES',
          durationSeconds,
          maximumUses,
          activation: 'MANUAL',
          stackPolicy: 'QUANTITY',
          targets: ['SHARE'],
        },
      };
    },
  },

  SOCIAL_GIFT: {
    kind: 'SOCIAL_GIFT',
    handlerVersion: '1.0',
    label: 'Social Gift',
    description: 'Validated member-to-member gift with recipient consent, reveal animation, and optional timed badge.',
    allowedTargets: ['CIRCLE', 'PROFILE', 'NOTIFICATIONS'],
    schemaFields: [
      { key: 'recipientEffectSeconds', label: 'Recipient Badge Duration (seconds, optional)', type: 'number' },
      { key: 'visibilityDurationLabel', label: 'Visibility Duration Label', type: 'string', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const recipientEffectSeconds =
        typeof obj.recipientEffectSeconds === 'number' && obj.recipientEffectSeconds > 0
          ? obj.recipientEffectSeconds
          : undefined;
      const visibilityDurationLabel =
        typeof obj.visibilityDurationLabel === 'string' && obj.visibilityDurationLabel.trim()
          ? obj.visibilityDurationLabel.trim()
          : 'Permanent gift history';
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'SOCIAL_GIFT',
          recipientEffectSeconds,
          requiresAcceptance: obj.requiresAcceptance !== false,
          visibilityDurationLabel,
          targets: ['CIRCLE', 'PROFILE', 'NOTIFICATIONS'],
        },
      };
    },
  },

  CAPACITY_INCREASE: {
    kind: 'CAPACITY_INCREASE',
    handlerVersion: '1.0',
    label: 'Capacity Increase',
    description: 'Permanent expansion of an approved account slot capacity (e.g., Gallery slots).',
    allowedTargets: ['PROFILE'],
    schemaFields: [
      { key: 'capacityKey', label: 'Capacity Key', type: 'string', required: true },
      { key: 'delta', label: 'Capacity Delta', type: 'number', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const capacityKey = typeof obj.capacityKey === 'string' ? obj.capacityKey.trim() : '';
      const delta = asPositiveInt(obj.delta);
      if (!capacityKey || !delta) {
        return { valid: false, errors: ['capacityKey and positive integer delta are required'] };
      }
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'CAPACITY_INCREASE',
          capacityKey,
          delta,
          durationPolicy: 'PERMANENT',
          targets: ['PROFILE'],
        },
      };
    },
  },

  PROFILE_SHOWCASE: {
    kind: 'PROFILE_SHOWCASE',
    handlerVersion: '1.0',
    label: 'Profile Showcase',
    description: 'Timed profile showcase for completed matches or editorial moments.',
    allowedTargets: ['PROFILE', 'ARENA'],
    schemaFields: [
      { key: 'durationSeconds', label: 'Duration (seconds)', type: 'number', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const durationSeconds = asPositiveInt(obj.durationSeconds) ?? 48 * 3600;
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'PROFILE_SHOWCASE',
          durationPolicy: 'TIME_LIMITED',
          durationSeconds,
          activation: 'MANUAL',
          targets: ['PROFILE', 'ARENA'],
        },
      };
    },
  },

  COLLECTION_COMPLETION: {
    kind: 'COLLECTION_COMPLETION',
    handlerVersion: '1.0',
    label: 'Collection Completion',
    description: 'Deterministic cosmetic reward unlocked when all required items in a collection are owned.',
    allowedTargets: ['PROFILE', 'COLLECTIONS'],
    schemaFields: [
      { key: 'collectionSlug', label: 'Collection Slug', type: 'string', required: true },
    ],
    validateConfig(raw) {
      const obj = asRecord(raw);
      if (!obj) return { valid: false, errors: ['Config must be an object'] };
      const collectionSlug = typeof obj.collectionSlug === 'string' ? obj.collectionSlug.trim() : '';
      if (!collectionSlug) return { valid: false, errors: ['collectionSlug is required'] };
      return {
        valid: true,
        errors: [],
        normalizedConfig: {
          kind: 'COLLECTION_COMPLETION',
          collectionSlug,
          targets: ['PROFILE', 'COLLECTIONS'],
        },
      };
    },
  },
};

export function validateEffectDefinition(kind: EffectKind, config: unknown): EffectValidationResult {
  const handler = EFFECT_REGISTRY[kind];
  if (!handler) {
    return { valid: false, errors: [`Unsupported effect kind: ${String(kind)}`] };
  }
  return handler.validateConfig(config);
}

/**
 * Pure deterministic Effect Lab simulator using the exact production config semantics.
 * Runs in an isolated in-memory context — never mutates customer database state.
 */
export interface EffectLabState {
  mode: 'AURA_CHARGE' | 'STREAK_FREEZE' | 'STUDIO_PASS' | 'SHARE_PASS';
  status: 'AVAILABLE' | 'ACTIVE' | 'FINISHED';
  elapsedSeconds: number;
  durationSeconds: number | null;
  remainingUses: number | null;
  remainingBonusPoints: number | null;
  finishReason: string | null;
  logs: string[];
}

export function createEffectLabState(mode: EffectLabState['mode']): EffectLabState {
  if (mode === 'AURA_CHARGE') {
    return {
      mode,
      status: 'AVAILABLE',
      elapsedSeconds: 0,
      durationSeconds: 24 * 3600,
      remainingUses: 3,
      remainingBonusPoints: 180,
      finishReason: null,
      logs: ['[00:00] Entitlement created: Aura Charge 2x (3 uses, 24h, max +180 PTS)'],
    };
  }
  if (mode === 'STREAK_FREEZE') {
    return {
      mode,
      status: 'AVAILABLE',
      elapsedSeconds: 0,
      durationSeconds: null,
      remainingUses: 1,
      remainingBonusPoints: null,
      finishReason: null,
      logs: ['[00:00] Entitlement created: Streak Freeze (1 missed day, automatic trigger)'],
    };
  }
  if (mode === 'SHARE_PASS') {
    return {
      mode,
      status: 'AVAILABLE',
      elapsedSeconds: 0,
      durationSeconds: 7 * 24 * 3600,
      remainingUses: 3,
      remainingBonusPoints: null,
      finishReason: null,
      logs: ['[00:00] Entitlement created: Share Studio Pass (3 exports or 7 days)'],
    };
  }
  return {
    mode,
    status: 'AVAILABLE',
    elapsedSeconds: 0,
    durationSeconds: 24 * 3600,
    remainingUses: null,
    remainingBonusPoints: null,
    finishReason: null,
    logs: ['[00:00] Entitlement created: Studio Pass (24h elapsed duration)'],
  };
}

function formatLabClock(seconds: number): string {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  return `[${h}:${m}]`;
}

export function stepEffectLab(
  state: EffectLabState,
  action: 'ACTIVATE' | 'SIMULATE_EVENT' | 'ADVANCE_1H' | 'ADVANCE_6H' | 'EXPIRE'
): EffectLabState {
  const next: EffectLabState = { ...state, logs: [...state.logs] };
  const stamp = formatLabClock(next.elapsedSeconds);

  if (action === 'ACTIVATE') {
    if (next.status !== 'AVAILABLE') {
      next.logs.push(`${stamp} [REJECTED] Cannot activate in status ${next.status}`);
      return next;
    }
    next.status = 'ACTIVE';
    next.logs.push(`${stamp} Effect activated`);
    return next;
  }

  if (action === 'SIMULATE_EVENT') {
    if (next.status !== 'ACTIVE') {
      next.logs.push(`${stamp} [REJECTED] Effect is ${next.status}; event did not consume`);
      return next;
    }
    if (next.durationSeconds !== null && next.elapsedSeconds >= next.durationSeconds) {
      next.status = 'FINISHED';
      next.finishReason = 'DURATION_EXHAUSTED';
      next.logs.push(`${stamp} [FINISH] Duration exhausted before execution`);
      return next;
    }

    if (next.mode === 'AURA_CHARGE') {
      const bonus = Math.min(60, next.remainingBonusPoints ?? 0);
      next.remainingBonusPoints = Math.max(0, (next.remainingBonusPoints ?? 0) - bonus);
      next.remainingUses = Math.max(0, (next.remainingUses ?? 0) - 1);
      next.logs.push(
        `${stamp} [EVENT] Eligible activity executed (+${bonus} bonus PTS, ${next.remainingUses} uses left)`
      );
      if (next.remainingUses === 0 || next.remainingBonusPoints === 0) {
        next.status = 'FINISHED';
        next.finishReason = next.remainingUses === 0 ? 'USAGE_EXHAUSTED' : 'BONUS_CAP_REACHED';
        next.logs.push(`${stamp} [FINISH] ${next.finishReason}`);
      }
      return next;
    }

    if (next.mode === 'STREAK_FREEZE' || next.mode === 'SHARE_PASS') {
      next.remainingUses = Math.max(0, (next.remainingUses ?? 0) - 1);
      next.logs.push(`${stamp} [EVENT] Eligible action executed (${next.remainingUses} uses left)`);
      if (next.remainingUses === 0) {
        next.status = 'FINISHED';
        next.finishReason = 'USAGE_EXHAUSTED';
        next.logs.push(`${stamp} [FINISH] Usage exhausted`);
      }
      return next;
    }

    next.logs.push(`${stamp} [EVENT] Studio Pass presentation entitlement verified`);
    return next;
  }

  if (action === 'ADVANCE_1H' || action === 'ADVANCE_6H') {
    const delta = action === 'ADVANCE_1H' ? 3600 : 6 * 3600;
    next.elapsedSeconds += delta;
    const newStamp = formatLabClock(next.elapsedSeconds);
    next.logs.push(`${newStamp} [CLOCK] Advanced +${delta / 3600}h`);
    if (
      next.status === 'ACTIVE' &&
      next.durationSeconds !== null &&
      next.elapsedSeconds >= next.durationSeconds
    ) {
      next.status = 'FINISHED';
      next.finishReason = 'DURATION_EXHAUSTED';
      next.logs.push(`${newStamp} [FINISH] Duration exhausted`);
    }
    return next;
  }

  if (action === 'EXPIRE') {
    if (next.status !== 'FINISHED') {
      next.status = 'FINISHED';
      next.finishReason = 'FORCE_EXPIRED';
      next.logs.push(`${stamp} [FINISH] Expired by lab clock`);
    }
    return next;
  }

  return next;
}
