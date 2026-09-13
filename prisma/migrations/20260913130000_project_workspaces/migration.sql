-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('folder', 'repository');

-- CreateEnum
CREATE TYPE "WorkspaceAvailability" AS ENUM ('UNKNOWN', 'AVAILABLE', 'NOT_FOUND', 'NOT_DIRECTORY', 'ACCESS_DENIED', 'INVALID_REPOSITORY', 'CHECK_FAILED');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "WorkspaceType" NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "availability" "WorkspaceAvailability" NOT NULL DEFAULT 'UNKNOWN',
    "lastCheckedAt" TIMESTAMPTZ(3),
    "lastErrorCode" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "disconnectedAt" TIMESTAMPTZ(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_events" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspaces_projectId_disconnectedAt_name_id_idx" ON "workspaces"("projectId", "disconnectedAt", "name", "id");

-- CreateIndex
CREATE INDEX "workspace_events_workspaceId_createdAt_id_idx" ON "workspace_events"("workspaceId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_events" ADD CONSTRAINT "workspace_events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
