-- Governance, Social, Immutable Snapshots & Control Centre Migration

CREATE TYPE "ConsentPurpose" AS ENUM (
  'AGE_CONFIRMATION',
  'TERMS_PRIVACY',
  'PORTRAIT_PROCESSING',
  'SKINCARE_PERSONALISATION',
  'PUBLIC_SHARE'
);

CREATE TYPE "FriendshipStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'BLOCKED'
);

CREATE TYPE "StaffStatus" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'REVOKED'
);

CREATE TYPE "SupportTicketStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
);

ALTER TABLE "FaceOff"
  ADD COLUMN IF NOT EXISTS "challengerLockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "opponentLockedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ConsentRecord" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "purpose" "ConsentPurpose" NOT NULL,
  "version" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" TIMESTAMP(3),
  "ip" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ConsentRecord_userId_purpose_idx" ON "ConsentRecord"("userId", "purpose");

CREATE TABLE IF NOT EXISTS "Friendship" (
  "id" UUID NOT NULL,
  "requesterId" UUID NOT NULL,
  "addresseeId" UUID NOT NULL,
  "status" "FriendshipStatus" NOT NULL DEFAULT 'ACCEPTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");
CREATE INDEX IF NOT EXISTS "Friendship_requesterId_status_idx" ON "Friendship"("requesterId", "status");
CREATE INDEX IF NOT EXISTS "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

CREATE TABLE IF NOT EXISTS "CardSnapshot" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "cardId" TEXT NOT NULL,
  "cardholderName" TEXT NOT NULL,
  "handle" TEXT,
  "tier" "Tier" NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "band" TEXT,
  "title" TEXT NOT NULL,
  "skinSlug" TEXT NOT NULL,
  "frameSlug" TEXT NOT NULL,
  "streakDays" INTEGER NOT NULL DEFAULT 0,
  "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "templateVersion" TEXT NOT NULL DEFAULT '1.0',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CardSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CardSnapshot_userId_createdAt_idx" ON "CardSnapshot"("userId", "createdAt");

ALTER TABLE "ShareCard"
  ADD COLUMN IF NOT EXISTS "snapshotId" UUID;

DO $$ BEGIN
  ALTER TABLE "ShareCard"
    ADD CONSTRAINT "ShareCard_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CardSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StaffRole" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffRole_slug_key" ON "StaffRole"("slug");

CREATE TABLE IF NOT EXISTS "StaffUser" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
  "roleId" UUID NOT NULL,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "StaffRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffUser_email_key" ON "StaffUser"("email");
CREATE INDEX IF NOT EXISTS "StaffUser_roleId_idx" ON "StaffUser"("roleId");

CREATE TABLE IF NOT EXISTS "StaffSession" (
  "id" UUID NOT NULL,
  "staffUserId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffSession_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffSession_tokenHash_key" ON "StaffSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "StaffSession_staffUserId_idx" ON "StaffSession"("staffUserId");
CREATE INDEX IF NOT EXISTS "StaffSession_expiresAt_idx" ON "StaffSession"("expiresAt");

CREATE TABLE IF NOT EXISTS "StaffAuditLog" (
  "id" UUID NOT NULL,
  "staffUserId" UUID,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "reason" TEXT,
  "detail" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffAuditLog_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StaffAuditLog_staffUserId_createdAt_idx" ON "StaffAuditLog"("staffUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "StaffAuditLog_action_idx" ON "StaffAuditLog"("action");
CREATE INDEX IF NOT EXISTS "StaffAuditLog_targetType_targetId_idx" ON "StaffAuditLog"("targetType", "targetId");

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "email" TEXT,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "orderId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId");

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" UUID NOT NULL,
  "ticketId" UUID NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderId" UUID,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
