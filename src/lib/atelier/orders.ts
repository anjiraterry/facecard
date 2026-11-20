import crypto from 'node:crypto';
import { db } from '@/lib/db';
import {
  CheckoutStatus,
  FulfilmentStatus,
  InventoryMovementType,
  OrderStatus,
  PaymentStatus,
  PointsReservationStatus,
  Prisma,
  ReservationStatus,
} from '@prisma/client';
import {
  calculateRedemptionQuote,
  commitPointsRedemptionInTx,
  getActiveRedemptionPolicy,
  getAvailablePointsForRedemption,
  getLagosPeriodKey,
  releaseExpiredPointsReservations,
  releasePointsReservationInTx,
} from './redemption';

const CHECKOUT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class AtelierOrderError extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
    this.name = 'AtelierOrderError';
  }
}

export async function getOrCreateActiveBag(userId: string) {
  const existing = await db.shoppingBag.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { include: { brand: true, images: { where: { isPrimary: true }, take: 1 } } },
              inventoryLevels: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (existing) return existing;

  return db.shoppingBag.create({
    data: { userId, status: 'ACTIVE', currency: 'NGN' },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { include: { brand: true, images: { where: { isPrimary: true }, take: 1 } } },
              inventoryLevels: true,
            },
          },
        },
      },
    },
  });
}

export async function calculateShippingQuote(state: string): Promise<{
  zoneCode: string;
  zoneName: string;
  amountMinor: bigint;
  currency: string;
  estimatedDays: string | null;
}> {
  const normalizedState = state.trim().toLowerCase();
  const zones = await db.deliveryZone.findMany({
    where: { active: true },
    include: { rates: { where: { active: true }, orderBy: { amountMinor: 'asc' }, take: 1 } },
  });

  for (const zone of zones) {
    if (zone.states.some((s) => s.toLowerCase() === normalizedState) && zone.rates[0]) {
      return {
        zoneCode: zone.code,
        zoneName: zone.name,
        amountMinor: zone.rates[0].amountMinor,
        currency: zone.rates[0].currency,
        estimatedDays: zone.rates[0].estimatedDays,
      };
    }
  }

  // Fallback flat rate if no zone configured yet
  return {
    zoneCode: 'NG_STANDARD',
    zoneName: 'Standard Nationwide Delivery',
    amountMinor: BigInt(350_000), // NGN 3,500
    currency: 'NGN',
    estimatedDays: '2-5 business days',
  };
}

/**
 * Releases expired ACTIVE inventory reservations so stock returns to available pool.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();
  const expired = await db.inventoryReservation.findMany({
    where: { status: ReservationStatus.ACTIVE, expiresAt: { lte: now } },
    take: 50,
  });

  let releasedCount = 0;
  for (const res of expired) {
    await db.$transaction(async (tx) => {
      const claimed = await tx.inventoryReservation.updateMany({
        where: { id: res.id, status: ReservationStatus.ACTIVE },
        data: { status: ReservationStatus.EXPIRED, releasedAt: now },
      });
      if (claimed.count === 0) return;

      await tx.inventoryLevel.updateMany({
        where: { variantId: res.variantId, locationId: res.locationId, reserved: { gte: res.quantity } },
        data: { reserved: { decrement: res.quantity }, version: { increment: 1 } },
      });

      await tx.inventoryMovement.create({
        data: {
          variantId: res.variantId,
          locationId: res.locationId,
          type: InventoryMovementType.RESERVATION_RELEASED,
          onHandDelta: 0,
          reservedDelta: -res.quantity,
          referenceType: 'RESERVATION_EXPIRY',
          referenceId: res.id,
          operationKey: `res-expire:${res.id}`,
          reason: 'Checkout reservation expired',
        },
      });

      await tx.checkoutSession.updateMany({
        where: { id: res.checkoutSessionId, status: CheckoutStatus.OPEN },
        data: { status: CheckoutStatus.EXPIRED },
      });

      const orderForSession = await tx.order.findFirst({
        where: { checkoutSessionId: res.checkoutSessionId },
        select: { id: true },
      });
      if (orderForSession) {
        await releasePointsReservationInTx(tx, orderForSession.id, 'EXPIRED');
      }

      releasedCount++;
    });
  }

  await releaseExpiredPointsReservations().catch(() => 0);

  return releasedCount;
}

/**
 * Creates a CheckoutSession, atomically reserves inventory (and points if redeeming), and creates a PENDING_PAYMENT Order.
 */
export async function createCheckoutAndOrder(params: {
  userId: string;
  addressId: string;
  redeemPoints?: number;
}) {
  await releaseExpiredReservations().catch(() => undefined);

  const address = await db.address.findFirst({
    where: { id: params.addressId, userId: params.userId },
  });
  if (!address) {
    throw new AtelierOrderError('Delivery address not found', 404);
  }

  const bag = await getOrCreateActiveBag(params.userId);
  if (bag.items.length === 0) {
    throw new AtelierOrderError('Your shopping bag is empty', 400);
  }

  const defaultLocation = await db.inventoryLocation.findFirst({
    where: { active: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  if (!defaultLocation) {
    throw new AtelierOrderError('No active inventory location configured', 503);
  }

  const shipping = await calculateShippingQuote(address.state);

  let subtotalMinor = BigInt(0);
  const lineSnapshots: Array<{
    variantId: string;
    productNameSnapshot: string;
    brandNameSnapshot: string;
    variantNameSnapshot: string;
    skuSnapshot: string;
    imageKeySnapshot: string | null;
    quantity: number;
    unitPriceMinor: bigint;
    discountMinor: bigint;
    lineTotalMinor: bigint;
  }> = [];

  for (const item of bag.items) {
    if (!item.variant.isActive || item.variant.product.status !== 'PUBLISHED') {
      throw new AtelierOrderError(`${item.variant.product.name} is no longer available`, 400);
    }
    const lineTotal = item.variant.priceMinor * BigInt(item.quantity);
    subtotalMinor += lineTotal;
    lineSnapshots.push({
      variantId: item.variantId,
      productNameSnapshot: item.variant.product.name,
      brandNameSnapshot: item.variant.product.brand.name,
      variantNameSnapshot: item.variant.name,
      skuSnapshot: item.variant.sku,
      imageKeySnapshot: item.variant.product.images[0]?.objectKey ?? null,
      quantity: item.quantity,
      unitPriceMinor: item.variant.priceMinor,
      discountMinor: BigInt(0),
      lineTotalMinor: lineTotal,
    });
  }

  const requestedPoints =
    typeof params.redeemPoints === 'number' ? params.redeemPoints : bag.pendingPointsToRedeem ?? 0;

  let discountMinor = BigInt(0);
  let pointsRedeemed = 0;
  let redemptionPolicyId: string | null = null;
  const periodKey = getLagosPeriodKey();

  if (requestedPoints > 0) {
    const [user, policy, allowance, productRules, pointsAvail] = await Promise.all([
      db.user.findUnique({ where: { id: params.userId }, select: { tier: true } }),
      getActiveRedemptionPolicy(),
      db.redemptionAllowance.findUnique({
        where: { userId_periodKey: { userId: params.userId, periodKey } },
      }),
      db.productRedemptionRule.findMany({
        where: { variantId: { in: bag.items.map((i) => i.variantId) } },
      }),
      getAvailablePointsForRedemption(db, params.userId),
    ]);

    if (!user) throw new AtelierOrderError('User not found', 404);
    const ruleByVariant = new Map(productRules.map((r) => [r.variantId, r]));

    const quote = calculateRedemptionQuote({
      policy,
      tier: user.tier,
      availableSpendablePoints: pointsAvail.availablePoints,
      alreadyCommittedMinor: allowance?.committedAmountMinor ?? BigInt(0),
      alreadyReservedMinor: allowance?.reservedAmountMinor ?? BigInt(0),
      alreadyCommittedCount: allowance?.committedCount ?? 0,
      alreadyReservedCount: allowance?.reservedCount ?? 0,
      items: bag.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPriceMinor: i.variant.priceMinor,
        costPriceMinor: i.variant.costPriceMinor,
        hasActivePromotion:
          i.variant.compareAtPriceMinor != null && i.variant.compareAtPriceMinor > i.variant.priceMinor,
        rule: ruleByVariant.get(i.variantId) ?? null,
      })),
      requestedPoints,
      periodKey,
    });

    if (!quote.eligible || quote.appliedPoints <= 0) {
      throw new AtelierOrderError(quote.reason || 'Points redemption is not eligible for this basket', 400);
    }

    discountMinor = quote.appliedDiscountMinor;
    pointsRedeemed = quote.appliedPoints;
    redemptionPolicyId = quote.policyVersionId;

    const allocByVariant = new Map(quote.allocations.map((a) => [a.variantId, a.allocatedDiscountMinor]));
    for (const snap of lineSnapshots) {
      const alloc = allocByVariant.get(snap.variantId) ?? BigInt(0);
      snap.discountMinor = alloc;
      snap.lineTotalMinor = snap.lineTotalMinor - alloc;
    }
  }

  const shippingMinor = shipping.amountMinor;
  const taxMinor = BigInt(0);
  const totalMinor = subtotalMinor - discountMinor + shippingMinor + taxMinor;
  const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);
  const orderNumber = `ATL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  return db.$transaction(async (tx) => {
    const checkout = await tx.checkoutSession.create({
      data: {
        userId: params.userId,
        bagId: bag.id,
        status: CheckoutStatus.OPEN,
        currency: 'NGN',
        subtotalMinor,
        discountMinor,
        pointsRedeemed,
        shippingMinor,
        taxMinor,
        totalMinor,
        addressSnapshot: {
          recipientName: address.recipientName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          country: address.country,
          postalCode: address.postalCode,
        } as Prisma.InputJsonValue,
        expiresAt,
      },
    });

    // Atomically reserve stock for each item
    for (const item of bag.items) {
      const updated = await tx.$executeRaw`
        UPDATE "InventoryLevel"
        SET "reserved" = "reserved" + ${item.quantity},
            "version" = "version" + 1,
            "updatedAt" = NOW()
        WHERE "variantId" = ${item.variantId}::uuid
          AND "locationId" = ${defaultLocation.id}::uuid
          AND ("onHand" - "reserved") >= ${item.quantity}
      `;

      if (updated === 0) {
        throw new AtelierOrderError(`Insufficient stock for ${item.variant.product.name}`, 409);
      }

      const reservation = await tx.inventoryReservation.create({
        data: {
          checkoutSessionId: checkout.id,
          variantId: item.variantId,
          locationId: defaultLocation.id,
          quantity: item.quantity,
          status: ReservationStatus.ACTIVE,
          expiresAt,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          locationId: defaultLocation.id,
          type: InventoryMovementType.RESERVED,
          onHandDelta: 0,
          reservedDelta: item.quantity,
          referenceType: 'CHECKOUT_SESSION',
          referenceId: checkout.id,
          operationKey: `reserve:${checkout.id}:${reservation.id}`,
          performedById: params.userId,
        },
      });
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: params.userId,
        checkoutSessionId: checkout.id,
        currency: 'NGN',
        subtotalMinor,
        discountMinor,
        pointsRedeemed,
        shippingMinor,
        taxMinor,
        totalMinor,
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        fulfilmentStatus: FulfilmentStatus.UNFULFILLED,
        items: {
          create: lineSnapshots,
        },
        address: {
          create: {
            recipientName: address.recipientName,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            country: address.country,
            postalCode: address.postalCode,
          },
        },
        statusEvents: {
          create: {
            fromStatus: null,
            toStatus: OrderStatus.PENDING_PAYMENT,
            note: 'Order created and inventory reserved',
            actorId: params.userId,
          },
        },
      },
      include: { items: true, address: true },
    });

    await tx.shoppingBag.update({
      where: { id: bag.id },
      data: { status: 'CONVERTED', pendingPointsToRedeem: 0, version: { increment: 1 } },
    });

    if (pointsRedeemed > 0 && redemptionPolicyId) {
      // Concurrency-safe re-check inside transaction
      const avail = await getAvailablePointsForRedemption(tx, params.userId);
      if (avail.availablePoints < pointsRedeemed) {
        throw new AtelierOrderError('Insufficient available points (active checkout reservation in progress).', 409);
      }

      const policy = await tx.redemptionPolicyVersion.findUnique({
        where: { id: redemptionPolicyId },
        include: { tierRules: true },
      });
      const userTierRow = await tx.user.findUnique({ where: { id: params.userId }, select: { tier: true } });
      const tierRule = policy?.tierRules.find((r) => r.tier === userTierRow?.tier);
      const allowance = await tx.redemptionAllowance.findUnique({
        where: { userId_periodKey: { userId: params.userId, periodKey } },
      });

      if (tierRule) {
        const usedAmt = (allowance?.committedAmountMinor ?? BigInt(0)) + (allowance?.reservedAmountMinor ?? BigInt(0));
        const usedCnt = (allowance?.committedCount ?? 0) + (allowance?.reservedCount ?? 0);
        if (usedAmt + discountMinor > tierRule.monthlyCapMinor || usedCnt + 1 > tierRule.frequencyLimit) {
          throw new AtelierOrderError('Monthly Atelier redemption allowance exceeded by a concurrent checkout.', 409);
        }
      }

      await tx.pointsReservation.create({
        data: {
          userId: params.userId,
          orderId: order.id,
          checkoutSessionId: checkout.id,
          policyVersionId: redemptionPolicyId,
          points: pointsRedeemed,
          discountMinor,
          periodKey,
          status: PointsReservationStatus.ACTIVE,
          expiresAt,
        },
      });

      await tx.redemptionAllowance.upsert({
        where: { userId_periodKey: { userId: params.userId, periodKey } },
        update: {
          reservedAmountMinor: { increment: discountMinor },
          reservedCount: { increment: 1 },
        },
        create: {
          userId: params.userId,
          periodKey,
          committedAmountMinor: BigInt(0),
          reservedAmountMinor: discountMinor,
          committedCount: 0,
          reservedCount: 1,
        },
      });
    }

    return { checkout, order };
  });
}

/**
 * Finalizes payment atomically once Paystack confirms amount + currency match.
 * Handles late payments after reservation expiry by attempting atomic stock reacquisition.
 */
export async function finalizePaidOrder(params: {
  reference: string;
  paidAmountMinor: bigint;
  currency: string;
  providerTransactionId?: string;
}) {
  const txRecord = await db.paymentTransaction.findUnique({
    where: { reference: params.reference },
    include: {
      order: {
        include: {
          items: true,
          checkoutSession: { include: { reservations: true } },
        },
      },
    },
  });

  if (!txRecord) {
    throw new AtelierOrderError('Payment transaction not found', 404);
  }

  if (txRecord.status === PaymentStatus.PAID || txRecord.order.paymentStatus === PaymentStatus.PAID) {
    return { alreadyProcessed: true, order: txRecord.order };
  }

  if (params.paidAmountMinor !== txRecord.amountMinor || params.currency !== txRecord.currency) {
    throw new AtelierOrderError('Payment amount or currency mismatch', 400);
  }

  return db.$transaction(async (tx) => {
    const claimed = await tx.paymentTransaction.updateMany({
      where: { id: txRecord.id, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.PAID,
        providerTransactionId: params.providerTransactionId,
        verifiedAt: new Date(),
      },
    });
    if (claimed.count === 0) {
      return { alreadyProcessed: true, order: txRecord.order };
    }

    const reservations = txRecord.order.checkoutSession.reservations;
    let stockReacquired = true;

    for (const res of reservations) {
      if (res.status === ReservationStatus.ACTIVE) {
        await tx.inventoryReservation.update({
          where: { id: res.id },
          data: { status: ReservationStatus.CONSUMED, consumedAt: new Date() },
        });
        await tx.inventoryLevel.updateMany({
          where: {
            variantId: res.variantId,
            locationId: res.locationId,
            onHand: { gte: res.quantity },
            reserved: { gte: res.quantity },
          },
          data: {
            onHand: { decrement: res.quantity },
            reserved: { decrement: res.quantity },
            version: { increment: 1 },
          },
        });
        await tx.inventoryMovement.create({
          data: {
            variantId: res.variantId,
            locationId: res.locationId,
            type: InventoryMovementType.SALE,
            onHandDelta: -res.quantity,
            reservedDelta: -res.quantity,
            referenceType: 'ORDER',
            referenceId: txRecord.orderId,
            operationKey: `sale:${txRecord.orderId}:${res.id}`,
          },
        });
      } else {
        // Late payment path: reservation expired; attempt atomic reacquisition from available stock
        const reacquired = await tx.$executeRaw`
          UPDATE "InventoryLevel"
          SET "onHand" = "onHand" - ${res.quantity},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE "variantId" = ${res.variantId}::uuid
            AND "locationId" = ${res.locationId}::uuid
            AND ("onHand" - "reserved") >= ${res.quantity}
        `;
        if (reacquired === 0) {
          stockReacquired = false;
        } else {
          await tx.inventoryMovement.create({
            data: {
              variantId: res.variantId,
              locationId: res.locationId,
              type: InventoryMovementType.SALE,
              onHandDelta: -res.quantity,
              reservedDelta: 0,
              referenceType: 'ORDER_LATE_PAYMENT',
              referenceId: txRecord.orderId,
              operationKey: `sale-late:${txRecord.orderId}:${res.id}`,
            },
          });
        }
      }
    }

    let pointsCommitted = true;
    if (txRecord.order.pointsRedeemed > 0) {
      const ptsRes = await tx.pointsReservation.findUnique({
        where: { orderId: txRecord.orderId },
      });
      if (!ptsRes || ptsRes.status !== PointsReservationStatus.ACTIVE || ptsRes.expiresAt <= new Date()) {
        pointsCommitted = false;
      } else if (stockReacquired) {
        await commitPointsRedemptionInTx(tx, txRecord.orderId);
      }
    }

    const canConfirm = stockReacquired && pointsCommitted;
    const updatedOrder = await tx.order.update({
      where: { id: txRecord.orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: canConfirm ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT,
        paidAt: new Date(),
        statusEvents: {
          create: {
            fromStatus: txRecord.order.orderStatus,
            toStatus: canConfirm
              ? OrderStatus.CONFIRMED
              : !pointsCommitted
                ? 'NEEDS_POINTS_RECONCILIATION'
                : 'NEEDS_STOCK_RESOLUTION',
            note: canConfirm
              ? 'Payment verified, inventory consumed, and points redemption committed'
              : !pointsCommitted
                ? 'Late payment received after points reservation expiry; requires reconciliation'
                : 'Late payment received after reservation expiry; insufficient stock for automatic confirmation',
          },
        },
      },
    });

    await tx.checkoutSession.update({
      where: { id: txRecord.order.checkoutSessionId },
      data: { status: CheckoutStatus.COMPLETED },
    });

    return { alreadyProcessed: false, stockReacquired, order: updatedOrder };
  });
}
