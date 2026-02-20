/*
  Warnings:

  - You are about to drop the column `dueAt` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "dueAt",
ADD COLUMN     "dueDate" TIMESTAMP(3);
