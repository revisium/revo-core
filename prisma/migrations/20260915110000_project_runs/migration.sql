CREATE TABLE "project_runs" (
    "runId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_runs_pkey" PRIMARY KEY ("runId"),
    CONSTRAINT "project_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE INDEX "project_runs_projectId_idx" ON "project_runs"("projectId");
