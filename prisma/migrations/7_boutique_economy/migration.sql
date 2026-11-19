-- Migration 7: Boutique, Vanity, Effect Engine, Collections, and Social Gifting
-- Safe additive migration preserving existing ShopItem, UserItem, Purchase, PointsLedger, and Card rows.

-- 1. Extend LedgerType enum
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'BOUTIQUE_REFUND';
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'ACTIVITY_BONUS';

-- 2. New Boutique enums
DO $$ BEGIN
  CREATE TYPE "BoutiqueItemStatus" AS ENUM ('DRAFT', 'VALIDATED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'PAUSED', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ItemRarity" AS ENUM ('ESSENTIAL', 'SIGNATURE', 'COLLECTOR', 'EXCLUSIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EquipmentSlot" AS ENUM (
    'CARD_SKIN', 'CARD_FRAME', 'AVATAR_FRAME', 'AVATAR_EFFECT',
    'PROFILE_BACKGROUND', 'PROFILE_EFFECT', 'PROFILE_TITLE', 'NAMEPLATE',
    'ARENA_ENTRANCE', 'ARENA_VICTORY', 'ARENA_THEME', 'SHARE_TEMPLATE', 'ROUTINE_THEME'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EffectKind" AS ENUM (
    'EQUIP_COSMETIC', 'STREAK_PROTECTION', 'REWARD_MULTIPLIER', 'FEATURE_ENTITLEMENT',
    'CAPACITY_INCREASE', 'SOCIAL_GIFT', 'PROFILE_SHOWCASE', 'EXPORT_ENTITLEMENT', 'COLLECTION_COMPLETION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ActiveEffectStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SocialGiftStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BoutiqueRefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Extend ShopItem
ALTER TABLE "ShopItem"
  ADD COLUMN IF NOT EXISTS "sku" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'CARDS',
  ADD COLUMN IF NOT EXISTS "rarity" "ItemRarity" NOT NULL DEFAULT 'ESSENTIAL',
  ADD COLUMN IF NOT EXISTS "status" "BoutiqueItemStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "slot" "EquipmentSlot",
  ADD COLUMN IF NOT EXISTS "effectKind" "EffectKind",
  ADD COLUMN IF NOT EXISTS "effectConfig" JSONB,
  ADD COLUMN IF NOT EXISTS "isGiftable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "currentVersionId" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "ShopItem_sku_key" ON "ShopItem"("sku");

-- 4. ShopItemVersion
CREATE TABLE IF NOT EXISTS "ShopItemVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "itemId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "rarity" "ItemRarity" NOT NULL DEFAULT 'ESSENTIAL',
  "pricePoints" INTEGER NOT NULL,
  "ownershipPolicy" TEXT NOT NULL DEFAULT 'PERMANENT',
  "giftPolicy" JSONB,
  "maxOwned" INTEGER NOT NULL DEFAULT 1,
  "effectKind" "EffectKind" NOT NULL,
  "effectConfig" JSONB NOT NULL,
  "handlerVersion" TEXT NOT NULL DEFAULT '1.0',
  "assetRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopItemVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShopItemVersion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopItemVersion_itemId_version_key" ON "ShopItemVersion"("itemId", "version");
CREATE INDEX IF NOT EXISTS "ShopItemVersion_itemId_idx" ON "ShopItemVersion"("itemId");

-- 5. Extend Purchase
ALTER TABLE "Purchase"
  ADD COLUMN IF NOT EXISTS "itemVersionId" UUID,
  ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_itemVersionId_fkey"
    FOREIGN KEY ("itemVersionId") REFERENCES "ShopItemVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. UserEquipment
CREATE TABLE IF NOT EXISTS "UserEquipment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "slot" "EquipmentSlot" NOT NULL,
  "userItemId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserEquipment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserEquipment_userItemId_fkey" FOREIGN KEY ("userItemId") REFERENCES "UserItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserEquipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserEquipment_userId_slot_key" ON "UserEquipment"("userId", "slot");
CREATE INDEX IF NOT EXISTS "UserEquipment_userId_idx" ON "UserEquipment"("userId");

-- 7. ActiveEffect & EffectExecution
CREATE TABLE IF NOT EXISTS "ActiveEffect" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "userItemId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "effectKind" "EffectKind" NOT NULL,
  "config" JSONB NOT NULL,
  "status" "ActiveEffectStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "remainingUses" INTEGER,
  "remainingBonusPoints" INTEGER,
  "terminalReason" TEXT,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActiveEffect_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActiveEffect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ActiveEffect_userItemId_fkey" FOREIGN KEY ("userItemId") REFERENCES "UserItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ActiveEffect_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ActiveEffect_userId_status_idx" ON "ActiveEffect"("userId", "status");
CREATE INDEX IF NOT EXISTS "ActiveEffect_expiresAt_idx" ON "ActiveEffect"("expiresAt");

CREATE TABLE IF NOT EXISTS "EffectExecution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "activeEffectId" UUID NOT NULL,
  "eventId" TEXT NOT NULL,
  "targetModule" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "consumedUses" INTEGER NOT NULL DEFAULT 1,
  "bonusPointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EffectExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EffectExecution_activeEffectId_fkey" FOREIGN KEY ("activeEffectId") REFERENCES "ActiveEffect"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "EffectExecution_activeEffectId_eventId_key" ON "EffectExecution"("activeEffectId", "eventId");
CREATE INDEX IF NOT EXISTS "EffectExecution_executedAt_idx" ON "EffectExecution"("executedAt");

-- 8. UserItemMovement
CREATE TABLE IF NOT EXISTS "UserItemMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "userItemId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "quantityDelta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserItemMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserItemMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserItemMovement_userItemId_fkey" FOREIGN KEY ("userItemId") REFERENCES "UserItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserItemMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "UserItemMovement_userId_createdAt_idx" ON "UserItemMovement"("userId", "createdAt");

-- 9. SocialGift, GiftPreference, ShopWishlistItem
CREATE TABLE IF NOT EXISTS "SocialGift" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "senderId" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "itemVersionId" UUID,
  "purchaseId" UUID,
  "status" "SocialGiftStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialGift_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SocialGift_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SocialGift_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SocialGift_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SocialGift_itemVersionId_fkey" FOREIGN KEY ("itemVersionId") REFERENCES "ShopItemVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SocialGift_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SocialGift_recipientId_status_idx" ON "SocialGift"("recipientId", "status");
CREATE INDEX IF NOT EXISTS "SocialGift_senderId_createdAt_idx" ON "SocialGift"("senderId", "createdAt");

CREATE TABLE IF NOT EXISTS "GiftPreference" (
  "userId" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "allowedSenders" TEXT NOT NULL DEFAULT 'ALL',
  "publicDisplay" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftPreference_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "GiftPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ShopWishlistItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopWishlistItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShopWishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ShopWishlistItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopWishlistItem_userId_itemId_key" ON "ShopWishlistItem"("userId", "itemId");
CREATE INDEX IF NOT EXISTS "ShopWishlistItem_userId_idx" ON "ShopWishlistItem"("userId");

-- 10. Collections & BoutiqueRefund
CREATE TABLE IF NOT EXISTS "ShopCollection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "BoutiqueItemStatus" NOT NULL DEFAULT 'PUBLISHED',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopCollection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopCollection_slug_key" ON "ShopCollection"("slug");

CREATE TABLE IF NOT EXISTS "ShopCollectionItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "collectionId" UUID NOT NULL,
  "itemId" UUID NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ShopCollectionItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShopCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ShopCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ShopCollectionItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopCollectionItem_collectionId_itemId_key" ON "ShopCollectionItem"("collectionId", "itemId");

CREATE TABLE IF NOT EXISTS "CollectionCompletion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "collectionId" UUID NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionCompletion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CollectionCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CollectionCompletion_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ShopCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CollectionCompletion_userId_collectionId_key" ON "CollectionCompletion"("userId", "collectionId");

CREATE TABLE IF NOT EXISTS "BoutiqueRefund" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "purchaseId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "pointsRefunded" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "BoutiqueRefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedByStaffId" UUID,
  "approvedByStaffId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "BoutiqueRefund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BoutiqueRefund_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BoutiqueRefund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BoutiqueRefund_status_createdAt_idx" ON "BoutiqueRefund"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "BoutiqueRefund_userId_idx" ON "BoutiqueRefund"("userId");
