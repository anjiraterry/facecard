-- Arena Lifecycle, Attempt Enforcement, Lock-In & Event Timeline Migration

ALTER TYPE "FaceOffStatus" ADD VALUE IF NOT EXISTS 'READY_TO_SETTLE';
ALTER TYPE "FaceOffStatus" ADD VALUE IF NOT EXISTS 'SETTLING';

DO $$ BEGIN
  CREATE TYPE "FaceOffParticipantStatus" AS ENUM (
    'WAITING',
    'ATTEMPTS_AVAILABLE',
    'LOCKED_IN',
    'TIMED_OUT',
    'WITHDRAWN'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "FaceOff"
  ADD COLUMN IF NOT EXISTS "maxAttemptsPerRound" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "currentRound" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "scoringVersion" TEXT NOT NULL DEFAULT 'v2.0-presentation',
  ADD COLUMN IF NOT EXISTS "weightsVersion" TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS "challengerStatus" "FaceOffParticipantStatus" NOT NULL DEFAULT 'WAITING',
  ADD COLUMN IF NOT EXISTS "opponentStatus" "FaceOffParticipantStatus" NOT NULL DEFAULT 'WAITING',
  ADD COLUMN IF NOT EXISTS "challengerFinalScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "opponentFinalScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "outcomeReason" TEXT,
  ADD COLUMN IF NOT EXISTS "settlementAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastSettlementError" TEXT;

CREATE INDEX IF NOT EXISTS "FaceOff_status_expiresAt_idx" ON "FaceOff"("status", "expiresAt");

ALTER TABLE "FaceOffAttempt"
  ADD COLUMN IF NOT EXISTS "roundNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "scoringVersion" TEXT NOT NULL DEFAULT 'v2.0-presentation',
  ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
  ADD COLUMN IF NOT EXISTS "submissionKey" TEXT;

DROP INDEX IF EXISTS "FaceOffAttempt_faceOffId_userId_idx";
CREATE INDEX IF NOT EXISTS "FaceOffAttempt_faceOffId_userId_roundNumber_idx"
  ON "FaceOffAttempt"("faceOffId", "userId", "roundNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "FaceOffAttempt_faceOffId_userId_roundNumber_attemptNumber_key"
  ON "FaceOffAttempt"("faceOffId", "userId", "roundNumber", "attemptNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "FaceOffAttempt_faceOffId_submissionKey_key"
  ON "FaceOffAttempt"("faceOffId", "submissionKey");

CREATE TABLE IF NOT EXISTS "FaceOffRound" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "faceOffId" UUID NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "maxAttempts" INTEGER NOT NULL DEFAULT 2,
  "challengerBestScanId" UUID,
  "opponentBestScanId" UUID,
  "challengerScore" INTEGER,
  "opponentScore" INTEGER,
  "winnerId" UUID,
  "isTie" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "FaceOffRound_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FaceOffRound_faceOffId_fkey" FOREIGN KEY ("faceOffId") REFERENCES "FaceOff"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FaceOffRound_faceOffId_roundNumber_key"
  ON "FaceOffRound"("faceOffId", "roundNumber");
CREATE INDEX IF NOT EXISTS "FaceOffRound_faceOffId_idx" ON "FaceOffRound"("faceOffId");

CREATE TABLE IF NOT EXISTS "FaceOffEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "faceOffId" UUID NOT NULL,
  "roundNumber" INTEGER NOT NULL DEFAULT 1,
  "actorUserId" UUID,
  "eventType" TEXT NOT NULL,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FaceOffEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FaceOffEvent_faceOffId_fkey" FOREIGN KEY ("faceOffId") REFERENCES "FaceOff"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FaceOffEvent_faceOffId_createdAt_idx"
  ON "FaceOffEvent"("faceOffId", "createdAt");
