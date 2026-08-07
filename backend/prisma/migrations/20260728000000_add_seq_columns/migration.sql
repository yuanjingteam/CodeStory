-- 补齐 schema.prisma 中的 @default(autoincrement()) 列
-- 这些列在开发库已手工存在，但 init_full_schema 迁移未包含，
-- 导致用 prisma migrate deploy 新建的测试库缺少这些列。
-- 用 ADD COLUMN IF NOT EXISTS，确保开发库重复执行幂等、新建库补齐结构。
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "course_seq" SERIAL;
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "chapter_seq" SERIAL;
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "lesson_seq" SERIAL;
