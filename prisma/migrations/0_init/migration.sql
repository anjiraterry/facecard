-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('CLASSIC', 'GOLD', 'PLATINUM', 'BLACK');

-- CreateEnum
CREATE TYPE "Band" AS ENUM ('HARMLESS', 'SUSPICIOUS', 'DANGEROUS', 'LETHAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "ScanSource" AS ENUM ('SOLO', 'FACEOFF', 'PRACTICE');

-- CreateEnum
CREATE TYPE "ScanSlotState" AS ENUM ('RESERVED', 'COMMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('SCAN', 'FACEOFF_STAKE_HOLD', 'FACEOFF_PAYOUT', 'FACEOFF_REFUND', 'FACEOFF_FEE', 'FACEOFF_WIN_BONUS', 'SHOP_PURCHASE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BalanceKind" AS ENUM ('LIFETIME', 'SPENDABLE');

-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('SKIN', 'TITLE', 'FRAME', 'BADGE', 'CONSUMABLE', 'FEATURE');

-- CreateEnum
CREATE TYPE "FaceOffMode" AS ENUM ('STAKED', 'FRIENDLY');

-- CreateEnum
CREATE TYPE "FaceOffStatus" AS ENUM ('WAITING', 'ACTIVE', 'TIE_REMATCH', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "handle" TEXT,
    "ageConfirmedAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "consentAt" TIMESTAMP(3),
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "spendableBalance" INTEGER NOT NULL DEFAULT 0,
    "tier" "Tier" NOT NULL DEFAULT 'CLASSIC',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" TIMESTAMP(3),
    "invitedByFaceOffId" TEXT,
    "pinHash" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanSlot" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "dayKey" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "state" "ScanSlotState" NOT NULL DEFAULT 'RESERVED',
    "scanId" UUID,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "band" "Band" NOT NULL,
    "categoryScores" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "scanIndexOfDay" INTEGER NOT NULL,
    "dayKey" TEXT NOT NULL,
    "source" "ScanSource" NOT NULL DEFAULT 'SOLO',
    "faceOffId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceKind" "BalanceKind" NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 1,
    "longestCount" INTEGER NOT NULL DEFAULT 1,
    "lastScanDayKey" TEXT NOT NULL,
    "freezesHeld" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "equippedSkinId" UUID,
    "equippedTitleId" UUID,
    "equippedFrameId" UUID,
    "slot" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "ItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "minTier" "Tier" NOT NULL DEFAULT 'CLASSIC',
    "maxOwned" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assetRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItem" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "price" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceOff" (
    "id" UUID NOT NULL,
    "challengerId" UUID NOT NULL,
    "opponentId" UUID,
    "inviteCode" TEXT NOT NULL,
    "mode" "FaceOffMode" NOT NULL DEFAULT 'STAKED',
    "stake" INTEGER NOT NULL DEFAULT 0,
    "status" "FaceOffStatus" NOT NULL DEFAULT 'WAITING',
    "challengerBestScanId" UUID,
    "opponentBestScanId" UUID,
    "winnerId" UUID,
    "rematchCount" INTEGER NOT NULL DEFAULT 0,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceOffAttempt" (
    "id" UUID NOT NULL,
    "faceOffId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scanId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaceOffAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareCard" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "publicId" TEXT NOT NULL,
    "scanId" UUID,
    "faceOffId" UUID,
    "blobKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "userId" UUID,
    "route" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyConfig" (
    "version" INTEGER NOT NULL,
    "values" JSONB NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyConfig_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "AbuseFlag" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "outcome" TEXT,

    CONSTRAINT "AbuseFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "ScanSlot_userId_dayKey_idx" ON "ScanSlot"("userId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "ScanSlot_userId_dayKey_slotIndex_key" ON "ScanSlot"("userId", "dayKey", "slotIndex");

-- CreateIndex
CREATE INDEX "Scan_userId_dayKey_idx" ON "Scan"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "PointsLedger_userId_createdAt_idx" ON "PointsLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointsLedger_idempotencyKey_balanceKind_key" ON "PointsLedger"("idempotencyKey", "balanceKind");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_key" ON "Streak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_cardNumber_key" ON "Card"("cardNumber");

-- CreateIndex
CREATE INDEX "Card_userId_idx" ON "Card"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_slug_key" ON "ShopItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserItem_userId_itemId_key" ON "UserItem"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_idempotencyKey_key" ON "Purchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FaceOff_inviteCode_key" ON "FaceOff"("inviteCode");

-- CreateIndex
CREATE INDEX "FaceOff_inviteCode_idx" ON "FaceOff"("inviteCode");

-- CreateIndex
CREATE INDEX "FaceOff_challengerId_status_idx" ON "FaceOff"("challengerId", "status");

-- CreateIndex
CREATE INDEX "FaceOff_opponentId_status_idx" ON "FaceOff"("opponentId", "status");

-- CreateIndex
CREATE INDEX "FaceOff_expiresAt_idx" ON "FaceOff"("expiresAt");

-- CreateIndex
CREATE INDEX "FaceOffAttempt_faceOffId_userId_idx" ON "FaceOffAttempt"("faceOffId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareCard_publicId_key" ON "ShareCard"("publicId");

-- CreateIndex
CREATE INDEX "ShareCard_publicId_idx" ON "ShareCard"("publicId");

-- CreateIndex
CREATE INDEX "ShareCard_expiresAt_idx" ON "ShareCard"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_key_idx" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "AbuseFlag_userId_idx" ON "AbuseFlag"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ScanSlot" ADD CONSTRAINT "ScanSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanSlot" ADD CONSTRAINT "ScanSlot_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_faceOffId_fkey" FOREIGN KEY ("faceOffId") REFERENCES "FaceOff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_equippedSkinId_fkey" FOREIGN KEY ("equippedSkinId") REFERENCES "ShopItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_equippedTitleId_fkey" FOREIGN KEY ("equippedTitleId") REFERENCES "ShopItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_equippedFrameId_fkey" FOREIGN KEY ("equippedFrameId") REFERENCES "ShopItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOff" ADD CONSTRAINT "FaceOff_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOff" ADD CONSTRAINT "FaceOff_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOff" ADD CONSTRAINT "FaceOff_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOff" ADD CONSTRAINT "FaceOff_challengerBestScanId_fkey" FOREIGN KEY ("challengerBestScanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOff" ADD CONSTRAINT "FaceOff_opponentBestScanId_fkey" FOREIGN KEY ("opponentBestScanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOffAttempt" ADD CONSTRAINT "FaceOffAttempt_faceOffId_fkey" FOREIGN KEY ("faceOffId") REFERENCES "FaceOff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOffAttempt" ADD CONSTRAINT "FaceOffAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOffAttempt" ADD CONSTRAINT "FaceOffAttempt_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCard" ADD CONSTRAINT "ShareCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCard" ADD CONSTRAINT "ShareCard_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareCard" ADD CONSTRAINT "ShareCard_faceOffId_fkey" FOREIGN KEY ("faceOffId") REFERENCES "FaceOff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbuseFlag" ADD CONSTRAINT "AbuseFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
