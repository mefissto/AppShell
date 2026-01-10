-- DropIndex
DROP INDEX "Session_userId_key";

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "refreshToken" DROP NOT NULL;
