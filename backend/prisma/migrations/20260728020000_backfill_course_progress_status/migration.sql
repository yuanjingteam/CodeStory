-- 已存在学习中/已完成小节时，课程不能继续保持“未学习”。
UPDATE "courses_progress" AS "course_progress"
SET
  "status" = 1,
  "updated_at" = CURRENT_TIMESTAMP
WHERE
  "course_progress"."is_delete" = 0
  AND "course_progress"."status" = 0
  AND EXISTS (
    SELECT 1
    FROM "lessons_progress" AS "lesson_progress"
    INNER JOIN "lessons" AS "lesson"
      ON "lesson"."id" = "lesson_progress"."lesson_id"
    INNER JOIN "chapters" AS "chapter"
      ON "chapter"."id" = "lesson"."chapter_id"
    WHERE
      "lesson_progress"."user_id" = "course_progress"."user_id"
      AND "chapter"."course_id" = "course_progress"."course_id"
      AND "lesson_progress"."is_delete" = 0
      AND "lesson_progress"."status" IN (1, 2)
      AND "lesson"."is_delete" = 0
      AND "chapter"."is_delete" = 0
  );
