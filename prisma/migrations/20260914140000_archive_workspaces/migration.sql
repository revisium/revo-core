BEGIN;

DROP TABLE "public"."workspace_events";

ALTER TABLE "public"."workspaces"
  RENAME COLUMN "disconnectedAt" TO "archivedAt";

ALTER TABLE "public"."workspaces"
  ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
  DROP COLUMN "availability",
  DROP COLUMN "lastCheckedAt",
  DROP COLUMN "lastErrorCode";

UPDATE "public"."workspaces"
SET "isArchived" = true
WHERE "archivedAt" IS NOT NULL;

DROP INDEX "public"."workspaces_projectId_disconnectedAt_name_id_idx";
CREATE INDEX "workspaces_projectId_isArchived_name_id_idx"
  ON "public"."workspaces"("projectId", "isArchived", "name", "id");

DROP TYPE "public"."WorkspaceAvailability";

COMMIT;
