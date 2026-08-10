-- CreateTable
CREATE TABLE "review_threads" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "contextKey" TEXT,
    "context" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedBy" TEXT,

    CONSTRAINT "review_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "deletedBy" TEXT,

    CONSTRAINT "review_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_threads_scopeKey_subjectKey_resolvedAt_idx" ON "review_threads"("scopeKey", "subjectKey", "resolvedAt");

-- CreateIndex
CREATE INDEX "review_threads_scopeKey_subjectKey_contextKey_resolvedAt_idx" ON "review_threads"("scopeKey", "subjectKey", "contextKey", "resolvedAt");

-- CreateIndex
CREATE INDEX "review_messages_threadId_createdAt_id_idx" ON "review_messages"("threadId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "review_messages" ADD CONSTRAINT "review_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "review_threads"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
