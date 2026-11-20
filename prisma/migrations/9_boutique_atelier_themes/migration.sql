-- Migration 9: Boutique detail metadata, Atelier Points Redemption, and Tier-Based Card Themes.
-- Additive and idempotent. Existing balances, ledger rows, orders, and cards are preserved.

ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'ATELIER_REDEMPTION';
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'ATELIER_REDEMPTION_REFUND';

ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "equippedThemeId" TEXT;

ALTER TABLE "ShopItem" ADD COLUMN IF NOT EXISTS "usageInstructions" TEXT;
ALTER TABLE "ShopItem" ADD COLUMN IF NOT EXISTS "endingBehavior" TEXT;
ALTER TABLE "ShopItem" ADD COLUMN IF NOT EXISTS "refundPolicy" TEXT;

ALTER TABLE "ShoppingBag" ADD COLUMN IF NOT EXISTS "pendingPointsToRedeem" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CheckoutSession" ADD COLUMN IF NOT EXISTS "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CardSnapshot" ADD COLUMN IF NOT EXISTS "themeId" TEXT;
ALTER TABLE "CardSnapshot" ADD COLUMN IF NOT EXISTS "themeVersion" INTEGER;
ALTER TABLE "CardSnapshot" ADD COLUMN IF NOT EXISTS "themeSnapshot" JSONB;

DO $$ BEGIN
  CREATE TYPE "RedemptionPolicyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PointsReservationStatus" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ThemeAcquisition" AS ENUM ('TIER_UNLOCK', 'POINTS_PURCHASE', 'ACHIEVEMENT', 'STAFF_GRANT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ThemeMaterial" AS ENUM ('SATIN', 'BRUSHED_METAL', 'PEARLESCENT', 'CERAMIC', 'GLASS', 'STONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CardThemeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "RedemptionPolicyVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "version" INTEGER NOT NULL,
  "status" "RedemptionPolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "minimumTier" "Tier" NOT NULL DEFAULT 'GOLD',
  "pointsPerUnit" INTEGER NOT NULL DEFAULT 100,
  "valuePerUnitMinor" BIGINT NOT NULL DEFAULT 5000,
  "minimumSubtotalMinor" BIGINT NOT NULL DEFAULT 1000000,
  "marginFloorBps" INTEGER NOT NULL DEFAULT 1500,
  "processingFeeBps" INTEGER NOT NULL DEFAULT 150,
  "processingFeeFlatMinor" BIGINT NOT NULL DEFAULT 10000,
  "allowPromoStacking" BOOLEAN NOT NULL DEFAULT false,
  "programmeBudgetMinor" BIGINT,
  "programmeSpentMinor" BIGINT NOT NULL DEFAULT 0,
  "emergencyPaused" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdById" UUID,
  "publishedById" UUID,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RedemptionPolicyVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RedemptionPolicyVersion_version_key" ON "RedemptionPolicyVersion"("version");
CREATE INDEX IF NOT EXISTS "RedemptionPolicyVersion_status_version_idx" ON "RedemptionPolicyVersion"("status", "version");

CREATE TABLE IF NOT EXISTS "TierRedemptionRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "policyVersionId" UUID NOT NULL,
  "tier" "Tier" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "maxDiscountBps" INTEGER NOT NULL DEFAULT 0,
  "minimumSubtotalMinor" BIGINT NOT NULL DEFAULT 1500000,
  "perOrderCapMinor" BIGINT NOT NULL DEFAULT 0,
  "monthlyCapMinor" BIGINT NOT NULL DEFAULT 0,
  "frequencyLimit" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TierRedemptionRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TierRedemptionRule_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "RedemptionPolicyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TierRedemptionRule_policyVersionId_tier_key" ON "TierRedemptionRule"("policyVersionId", "tier");

CREATE TABLE IF NOT EXISTS "ProductRedemptionRule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "variantId" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "maxDiscountBps" INTEGER,
  "marginFloorBps" INTEGER,
  "allowPromoStacking" BOOLEAN NOT NULL DEFAULT false,
  "excludedReason" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductRedemptionRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductRedemptionRule_variantId_key" ON "ProductRedemptionRule"("variantId");

CREATE TABLE IF NOT EXISTS "PointsReservation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "checkoutSessionId" UUID,
  "policyVersionId" UUID NOT NULL,
  "points" INTEGER NOT NULL,
  "discountMinor" BIGINT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "status" "PointsReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "committedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointsReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PointsReservation_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "RedemptionPolicyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PointsReservation_orderId_key" ON "PointsReservation"("orderId");
CREATE INDEX IF NOT EXISTS "PointsReservation_userId_status_idx" ON "PointsReservation"("userId", "status");
CREATE INDEX IF NOT EXISTS "PointsReservation_expiresAt_idx" ON "PointsReservation"("expiresAt");

CREATE TABLE IF NOT EXISTS "PointsRedemption" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "reservationId" UUID NOT NULL,
  "policyVersionId" UUID NOT NULL,
  "points" INTEGER NOT NULL,
  "discountMinor" BIGINT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointsRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PointsRedemption_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "RedemptionPolicyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PointsRedemption_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "PointsReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PointsRedemption_orderId_key" ON "PointsRedemption"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "PointsRedemption_reservationId_key" ON "PointsRedemption"("reservationId");
CREATE INDEX IF NOT EXISTS "PointsRedemption_userId_periodKey_idx" ON "PointsRedemption"("userId", "periodKey");

CREATE TABLE IF NOT EXISTS "RedemptionAllocation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "redemptionId" UUID NOT NULL,
  "orderItemId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "points" INTEGER NOT NULL,
  "discountMinor" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RedemptionAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RedemptionAllocation_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "PointsRedemption"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RedemptionAllocation_redemptionId_idx" ON "RedemptionAllocation"("redemptionId");

CREATE TABLE IF NOT EXISTS "RedemptionRefund" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "redemptionId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "refundReference" TEXT NOT NULL,
  "restoredPoints" INTEGER NOT NULL,
  "restoredDiscountMinor" BIGINT NOT NULL,
  "restoredCashMinor" BIGINT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RedemptionRefund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RedemptionRefund_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "PointsRedemption"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RedemptionRefund_refundReference_key" ON "RedemptionRefund"("refundReference");
CREATE INDEX IF NOT EXISTS "RedemptionRefund_orderId_idx" ON "RedemptionRefund"("orderId");

CREATE TABLE IF NOT EXISTS "RedemptionAllowance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "periodKey" TEXT NOT NULL,
  "committedAmountMinor" BIGINT NOT NULL DEFAULT 0,
  "reservedAmountMinor" BIGINT NOT NULL DEFAULT 0,
  "committedCount" INTEGER NOT NULL DEFAULT 0,
  "reservedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RedemptionAllowance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RedemptionAllowance_userId_periodKey_key" ON "RedemptionAllowance"("userId", "periodKey");

CREATE TABLE IF NOT EXISTS "CardTheme" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "themeId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "collectionName" TEXT NOT NULL,
  "minimumTier" "Tier" NOT NULL DEFAULT 'CLASSIC',
  "acquisition" "ThemeAcquisition" NOT NULL DEFAULT 'POINTS_PURCHASE',
  "pricePoints" INTEGER NOT NULL DEFAULT 0,
  "achievementKey" TEXT,
  "achievementLabel" TEXT,
  "status" "CardThemeStatus" NOT NULL DEFAULT 'PUBLISHED',
  "shopItemId" UUID,
  "backgroundAssetVersionId" TEXT NOT NULL,
  "previewAssetVersionId" TEXT NOT NULL,
  "backgroundImageUrl" TEXT,
  "previewImageUrl" TEXT,
  "textColor" TEXT NOT NULL,
  "mutedTextColor" TEXT,
  "accentColor" TEXT NOT NULL,
  "material" "ThemeMaterial" NOT NULL DEFAULT 'SATIN',
  "reflectionIntensity" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  "maximumTiltDegrees" DOUBLE PRECISION NOT NULL DEFAULT 6,
  "engravingOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
  "grainOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.03,
  "paletteFrom" TEXT NOT NULL,
  "paletteTo" TEXT NOT NULL,
  "compatibleFrameIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "version" INTEGER NOT NULL DEFAULT 1,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardTheme_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CardTheme_themeId_key" ON "CardTheme"("themeId");
CREATE UNIQUE INDEX IF NOT EXISTS "CardTheme_slug_key" ON "CardTheme"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "CardTheme_shopItemId_key" ON "CardTheme"("shopItemId");
CREATE INDEX IF NOT EXISTS "CardTheme_minimumTier_status_idx" ON "CardTheme"("minimumTier", "status");

CREATE TABLE IF NOT EXISTS "CardThemeVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "themeId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "config" JSONB NOT NULL,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardThemeVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CardThemeVersion_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "CardTheme"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CardThemeVersion_themeId_version_key" ON "CardThemeVersion"("themeId", "version");
