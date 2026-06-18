import prisma from '../../config/prisma';
import type { Prisma } from '../../generated/prisma';
import type { LessonAiContext } from './lesson-context.service';

export type LessonChatRole = 'user' | 'assistant';

export interface LessonChatHistoryMessage {
  role: LessonChatRole;
  content: string;
}

export interface LessonChatStoredMessage extends LessonChatHistoryMessage {
  id: string;
  createdAt: string;
}

const DEFAULT_HISTORY_LIMIT = 10;
const DEFAULT_STORED_MESSAGES_LIMIT = 50;
const MAX_HISTORY_MESSAGE_LENGTH = 1_500;

function trimHistoryContent(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_HISTORY_MESSAGE_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_HISTORY_MESSAGE_LENGTH)}\n[历史消息过长，已截断]`;
}

function buildSessionContext(context: LessonAiContext): Prisma.InputJsonValue {
  return {
    courseTitle: context.courseTitle,
    chapterTitle: context.chapterTitle,
    lessonTitle: context.lessonTitle,
    hasExercise: Boolean(context.exercise),
    updatedAt: new Date().toISOString(),
  };
}

// 获取或创建小节对话会话
export async function getOrCreateLessonChatSession(
  userId: string,
  context: LessonAiContext
) {
  return prisma.ai_chat_sessions.upsert({
    where: {
      user_id_lesson_id: {
        user_id: userId,
        lesson_id: context.lessonId,
      },
    },
    create: {
      user_id: userId,
      lesson_id: context.lessonId,
      current_exercise_id: context.exerciseId,
      context: buildSessionContext(context),
      is_delete: 0,
    },
    update: {
      current_exercise_id: context.exerciseId,
      context: buildSessionContext(context),
      is_delete: 0,
    },
    select: {
      id: true,
      state: true,
      current_exercise_id: true,
      hint_level: true,
    },
  });
}

// 获取最近的对话消息
export async function getRecentLessonChatMessages(
  sessionId: string,
  limit = DEFAULT_HISTORY_LIMIT
): Promise<LessonChatHistoryMessage[]> {
  const messages = await getLessonChatMessages(sessionId, limit);

  return messages.map((message) => ({
    role: message.role,
    content: trimHistoryContent(message.content),
  }));
}

// 获取所有对话消息
export async function getLessonChatMessages(
  sessionId: string,
  limit = DEFAULT_STORED_MESSAGES_LIMIT
): Promise<LessonChatStoredMessage[]> {
  const messages = await prisma.ai_chat_messages.findMany({
    where: {
      session_id: sessionId,
      is_delete: 0,
      message_type: 'chat',
      role: { in: ['user', 'assistant'] },
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    select: {
      id: true,
      role: true,
      content: true,
      created_at: true,
    },
  });

  return messages.reverse().map((message) => ({
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
    createdAt: message.created_at.toISOString(),
  }));
}

// 追加对话消息
export async function appendLessonChatMessage(
  sessionId: string,
  role: LessonChatRole,
  content: string,
  metadata?: Prisma.InputJsonValue
) {
  const trimmedContent = content.trim();
  if (!trimmedContent) return null;

  return prisma.ai_chat_messages.create({
    data: {
      session_id: sessionId,
      role,
      message_type: 'chat',
      content: trimmedContent,
      metadata,
    },
    select: {
      id: true,
      created_at: true,
    },
  });
}
