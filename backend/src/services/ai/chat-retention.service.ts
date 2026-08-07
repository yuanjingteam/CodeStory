import prisma from '../../config/prisma';

export const AI_CHAT_RETENTION_DAYS = 30;
const AI_CHAT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1_000;

export async function deleteExpiredAiChatMessages(
  now = new Date()
): Promise<number> {
  const cutoff = new Date(
    now.getTime() - AI_CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1_000
  );
  const result = await prisma.ai_chat_messages.deleteMany({
    where: {
      is_delete: 1,
      deleted_at: { lte: cutoff },
    },
  });

  return result.count;
}

async function runAiChatCleanup(): Promise<void> {
  try {
    const deletedCount = await deleteExpiredAiChatMessages();
    if (deletedCount > 0) {
      console.info(`已物理删除 ${deletedCount} 条过期 AI 对话消息`);
    }
  } catch (error) {
    console.error('清理过期 AI 对话消息失败:', error);
  }
}

export function startAiChatCleanupScheduler(): NodeJS.Timeout {
  void runAiChatCleanup();
  const timer = setInterval(() => {
    void runAiChatCleanup();
  }, AI_CHAT_CLEANUP_INTERVAL_MS);
  timer.unref();
  return timer;
}
