BEGIN;

LOCK TABLE "repositories" IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "repositories") THEN
        RAISE EXCEPTION 'Cannot remove repositories while legacy records exist. Preserve and migrate those records before applying this migration.';
    END IF;
END
$$;

ALTER TABLE "repositories" DROP CONSTRAINT "repositories_projectId_fkey";

ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_projectId_fkey";

DROP TABLE "repositories";

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

COMMIT;
