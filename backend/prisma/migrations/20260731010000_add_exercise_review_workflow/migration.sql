-- Stage 2 exercise review workflow. Existing exercises remain visible while
-- every newly generated AI exercise is written with review_status = 'draft'.
ALTER TABLE "exercises"
  ADD COLUMN "review_status" VARCHAR(20) NOT NULL DEFAULT 'approved',
  ADD COLUMN "gen_metadata" JSON;

ALTER TABLE "exercises"
  ADD CONSTRAINT "exercises_review_status_check"
  CHECK ("review_status" IN ('draft', 'approved', 'rejected'));

CREATE INDEX "exercises_review_status_idx"
  ON "exercises"("review_status");

CREATE INDEX "exercises_review_status_created_at_idx"
  ON "exercises"("review_status", "created_at");
