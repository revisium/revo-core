UPDATE "public"."dialogues" SET "agentConfiguration" = '{"selections": {}}'::jsonb WHERE "agentConfiguration" = '{}'::jsonb;

ALTER TABLE "public"."dialogues"
  ALTER COLUMN "agentConfiguration" SET DEFAULT '{"selections": {}}'::jsonb;
