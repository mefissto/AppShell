/*
  Warnings:

  - You are about to drop the column `remindAt` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `reminderStatus` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "remindAt",
DROP COLUMN "reminderStatus";
