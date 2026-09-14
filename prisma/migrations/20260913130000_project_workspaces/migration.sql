BEGIN;

LOCK TABLE "repositories" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "repositories") THEN
        RAISE EXCEPTION 'Cannot remove repositories while legacy records exist. Preserve and migrate those records before applying this migration.';
    END IF;
END
$$;

DROP TABLE "repositories";

CREATE TYPE "WorkspaceType" AS ENUM ('folder', 'repository');

CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "WorkspaceType" NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspaces_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE INDEX "workspaces_projectId_isArchived_name_id_idx"
  ON "workspaces"("projectId", "isArchived", "name", "id");

COMMIT;
