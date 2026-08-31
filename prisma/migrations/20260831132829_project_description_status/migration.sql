-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('CREATING', 'ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'CREATING';

-- Backfill projects created before the status column so they stay visible as ready.
UPDATE "projects" SET "status" = 'ACTIVE';
