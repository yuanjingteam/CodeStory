-- Reconcile columns that exist in schema.prisma but were omitted from the
-- historical init migration. Keep this as a new migration so databases that
-- have already applied 20260728000000_add_seq_columns retain a valid checksum.

-- exercises.hints / exercises.order
ALTER TABLE "exercises"
ADD COLUMN IF NOT EXISTS "hints" JSON;

ALTER TABLE "exercises"
ADD COLUMN IF NOT EXISTS "order" INTEGER;

UPDATE "exercises"
SET "order" = 0
WHERE "order" IS NULL;

ALTER TABLE "exercises"
ALTER COLUMN "order" SET DEFAULT 0,
ALTER COLUMN "order" SET NOT NULL;

-- Repair the autoincrement contract even when a seq column was added manually
-- as a plain INTEGER before Prisma migrations were reconciled.
CREATE SEQUENCE IF NOT EXISTS "courses_course_seq_seq";
ALTER SEQUENCE "courses_course_seq_seq" OWNED BY "courses"."course_seq";
ALTER TABLE "courses"
ALTER COLUMN "course_seq"
SET DEFAULT nextval('"courses_course_seq_seq"'::regclass);
UPDATE "courses"
SET "course_seq" = nextval('"courses_course_seq_seq"'::regclass)
WHERE "course_seq" IS NULL;
ALTER TABLE "courses"
ALTER COLUMN "course_seq" SET NOT NULL;
SELECT setval(
  '"courses_course_seq_seq"'::regclass,
  COALESCE((SELECT MAX("course_seq") FROM "courses"), 1),
  EXISTS (SELECT 1 FROM "courses")
);

CREATE SEQUENCE IF NOT EXISTS "chapters_chapter_seq_seq";
ALTER SEQUENCE "chapters_chapter_seq_seq" OWNED BY "chapters"."chapter_seq";
ALTER TABLE "chapters"
ALTER COLUMN "chapter_seq"
SET DEFAULT nextval('"chapters_chapter_seq_seq"'::regclass);
UPDATE "chapters"
SET "chapter_seq" = nextval('"chapters_chapter_seq_seq"'::regclass)
WHERE "chapter_seq" IS NULL;
ALTER TABLE "chapters"
ALTER COLUMN "chapter_seq" SET NOT NULL;
SELECT setval(
  '"chapters_chapter_seq_seq"'::regclass,
  COALESCE((SELECT MAX("chapter_seq") FROM "chapters"), 1),
  EXISTS (SELECT 1 FROM "chapters")
);

CREATE SEQUENCE IF NOT EXISTS "lessons_lesson_seq_seq";
ALTER SEQUENCE "lessons_lesson_seq_seq" OWNED BY "lessons"."lesson_seq";
ALTER TABLE "lessons"
ALTER COLUMN "lesson_seq"
SET DEFAULT nextval('"lessons_lesson_seq_seq"'::regclass);
UPDATE "lessons"
SET "lesson_seq" = nextval('"lessons_lesson_seq_seq"'::regclass)
WHERE "lesson_seq" IS NULL;
ALTER TABLE "lessons"
ALTER COLUMN "lesson_seq" SET NOT NULL;
SELECT setval(
  '"lessons_lesson_seq_seq"'::regclass,
  COALESCE((SELECT MAX("lesson_seq") FROM "lessons"), 1),
  EXISTS (SELECT 1 FROM "lessons")
);
