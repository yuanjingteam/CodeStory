-- 移除人工审核机制：ai_grading_reviews 表在代码路径全部断开后成为孤儿表。
-- 注意：同一批迁移引入的 answer.version 仍被 exercise.service.ts 的乐观并发使用，保留。
DROP TABLE IF EXISTS "ai_grading_reviews";
