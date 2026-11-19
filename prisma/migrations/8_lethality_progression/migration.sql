-- Migration 8: Versioned scoring/reward configuration, auditable tier upgrades, ledger reversals.
-- Additive and idempotent. Existing balances, ledger rows and cards are untouched.

ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'REVERSAL';

DO $$ BEGIN
  CREATE TYPE "ScoringConfigKind" AS ENUM ('SCORING_WEIGHTS', 'REWARD_POLICY', 'TIER_POLICY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ScoringConfigStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ScoringConfigVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" "ScoringConfigKind" NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "ScoringConfigStatus" NOT NULL DEFAULT 'DRAFT',
  "config" JSONB NOT NULL,
  "notes" TEXT,
  "createdById" UUID,
  "publishedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "ScoringConfigVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ScoringConfigVersion_kind_version_key" ON "ScoringConfigVersion"("kind", "version");
CREATE INDEX IF NOT EXISTS "ScoringConfigVersion_kind_status_idx" ON "ScoringConfigVersion"("kind", "status");

CREATE TABLE IF NOT EXISTS "TierUpgradeEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "fromTier" "Tier" NOT NULL,
  "toTier" "Tier" NOT NULL,
  "lifetimePoints" INTEGER NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TierUpgradeEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TierUpgradeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TierUpgradeEvent_userId_toTier_key" ON "TierUpgradeEvent"("userId", "toTier");
CREATE INDEX IF NOT EXISTS "TierUpgradeEvent_userId_createdAt_idx" ON "TierUpgradeEvent"("userId", "createdAt");

-- Backfill: record the tier each existing user currently holds so upgrade history starts consistent.
INSERT INTO "TierUpgradeEvent" ("userId", "fromTier", "toTier", "lifetimePoints", "policyVersion")
SELECT u."id", 'CLASSIC'::"Tier", u."tier", u."lifetimePoints", 'legacy-backfill'
FROM "User" u
WHERE u."tier" <> 'CLASSIC'
ON CONFLICT ("userId", "toTier") DO NOTHING;
