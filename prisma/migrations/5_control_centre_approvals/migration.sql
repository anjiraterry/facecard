-- Maker-Checker Approval Engine for Face Card Control Centre

CREATE TYPE "ApprovalStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
  "id" UUID NOT NULL,
  "proposerId" UUID NOT NULL,
  "reviewerId" UUID,
  "actionType" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "decisionNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalRequest_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_createdAt_idx" ON "ApprovalRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_proposerId_idx" ON "ApprovalRequest"("proposerId");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_targetType_targetId_idx" ON "ApprovalRequest"("targetType", "targetId");
