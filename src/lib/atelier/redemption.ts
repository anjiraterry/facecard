import { db } from '@/lib/db';
import { getLagosDayKey } from '@/lib/scoring';
import { postLedger } from '@/lib/ledger';
import {
  PointsReservationStatus,
  Prisma,
  RedemptionPolicyStatus,
  Tier,
} from '@prisma/client';

export interface TierRuleConfig {
  tier: Tier;
  enabled: boolean;
  maxDiscountBps: number;
  minimumSubtotalMinor: bigint;
  perOrderCapMinor: bigint;
  monthlyCapMinor: bigint;
  frequencyLimit: number;
}

export interface RedemptionPolicySnapshot {
  id: string;
  version: number;
  minimumTier: Tier;
  pointsPerUnit: number;
  valuePerUnitMinor: bigint;
  minimumSubtotalMinor: bigint;
  marginFloorBps: number;
  processingFeeBps: number;
  processingFeeFlatMinor: bigint;
  allowPromoStacking: boolean;
  programmeBudgetMinor: bigint | null;
  programmeSpentMinor: bigint;
  emergencyPaused: boolean;
  tierRules: Record<Tier, TierRuleConfig>;
}

export const DEFAULT_TIER_RULES: Record<Tier, TierRuleConfig> = {
  CLASSIC: {
    tier: 'CLASSIC',
    enabled: false,
    maxDiscountBps: 0,
    minimumSubtotalMinor: BigInt(0),
    perOrderCapMinor: BigInt(0),
    monthlyCapMinor: BigInt(0),
    frequencyLimit: 0,
  },
  GOLD: {
    tier: 'GOLD',
    enabled: true,
    maxDiscountBps: 500, // 5%
    minimumSubtotalMinor: BigInt(1_500_000), // ₦15,000
    perOrderCapMinor: BigInt(100_000), // ₦1,000
    monthlyCapMinor: BigInt(200_000), // ₦2,000
    frequencyLimit: 2,
  },
  PLATINUM: {
    tier: 'PLATINUM',
    enabled: true,
    maxDiscountBps: 1000, // 10%
    minimumSubtotalMinor: BigInt(2_000_000), // ₦20,000
    perOrderCapMinor: BigInt(200_000), // ₦2,000
    monthlyCapMinor: BigInt(400_000), // ₦4,000
    frequencyLimit: 2,
  },
  BLACK: {
    tier: 'BLACK',
    enabled: true,
    maxDiscountBps: 1500, // 15%
    minimumSubtotalMinor: BigInt(2_500_000), // ₦25,000
    perOrderCapMinor: BigInt(300_000), // ₦3,000
    monthlyCapMinor: BigInt(600_000), // ₦6,000
    frequencyLimit: 2,
  },
};

export function getLagosPeriodKey(date: Date = new Date()): string {
  return getLagosDayKey(date).slice(0, 7); // YYYY-MM in Africa/Lagos
}

export async function getActiveRedemptionPolicy(): Promise<RedemptionPolicySnapshot> {
  const existing = await db.redemptionPolicyVersion.findFirst({
    where: { status: RedemptionPolicyStatus.PUBLISHED },
    include: { tierRules: true },
    orderBy: { version: 'desc' },
  });

  if (existing) {
    const tierRules = { ...DEFAULT_TIER_RULES };
    for (const r of existing.tierRules) {
      tierRules[r.tier] = {
        tier: r.tier,
        enabled: r.enabled,
        maxDiscountBps: r.maxDiscountBps,
        minimumSubtotalMinor: r.minimumSubtotalMinor ?? DEFAULT_TIER_RULES[r.tier].minimumSubtotalMinor,
        perOrderCapMinor: r.perOrderCapMinor,
        monthlyCapMinor: r.monthlyCapMinor,
        frequencyLimit: r.frequencyLimit,
      };
    }
    return {
      id: existing.id,
      version: existing.version,
      minimumTier: existing.minimumTier,
      pointsPerUnit: existing.pointsPerUnit,
      valuePerUnitMinor: existing.valuePerUnitMinor,
      minimumSubtotalMinor: existing.minimumSubtotalMinor,
      marginFloorBps: existing.marginFloorBps,
      processingFeeBps: existing.processingFeeBps,
      processingFeeFlatMinor: existing.processingFeeFlatMinor,
      allowPromoStacking: existing.allowPromoStacking,
      programmeBudgetMinor: existing.programmeBudgetMinor,
      programmeSpentMinor: existing.programmeSpentMinor,
      emergencyPaused: existing.emergencyPaused,
      tierRules,
    };
  }

  // Bootstrap default v1 policy on first access
  const created = await db.redemptionPolicyVersion.create({
    data: {
      version: 1,
      status: RedemptionPolicyStatus.PUBLISHED,
      minimumTier: Tier.GOLD,
      pointsPerUnit: 100,
      valuePerUnitMinor: BigInt(5000), // ₦50 per 100 PTS
      minimumSubtotalMinor: BigInt(1000000), // ₦10,000
      marginFloorBps: 1500, // 15%
      processingFeeBps: 150, // 1.5%
      processingFeeFlatMinor: BigInt(10000), // ₦100
      allowPromoStacking: false,
      emergencyPaused: false,
      notes: 'Default launch Atelier redemption policy',
      publishedAt: new Date(),
      tierRules: {
        create: Object.values(DEFAULT_TIER_RULES).map((r) => ({
          tier: r.tier,
          enabled: r.enabled,
          maxDiscountBps: r.maxDiscountBps,
          minimumSubtotalMinor: r.minimumSubtotalMinor,
          perOrderCapMinor: r.perOrderCapMinor,
          monthlyCapMinor: r.monthlyCapMinor,
          frequencyLimit: r.frequencyLimit,
        })),
      },
    },
    include: { tierRules: true },
  });

  return {
    id: created.id,
    version: created.version,
    minimumTier: created.minimumTier,
    pointsPerUnit: created.pointsPerUnit,
    valuePerUnitMinor: created.valuePerUnitMinor,
    minimumSubtotalMinor: created.minimumSubtotalMinor,
    marginFloorBps: created.marginFloorBps,
    processingFeeBps: created.processingFeeBps,
    processingFeeFlatMinor: created.processingFeeFlatMinor,
    allowPromoStacking: created.allowPromoStacking,
    programmeBudgetMinor: created.programmeBudgetMinor,
    programmeSpentMinor: created.programmeSpentMinor,
    emergencyPaused: created.emergencyPaused,
    tierRules: { ...DEFAULT_TIER_RULES },
  };
}

export interface BasketItemForQuote {
  variantId: string;
  orderItemId?: string;
  quantity: number;
  unitPriceMinor: bigint;
  costPriceMinor: bigint | null;
  hasActivePromotion?: boolean;
  rule?: {
    enabled: boolean;
    maxDiscountBps: number | null;
    marginFloorBps: number | null;
    allowPromoStacking: boolean;
    excludedReason: string | null;
  } | null;
}

export interface QuoteAllocation {
  variantId: string;
  orderItemId?: string;
  eligibleSubtotalMinor: bigint;
  maxMarginDiscountMinor: bigint;
  allocatedDiscountMinor: bigint;
  allocatedPoints: number;
}

export interface RedemptionQuoteResult {
  eligible: boolean;
  reason?: string;
  policyVersionId: string;
  policyVersion: number;
  tier: Tier;
  minimumTier: Tier;
  periodKey: string;
  availableSpendablePoints: number;
  eligibleSubtotalMinor: bigint;
  ineligibleSubtotalMinor: bigint;
  minimumSubtotalMinor: bigint;
  shortfallMinor: bigint;
  pointsValueMinor: bigint;
  tierPercentageCapMinor: bigint;
  perOrderCapMinor: bigint;
  remainingMonthlyAllowanceMinor: bigint;
  remainingMonthlyCount: number;
  marginProtectionCapMinor: bigint;
  programmeBudgetRemainingMinor: bigint | null;
  maxPermittedDiscountMinor: bigint;
  requestedPoints: number;
  appliedPoints: number;
  appliedDiscountMinor: bigint;
  allocations: QuoteAllocation[];
}

const TIER_RANK: Record<Tier, number> = { CLASSIC: 0, GOLD: 1, PLATINUM: 2, BLACK: 3 };

/**
 * Pure deterministic calculation of Atelier points redemption quote with 6-cap financial protection.
 */
export function calculateRedemptionQuote(params: {
  policy: RedemptionPolicySnapshot;
  tier: Tier;
  availableSpendablePoints: number;
  alreadyCommittedMinor: bigint;
  alreadyReservedMinor: bigint;
  alreadyCommittedCount: number;
  alreadyReservedCount: number;
  items: BasketItemForQuote[];
  requestedPoints?: number;
  periodKey: string;
}): RedemptionQuoteResult {
  const {
    policy,
    tier,
    availableSpendablePoints,
    alreadyCommittedMinor,
    alreadyReservedMinor,
    alreadyCommittedCount,
    alreadyReservedCount,
    items,
    requestedPoints,
    periodKey,
  } = params;

  const tierRule = policy.tierRules[tier];
  const effectiveMinSubtotal =
    tierRule.minimumSubtotalMinor > policy.minimumSubtotalMinor
      ? tierRule.minimumSubtotalMinor
      : policy.minimumSubtotalMinor;

  const baseEmpty = (reason: string, eligibleSubtotalMinor = BigInt(0), ineligibleSubtotalMinor = BigInt(0)): RedemptionQuoteResult => ({
    eligible: false,
    reason,
    policyVersionId: policy.id,
    policyVersion: policy.version,
    tier,
    minimumTier: policy.minimumTier,
    periodKey,
    availableSpendablePoints,
    eligibleSubtotalMinor,
    ineligibleSubtotalMinor,
    minimumSubtotalMinor: effectiveMinSubtotal,
    shortfallMinor:
      effectiveMinSubtotal > eligibleSubtotalMinor
        ? effectiveMinSubtotal - eligibleSubtotalMinor
        : BigInt(0),
    pointsValueMinor: BigInt(0),
    tierPercentageCapMinor: BigInt(0),
    perOrderCapMinor: tierRule.perOrderCapMinor,
    remainingMonthlyAllowanceMinor: BigInt(0),
    remainingMonthlyCount: 0,
    marginProtectionCapMinor: BigInt(0),
    programmeBudgetRemainingMinor:
      policy.programmeBudgetMinor !== null
        ? policy.programmeBudgetMinor - policy.programmeSpentMinor
        : null,
    maxPermittedDiscountMinor: BigInt(0),
    requestedPoints: requestedPoints ?? 0,
    appliedPoints: 0,
    appliedDiscountMinor: BigInt(0),
    allocations: [],
  });

  if (policy.emergencyPaused) {
    return baseEmpty('Points redemption is temporarily paused by Atelier administration.');
  }

  if (TIER_RANK[tier] < TIER_RANK[policy.minimumTier] || !tierRule.enabled) {
    return baseEmpty(`Unlock ${policy.minimumTier} tier to access Atelier skincare points redemption.`);
  }

  const usedCount = alreadyCommittedCount + alreadyReservedCount;
  const remainingMonthlyCount = Math.max(0, tierRule.frequencyLimit - usedCount);
  if (remainingMonthlyCount <= 0) {
    return baseEmpty(`Monthly redemption limit (${tierRule.frequencyLimit} orders) reached for ${periodKey}.`);
  }

  const usedAllowance = alreadyCommittedMinor + alreadyReservedMinor;
  const remainingMonthlyAllowanceMinor =
    tierRule.monthlyCapMinor > usedAllowance ? tierRule.monthlyCapMinor - usedAllowance : BigInt(0);
  if (remainingMonthlyAllowanceMinor <= BigInt(0)) {
    return baseEmpty(`Monthly discount allowance reached for ${periodKey}.`);
  }

  let eligibleSubtotalMinor = BigInt(0);
  let ineligibleSubtotalMinor = BigInt(0);
  let marginProtectionCapMinor = BigInt(0);

  const eligibleLines: Array<{
    item: BasketItemForQuote;
    subtotal: bigint;
    maxMarginDiscount: bigint;
  }> = [];

  for (const item of items) {
    const lineSubtotal = item.unitPriceMinor * BigInt(item.quantity);
    const rule = item.rule;

    if (rule && !rule.enabled) {
      ineligibleSubtotalMinor += lineSubtotal;
      continue;
    }
    if (item.hasActivePromotion && !(policy.allowPromoStacking || rule?.allowPromoStacking)) {
      ineligibleSubtotalMinor += lineSubtotal;
      continue;
    }
    if (item.costPriceMinor === null || item.costPriceMinor < BigInt(0)) {
      // Exclude products whose profitability cannot be verified
      ineligibleSubtotalMinor += lineSubtotal;
      continue;
    }

    const lineCost = item.costPriceMinor * BigInt(item.quantity);
    const feeReserve = (lineSubtotal * BigInt(policy.processingFeeBps)) / BigInt(10000);
    const floorBps = rule?.marginFloorBps ?? policy.marginFloorBps;
    const minContribution = (lineSubtotal * BigInt(floorBps)) / BigInt(10000);
    const rawHeadroom = lineSubtotal - lineCost - feeReserve - minContribution;
    const marginHeadroom = rawHeadroom > BigInt(0) ? rawHeadroom : BigInt(0);

    const productCap =
      rule?.maxDiscountBps != null
        ? (lineSubtotal * BigInt(rule.maxDiscountBps)) / BigInt(10000)
        : lineSubtotal;

    const lineMaxDiscount = marginHeadroom < productCap ? marginHeadroom : productCap;

    eligibleSubtotalMinor += lineSubtotal;
    marginProtectionCapMinor += lineMaxDiscount;
    eligibleLines.push({ item, subtotal: lineSubtotal, maxMarginDiscount: lineMaxDiscount });
  }

  if (eligibleSubtotalMinor < effectiveMinSubtotal) {
    return baseEmpty(
      `Add ₦${Number((effectiveMinSubtotal - eligibleSubtotalMinor) / BigInt(100)).toLocaleString()} more in eligible skincare to reach your ${tier} minimum (₦${Number(effectiveMinSubtotal / BigInt(100)).toLocaleString()}).`,
      eligibleSubtotalMinor,
      ineligibleSubtotalMinor
    );
  }

  // Account for flat processing fee reserve once at basket level
  if (marginProtectionCapMinor > policy.processingFeeFlatMinor) {
    marginProtectionCapMinor -= policy.processingFeeFlatMinor;
  } else {
    marginProtectionCapMinor = BigInt(0);
  }

  const spendableBlocks = Math.floor(Math.max(0, availableSpendablePoints) / policy.pointsPerUnit);
  const pointsValueMinor = BigInt(spendableBlocks) * policy.valuePerUnitMinor;
  const tierPercentageCapMinor = (eligibleSubtotalMinor * BigInt(tierRule.maxDiscountBps)) / BigInt(10000);

  const programmeBudgetRemainingMinor =
    policy.programmeBudgetMinor !== null
      ? policy.programmeBudgetMinor > policy.programmeSpentMinor
        ? policy.programmeBudgetMinor - policy.programmeSpentMinor
        : BigInt(0)
      : null;

  const caps: bigint[] = [
    pointsValueMinor,
    tierPercentageCapMinor,
    tierRule.perOrderCapMinor,
    remainingMonthlyAllowanceMinor,
    marginProtectionCapMinor,
  ];
  if (programmeBudgetRemainingMinor !== null) {
    caps.push(programmeBudgetRemainingMinor);
  }

  let maxRawDiscount = caps[0];
  for (const c of caps) {
    if (c < maxRawDiscount) maxRawDiscount = c;
  }

  const maxBlocks = Number(maxRawDiscount / policy.valuePerUnitMinor);
  const maxPermittedDiscountMinor = BigInt(maxBlocks) * policy.valuePerUnitMinor;

  if (maxBlocks <= 0) {
    return baseEmpty(
      'Insufficient points or margin headroom for redemption on this basket.',
      eligibleSubtotalMinor,
      ineligibleSubtotalMinor
    );
  }

  const targetPoints =
    requestedPoints !== undefined
      ? Math.max(0, Math.min(requestedPoints, maxBlocks * policy.pointsPerUnit))
      : maxBlocks * policy.pointsPerUnit;

  const appliedBlocks = Math.floor(targetPoints / policy.pointsPerUnit);
  const appliedPoints = appliedBlocks * policy.pointsPerUnit;
  const appliedDiscountMinor = BigInt(appliedBlocks) * policy.valuePerUnitMinor;

  // Allocate discount proportionally across eligible lines
  const allocations: QuoteAllocation[] = [];
  let remainingDiscount = appliedDiscountMinor;
  let remainingPoints = appliedPoints;

  for (let i = 0; i < eligibleLines.length; i++) {
    const line = eligibleLines[i];
    const isLast = i === eligibleLines.length - 1;
    let lineDiscount = BigInt(0);
    let linePoints = 0;

    if (appliedDiscountMinor > BigInt(0) && marginProtectionCapMinor > BigInt(0)) {
      if (isLast) {
        lineDiscount = remainingDiscount;
        linePoints = remainingPoints;
      } else {
        lineDiscount = (appliedDiscountMinor * line.maxMarginDiscount) / marginProtectionCapMinor;
        if (lineDiscount > remainingDiscount) lineDiscount = remainingDiscount;
        linePoints = Number((BigInt(appliedPoints) * lineDiscount) / appliedDiscountMinor);
      }
      remainingDiscount -= lineDiscount;
      remainingPoints -= linePoints;
    }

    allocations.push({
      variantId: line.item.variantId,
      orderItemId: line.item.orderItemId,
      eligibleSubtotalMinor: line.subtotal,
      maxMarginDiscountMinor: line.maxMarginDiscount,
      allocatedDiscountMinor: lineDiscount,
      allocatedPoints: linePoints,
    });
  }

  return {
    eligible: true,
    policyVersionId: policy.id,
    policyVersion: policy.version,
    tier,
    minimumTier: policy.minimumTier,
    periodKey,
    availableSpendablePoints,
    eligibleSubtotalMinor,
    ineligibleSubtotalMinor,
    minimumSubtotalMinor: effectiveMinSubtotal,
    shortfallMinor: BigInt(0),
    pointsValueMinor,
    tierPercentageCapMinor,
    perOrderCapMinor: tierRule.perOrderCapMinor,
    remainingMonthlyAllowanceMinor,
    remainingMonthlyCount,
    marginProtectionCapMinor,
    programmeBudgetRemainingMinor,
    maxPermittedDiscountMinor,
    requestedPoints: targetPoints,
    appliedPoints,
    appliedDiscountMinor,
    allocations,
  };
}

/**
 * Releases expired ACTIVE points reservations and restores monthly allowance reserved counters.
 */
export async function releaseExpiredPointsReservations(userId?: string): Promise<number> {
  const now = new Date();
  const expired = await db.pointsReservation.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: PointsReservationStatus.ACTIVE,
      expiresAt: { lte: now },
    },
    take: 50,
  });

  let count = 0;
  for (const res of expired) {
    await db.$transaction(async (tx) => {
      const updated = await tx.pointsReservation.updateMany({
        where: { id: res.id, status: PointsReservationStatus.ACTIVE },
        data: { status: PointsReservationStatus.EXPIRED, releasedAt: now },
      });
      if (updated.count === 0) return;

      await tx.redemptionAllowance.updateMany({
        where: {
          userId: res.userId,
          periodKey: res.periodKey,
          reservedAmountMinor: { gte: res.discountMinor },
          reservedCount: { gte: 1 },
        },
        data: {
          reservedAmountMinor: { decrement: res.discountMinor },
          reservedCount: { decrement: 1 },
        },
      });
      count += 1;
    });
  }
  return count;
}

/**
 * Computes available spendable points minus any active (uncommitted) points reservations.
 */
export async function getAvailablePointsForRedemption(
  tx: Prisma.TransactionClient | typeof db,
  userId: string
): Promise<{ spendableBalance: number; reservedPoints: number; availablePoints: number }> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { spendableBalance: true },
  });
  const spendableBalance = user?.spendableBalance ?? 0;

  const activeAgg = await tx.pointsReservation.aggregate({
    where: {
      userId,
      status: PointsReservationStatus.ACTIVE,
      expiresAt: { gt: new Date() },
    },
    _sum: { points: true },
  });

  const reservedPoints = activeAgg._sum.points ?? 0;
  return {
    spendableBalance,
    reservedPoints,
    availablePoints: Math.max(0, spendableBalance - reservedPoints),
  };
}

export async function commitPointsRedemptionInTx(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const reservation = await tx.pointsReservation.findUnique({
    where: { orderId },
  });
  if (!reservation) return;
  if (reservation.status === PointsReservationStatus.COMMITTED) return;
  if (reservation.status !== PointsReservationStatus.ACTIVE) {
    throw new Error(`Cannot commit points reservation in status ${reservation.status}`);
  }

  const now = new Date();
  const claimed = await tx.pointsReservation.updateMany({
    where: { id: reservation.id, status: PointsReservationStatus.ACTIVE },
    data: { status: PointsReservationStatus.COMMITTED, committedAt: now },
  });
  if (claimed.count === 0) return;

  await postLedger(tx, {
    userId: reservation.userId,
    type: 'ATELIER_REDEMPTION',
    amount: -reservation.points,
    balanceKind: 'SPENDABLE',
    refType: 'ATELIER_ORDER',
    refId: orderId,
    idempotencyKey: `atelier-redemption:${orderId}`,
  });

  await tx.redemptionAllowance.upsert({
    where: {
      userId_periodKey: { userId: reservation.userId, periodKey: reservation.periodKey },
    },
    update: {
      reservedAmountMinor: { decrement: reservation.discountMinor },
      reservedCount: { decrement: 1 },
      committedAmountMinor: { increment: reservation.discountMinor },
      committedCount: { increment: 1 },
    },
    create: {
      userId: reservation.userId,
      periodKey: reservation.periodKey,
      committedAmountMinor: reservation.discountMinor,
      reservedAmountMinor: BigInt(0),
      committedCount: 1,
      reservedCount: 0,
    },
  });

  await tx.redemptionPolicyVersion.update({
    where: { id: reservation.policyVersionId },
    data: { programmeSpentMinor: { increment: reservation.discountMinor } },
  });

  const orderItems = await tx.orderItem.findMany({
    where: { orderId },
    orderBy: { id: 'asc' },
  });

  const redemption = await tx.pointsRedemption.create({
    data: {
      userId: reservation.userId,
      orderId,
      reservationId: reservation.id,
      policyVersionId: reservation.policyVersionId,
      points: reservation.points,
      discountMinor: reservation.discountMinor,
      periodKey: reservation.periodKey,
    },
  });

  const totalItemDiscount = orderItems.reduce((acc, i) => acc + i.discountMinor, BigInt(0));
  let remainingPoints = reservation.points;

  for (let idx = 0; idx < orderItems.length; idx++) {
    const item = orderItems[idx];
    if (item.discountMinor <= BigInt(0)) continue;
    const isLast = idx === orderItems.length - 1;
    const pts = isLast
      ? remainingPoints
      : totalItemDiscount > BigInt(0)
        ? Number((BigInt(reservation.points) * item.discountMinor) / totalItemDiscount)
        : 0;
    remainingPoints -= pts;

    await tx.redemptionAllocation.create({
      data: {
        redemptionId: redemption.id,
        orderItemId: item.id,
        variantId: item.variantId,
        points: pts,
        discountMinor: item.discountMinor,
      },
    });
  }
}

export async function releasePointsReservationInTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  targetStatus: 'RELEASED' | 'EXPIRED' = 'RELEASED'
): Promise<void> {
  const reservation = await tx.pointsReservation.findUnique({ where: { orderId } });
  if (!reservation || reservation.status !== PointsReservationStatus.ACTIVE) return;

  const now = new Date();
  const updated = await tx.pointsReservation.updateMany({
    where: { id: reservation.id, status: PointsReservationStatus.ACTIVE },
    data: { status: targetStatus, releasedAt: now },
  });
  if (updated.count === 0) return;

  await tx.redemptionAllowance.updateMany({
    where: {
      userId: reservation.userId,
      periodKey: reservation.periodKey,
      reservedAmountMinor: { gte: reservation.discountMinor },
      reservedCount: { gte: 1 },
    },
    data: {
      reservedAmountMinor: { decrement: reservation.discountMinor },
      reservedCount: { decrement: 1 },
    },
  });
}

/**
 * Compensating refund for a finalized Atelier points redemption.
 * Restores cash and points proportionally without ever exceeding original allocated values.
 */
export async function refundPointsRedemption(params: {
  orderId: string;
  refundReference: string;
  refundRatioBps: number; // 10000 = 100% full refund
  reason: string;
  staffId?: string;
}) {
  const { orderId, refundReference, refundRatioBps, reason, staffId } = params;
  if (refundRatioBps <= 0 || refundRatioBps > 10000) {
    throw new Error('refundRatioBps must be between 1 and 10000');
  }

  return db.$transaction(async (tx) => {
    const redemption = await tx.pointsRedemption.findUnique({
      where: { orderId },
      include: { refunds: true },
    });
    if (!redemption) {
      throw new Error('No finalized points redemption found for this order');
    }

    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const alreadyRestoredPoints = redemption.refunds.reduce((s, r) => s + r.restoredPoints, 0);
    const alreadyRestoredDiscount = redemption.refunds.reduce((s, r) => s + r.restoredDiscountMinor, BigInt(0));
    const alreadyRestoredCash = redemption.refunds.reduce((s, r) => s + r.restoredCashMinor, BigInt(0));

    const maxRestorablePoints = redemption.points - alreadyRestoredPoints;
    const maxRestorableDiscount = redemption.discountMinor - alreadyRestoredDiscount;
    const maxRestorableCash = order.totalMinor - alreadyRestoredCash;

    const restoredPoints = Math.min(
      maxRestorablePoints,
      Math.floor((redemption.points * refundRatioBps) / 10000)
    );
    const rawDiscount = (redemption.discountMinor * BigInt(refundRatioBps)) / BigInt(10000);
    const restoredDiscountMinor = rawDiscount < maxRestorableDiscount ? rawDiscount : maxRestorableDiscount;
    const rawCash = (order.totalMinor * BigInt(refundRatioBps)) / BigInt(10000);
    const restoredCashMinor = rawCash < maxRestorableCash ? rawCash : maxRestorableCash;

    if (restoredPoints > 0) {
      await postLedger(tx, {
        userId: redemption.userId,
        type: 'ATELIER_REDEMPTION_REFUND',
        amount: restoredPoints,
        balanceKind: 'SPENDABLE',
        refType: 'ATELIER_REFUND',
        refId: refundReference,
        idempotencyKey: `atelier-refund:${refundReference}`,
      });
    }

    return tx.redemptionRefund.create({
      data: {
        redemptionId: redemption.id,
        orderId,
        refundReference,
        restoredPoints,
        restoredDiscountMinor,
        restoredCashMinor,
        reason,
        createdById: staffId ?? null,
      },
    });
  });
}
