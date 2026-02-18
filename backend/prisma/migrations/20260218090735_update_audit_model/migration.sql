/*
  Warnings:

  - Added the required column `actorType` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'ANONYMOUS');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorType" "ActorType";
UPDATE "AuditLog" SET "actorType" = CASE
  WHEN "actorUserId" IS NOT NULL THEN 'USER'::"ActorType"
  ELSE 'SYSTEM'::"ActorType"
END WHERE "actorType" IS NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "actorUserId" DROP NOT NULL, ALTER COLUMN "actorType" SET NOT NULL;
