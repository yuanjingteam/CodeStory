ALTER TABLE "answer"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ai_grading_reviews" (
  "id" CHAR(36) NOT NULL,
  "trace_id" VARCHAR(128),
  "user_id" CHAR(36) NOT NULL,
  "exercise_id" CHAR(36) NOT NULL,
  "submission_type" VARCHAR(20) NOT NULL,
  "code_submission_id" CHAR(36),
  "submission_fingerprint" CHAR(64) NOT NULL,
  "answer_version" INTEGER NOT NULL,
  "submitted_answer" TEXT NOT NULL,
  "hint_level_used" INTEGER NOT NULL,
  "exercise_snapshot" JSONB NOT NULL,
  "trigger_reason" VARCHAR(50) NOT NULL,
  "ai_score" INTEGER,
  "rule_score" INTEGER,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "reviewer_id" CHAR(36),
  "reviewed_result" VARCHAR(30),
  "appeal_reason" TEXT,
  "review_note" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(6),
  CONSTRAINT "ai_grading_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_grading_reviews_status_check" CHECK ("status" IN ('pending', 'reviewed', 'stale')),
  CONSTRAINT "ai_grading_reviews_result_check" CHECK ("reviewed_result" IS NULL OR "reviewed_result" IN ('maintained', 'mastered', 'not_mastered')),
  CONSTRAINT "ai_grading_reviews_hint_level_check" CHECK ("hint_level_used" BETWEEN 0 AND 3),
  CONSTRAINT "ai_grading_reviews_answer_version_check" CHECK ("answer_version" >= 1),
  CONSTRAINT "ai_grading_reviews_ai_score_check" CHECK ("ai_score" IS NULL OR "ai_score" BETWEEN 0 AND 100),
  CONSTRAINT "ai_grading_reviews_rule_score_check" CHECK ("rule_score" IS NULL OR "rule_score" BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX "ai_grading_reviews_user_id_exercise_id_fingerprint_reason_key"
ON "ai_grading_reviews"("user_id", "exercise_id", "submission_fingerprint", "trigger_reason");

CREATE INDEX "ai_grading_reviews_status_created_at_idx"
ON "ai_grading_reviews"("status", "created_at");

CREATE INDEX "ai_grading_reviews_user_exercise_created_at_idx"
ON "ai_grading_reviews"("user_id", "exercise_id", "created_at");

CREATE INDEX "ai_grading_reviews_reviewer_id_idx"
ON "ai_grading_reviews"("reviewer_id");

ALTER TABLE "ai_grading_reviews"
ADD CONSTRAINT "ai_grading_reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_grading_reviews"
ADD CONSTRAINT "ai_grading_reviews_reviewer_id_fkey"
FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_grading_reviews"
ADD CONSTRAINT "ai_grading_reviews_exercise_id_fkey"
FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_grading_reviews"
ADD CONSTRAINT "ai_grading_reviews_code_submission_id_fkey"
FOREIGN KEY ("code_submission_id") REFERENCES "code_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
