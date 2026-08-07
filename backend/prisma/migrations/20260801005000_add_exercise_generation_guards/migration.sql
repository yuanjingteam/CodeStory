ALTER TABLE "exercises"
ADD COLUMN "generation_fingerprint" CHAR(64);

CREATE UNIQUE INDEX "exercises_active_ai_generation_fingerprint_key"
ON "exercises"("lesson_id", "generation_fingerprint")
WHERE "is_delete" = 0
  AND "source" = 'ai'
  AND "review_status" IN ('draft', 'approved')
  AND "generation_fingerprint" IS NOT NULL;
