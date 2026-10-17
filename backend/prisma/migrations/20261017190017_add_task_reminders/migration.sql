/*
  Warnings:

  - A unique constraint covering the columns `[reminderId]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "TaskReminderStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "reminderId" TEXT;

-- CreateTable
CREATE TABLE "TaskReminder" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "status" "TaskReminderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "TaskReminder_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TaskReminder" (
  "id",
  "taskId",
  "remindAt",
  "status",
  "createdAt",
  "updatedAt",
  "processedAt",
  "canceledAt"
)
SELECT
  gen_random_uuid()::text,
  "id",
  "remindAt",
  CASE
    WHEN "reminderStatus" = 'SENT'::"TaskReminderStatus"
      THEN 'COMPLETED'::"TaskReminderStatus"
    WHEN "deletedAt" IS NOT NULL
      THEN 'CANCELED'::"TaskReminderStatus"
    WHEN "reminderStatus" = 'CANCELED'::"TaskReminderStatus"
      THEN 'CANCELED'::"TaskReminderStatus"
    ELSE 'PENDING'::"TaskReminderStatus"
  END,
  NOW(),
  NOW(),
  CASE
    WHEN "reminderStatus" = 'SENT'::"TaskReminderStatus"
      THEN NOW()
    ELSE NULL
  END,
  CASE
    WHEN "deletedAt" IS NOT NULL
      OR "reminderStatus" = 'CANCELED'::"TaskReminderStatus"
      THEN NOW()
    ELSE NULL
  END
FROM "Task"
WHERE "remindAt" IS NOT NULL;

-- CreateIndex
CREATE INDEX "TaskReminder_status_remindAt_idx" ON "TaskReminder"("status", "remindAt");

-- CreateIndex
CREATE INDEX "TaskReminder_taskId_status_idx" ON "TaskReminder"("taskId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_reminderId_key" ON "Notification"("reminderId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "TaskReminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReminder" ADD CONSTRAINT "TaskReminder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
