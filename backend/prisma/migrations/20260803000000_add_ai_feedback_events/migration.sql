CREATE TABLE "ai_feedback_events" (
  "id" CHAR(36) NOT NULL,
  "trace_id" VARCHAR(128),
  "user_id" CHAR(36) NOT NULL,
  "scene" VARCHAR(40) NOT NULL,
  "event_type" VARCHAR(40) NOT NULL,
  "target_type" VARCHAR(40) NOT NULL,
  "target_id" VARCHAR(128) NOT NULL,
  "metadata" JSONB,
  "dedupe_key" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_feedback_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_feedback_events_dedupe_key_key" UNIQUE ("dedupe_key"),
  CONSTRAINT "ai_feedback_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ai_feedback_events_user_id_scene_created_at_idx" ON "ai_feedback_events"("user_id", "scene", "created_at");
