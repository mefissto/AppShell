-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "metadata" JSONB;
