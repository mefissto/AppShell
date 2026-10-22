-- CreateEnum
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'CANCELED', 'FAILED');

-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "claimToken" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailOutbox_status_nextAttemptAt_createdAt_idx" ON "EmailOutbox"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_entityType_entityId_idx" ON "EmailOutbox"("entityType", "entityId");
