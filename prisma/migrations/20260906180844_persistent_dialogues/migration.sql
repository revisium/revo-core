-- CreateEnum
CREATE TYPE "DialogueStatus" AS ENUM ('READY', 'QUEUED', 'RUNNING', 'WAITING', 'UNCERTAIN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DialogueOutcome" AS ENUM ('COMPLETED', 'CANCELLED', 'INTERRUPTED', 'FAILED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "DialogueContextMode" AS ENUM ('NEW', 'CONTINUED', 'FORK');

-- CreateEnum
CREATE TYPE "DialogueTurnStatus" AS ENUM ('QUEUED', 'RUNNING', 'WAITING', 'COMPLETED', 'CANCELLED', 'INTERRUPTED', 'FAILED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "DialogueDispatchState" AS ENUM ('SAVED', 'DISPATCHING', 'ADMITTED', 'FINISHED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "DialogueHistoryItemKind" AS ENUM ('MESSAGE', 'OPERATION', 'INTERACTION', 'RESULT', 'PLAN', 'USAGE', 'CHECKPOINT');

-- CreateEnum
CREATE TYPE "DialogueHistoryItemSource" AS ENUM ('USER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DialogueHistoryItemStatus" AS ENUM ('STREAMING', 'COMPLETED', 'PARTIAL', 'STARTED', 'IN_PROGRESS', 'FAILED', 'INTERRUPTED', 'PENDING', 'RESPONDING', 'RESOLVED', 'ABANDONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DialogueInteractionStatus" AS ENUM ('PENDING', 'RESPONDING', 'RESOLVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DialogueChangeKind" AS ENUM ('SUMMARY_UPDATED', 'HISTORY_ITEM_UPSERTED', 'HISTORY_TEXT_APPENDED');

-- CreateTable
CREATE TABLE "dialogues" (
    "id" TEXT NOT NULL,
    "ordinal" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "agentConfiguration" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "systemContext" TEXT NOT NULL DEFAULT '',
    "status" "DialogueStatus" NOT NULL DEFAULT 'READY',
    "progress" TEXT NOT NULL DEFAULT '',
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "lastOutcome" "DialogueOutcome",
    "activeTurnId" TEXT,
    "runtimeSessionId" TEXT,
    "contextMode" "DialogueContextMode" NOT NULL DEFAULT 'NEW',
    "originDialogueId" TEXT,
    "originTurnId" TEXT,
    "originItemSequence" BIGINT,
    "itemSequence" BIGINT NOT NULL DEFAULT 0,
    "significantSequence" BIGINT NOT NULL DEFAULT 0,
    "readSignificantSequence" BIGINT NOT NULL DEFAULT 0,
    "version" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "dialogues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialogue_turns" (
    "id" TEXT NOT NULL,
    "dialogueId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "userItemId" TEXT NOT NULL,
    "inputSha256" TEXT NOT NULL,
    "status" "DialogueTurnStatus" NOT NULL DEFAULT 'QUEUED',
    "dispatchState" "DialogueDispatchState" NOT NULL DEFAULT 'SAVED',
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "runtimeSessionId" TEXT,
    "outcome" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "endItemSequence" BIGINT,

    CONSTRAINT "dialogue_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialogue_history_items" (
    "id" TEXT NOT NULL,
    "dialogueId" TEXT NOT NULL,
    "sequence" BIGINT NOT NULL,
    "turnId" TEXT,
    "sourceKey" TEXT,
    "kind" "DialogueHistoryItemKind" NOT NULL,
    "source" "DialogueHistoryItemSource" NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "DialogueHistoryItemStatus" NOT NULL DEFAULT 'COMPLETED',
    "version" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "historical" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "dialogue_history_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dialogue_interactions" (
    "id" TEXT NOT NULL,
    "dialogueId" TEXT NOT NULL,
    "turnId" TEXT,
    "runtimeSessionId" TEXT NOT NULL,
    "runtimeRequestId" TEXT NOT NULL,
    "status" "DialogueInteractionStatus" NOT NULL DEFAULT 'PENDING',
    "request" JSONB NOT NULL,
    "response" JSONB,
    "responseCommandId" TEXT,

    CONSTRAINT "dialogue_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_session_event_streams" (
    "sessionId" TEXT NOT NULL,
    "dialogueId" TEXT,
    "streamId" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "eventId" TEXT,

    CONSTRAINT "agent_session_event_streams_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "agent_session_events" (
    "eventId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "observedAt" TIMESTAMPTZ(3) NOT NULL,
    "claimedResumeTokenId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_session_events_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "dialogue_changes" (
    "sequence" BIGINT NOT NULL,
    "dialogueId" TEXT NOT NULL,
    "kind" "DialogueChangeKind" NOT NULL,
    "itemId" TEXT,
    "itemVersion" BIGINT,
    "baseItemVersion" BIGINT,
    "itemSequence" BIGINT,
    "turnId" TEXT,
    "itemKind" "DialogueHistoryItemKind",
    "itemSource" "DialogueHistoryItemSource",
    "textDelta" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dialogue_changes_pkey" PRIMARY KEY ("sequence")
);

-- CreateTable
CREATE TABLE "dialogue_feed_positions" (
    "id" INTEGER NOT NULL,
    "sequence" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "dialogue_feed_positions_pkey" PRIMARY KEY ("id")
);

INSERT INTO "dialogue_feed_positions" ("id", "sequence") VALUES (1, 0);

-- CreateIndex
CREATE UNIQUE INDEX "dialogues_ordinal_key" ON "dialogues"("ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "dialogues_runtimeSessionId_key" ON "dialogues"("runtimeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "dialogue_turns_userItemId_key" ON "dialogue_turns"("userItemId");

-- CreateIndex
CREATE INDEX "dialogue_turns_dialogueId_createdAt_id_idx" ON "dialogue_turns"("dialogueId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "dialogue_turns_dialogueId_commandId_key" ON "dialogue_turns"("dialogueId", "commandId");

-- CreateIndex
CREATE INDEX "dialogue_history_items_dialogueId_turnId_kind_idx" ON "dialogue_history_items"("dialogueId", "turnId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "dialogue_history_items_dialogueId_sequence_key" ON "dialogue_history_items"("dialogueId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "dialogue_history_items_dialogueId_sourceKey_key" ON "dialogue_history_items"("dialogueId", "sourceKey");

-- CreateIndex
CREATE INDEX "dialogue_interactions_dialogueId_status_idx" ON "dialogue_interactions"("dialogueId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dialogue_interactions_runtimeSessionId_runtimeRequestId_key" ON "dialogue_interactions"("runtimeSessionId", "runtimeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_session_events_claimedResumeTokenId_key" ON "agent_session_events"("claimedResumeTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_session_events_sessionId_streamId_sequence_key" ON "agent_session_events"("sessionId", "streamId", "sequence");

-- CreateIndex
CREATE INDEX "dialogue_changes_dialogueId_sequence_idx" ON "dialogue_changes"("dialogueId", "sequence");

-- AddForeignKey
ALTER TABLE "dialogue_turns" ADD CONSTRAINT "dialogue_turns_dialogueId_fkey" FOREIGN KEY ("dialogueId") REFERENCES "dialogues"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dialogue_history_items" ADD CONSTRAINT "dialogue_history_items_dialogueId_fkey" FOREIGN KEY ("dialogueId") REFERENCES "dialogues"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dialogue_interactions" ADD CONSTRAINT "dialogue_interactions_dialogueId_fkey" FOREIGN KEY ("dialogueId") REFERENCES "dialogues"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "agent_session_event_streams" ADD CONSTRAINT "agent_session_event_streams_dialogueId_fkey" FOREIGN KEY ("dialogueId") REFERENCES "dialogues"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "agent_session_events" ADD CONSTRAINT "agent_session_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_session_event_streams"("sessionId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "dialogue_changes" ADD CONSTRAINT "dialogue_changes_dialogueId_fkey" FOREIGN KEY ("dialogueId") REFERENCES "dialogues"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
