ALTER TABLE "ai_chat_messages"
ADD COLUMN "deleted_at" TIMESTAMP(6);

-- 旧数据没有真实软删除时间，从迁移执行时重新计算保留期，避免立即误删。
UPDATE "ai_chat_messages"
SET "deleted_at" = CURRENT_TIMESTAMP
WHERE "is_delete" = 1
  AND "deleted_at" IS NULL;

CREATE INDEX "ai_chat_messages_is_delete_deleted_at_idx"
ON "ai_chat_messages"("is_delete", "deleted_at");
