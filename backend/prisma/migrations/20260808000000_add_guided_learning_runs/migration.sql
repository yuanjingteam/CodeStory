CREATE TABLE "guided_learning_runs" (
  "run_id" CHAR(36) NOT NULL,
  "session_id" CHAR(36) NOT NULL,
  "graph_version" VARCHAR(30) NOT NULL,
  "state" SMALLINT NOT NULL DEFAULT 0,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(6),
  "checkpoint_deleted_at" TIMESTAMP(6),
  CONSTRAINT "guided_learning_runs_pkey" PRIMARY KEY ("run_id"),
  CONSTRAINT "guided_learning_runs_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "ai_chat_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "guided_learning_runs_session_id_started_at_idx"
  ON "guided_learning_runs"("session_id", "started_at");
CREATE INDEX "guided_learning_runs_status_completed_at_checkpoint_deleted_at_idx"
  ON "guided_learning_runs"("status", "completed_at", "checkpoint_deleted_at");

-- Preserve the currently projected run across upgrade. A terminal current run is
-- retained until a later start replaces it, after which it becomes cleanup-eligible.
INSERT INTO "guided_learning_runs" (
  "run_id", "session_id", "graph_version", "state", "status",
  "started_at", "completed_at"
)
SELECT
  "current_run_id", "id", COALESCE("graph_version", 'unknown'), "state",
  CASE WHEN "state" IN (6, 7, 8, 9) THEN 'terminal' ELSE 'active' END,
  "created_at",
  CASE WHEN "state" IN (6, 7, 8, 9) THEN "updated_at" ELSE NULL END
FROM "ai_chat_sessions"
WHERE "current_run_id" IS NOT NULL
ON CONFLICT ("run_id") DO NOTHING;
