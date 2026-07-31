ALTER TABLE "courses"
ADD COLUMN "deleted_at" TIMESTAMP(6);

ALTER TABLE "chapters"
ADD COLUMN "deleted_at" TIMESTAMP(6);

ALTER TABLE "lessons"
ADD COLUMN "deleted_at" TIMESTAMP(6),
ADD COLUMN "knowledge_index_policy" VARCHAR(20) NOT NULL DEFAULT 'auto';

ALTER TABLE "exercises"
ADD COLUMN "deleted_at" TIMESTAMP(6),
ADD COLUMN "knowledge_index_policy" VARCHAR(20) NOT NULL DEFAULT 'auto';

UPDATE "courses"
SET "deleted_at" = CURRENT_TIMESTAMP
WHERE "is_delete" = 1 AND "deleted_at" IS NULL;

UPDATE "chapters"
SET "deleted_at" = CURRENT_TIMESTAMP
WHERE "is_delete" = 1 AND "deleted_at" IS NULL;

UPDATE "lessons"
SET "deleted_at" = CURRENT_TIMESTAMP
WHERE "is_delete" = 1 AND "deleted_at" IS NULL;

UPDATE "exercises"
SET "deleted_at" = CURRENT_TIMESTAMP
WHERE "is_delete" = 1 AND "deleted_at" IS NULL;

CREATE INDEX "courses_is_delete_deleted_at_idx"
ON "courses"("is_delete", "deleted_at");

CREATE INDEX "chapters_is_delete_deleted_at_idx"
ON "chapters"("is_delete", "deleted_at");

CREATE INDEX "lessons_is_delete_deleted_at_idx"
ON "lessons"("is_delete", "deleted_at");

CREATE INDEX "lessons_knowledge_index_policy_idx"
ON "lessons"("knowledge_index_policy");

CREATE INDEX "exercises_is_delete_deleted_at_idx"
ON "exercises"("is_delete", "deleted_at");

CREATE INDEX "exercises_knowledge_index_policy_idx"
ON "exercises"("knowledge_index_policy");
