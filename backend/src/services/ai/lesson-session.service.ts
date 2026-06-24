import prisma from '../../config/prisma';
import type { Prisma } from '../../generated/prisma';
import type { LessonAiContext } from './lesson-context.service';

export type LessonChatRole = 'user' | 'assistant';
export type LessonChatMessageType = 'chat' | 'hint' | 'code_analysis' | 'system';

export interface LessonChatHistoryMessage {
  role: LessonChatRole;
  content: string;
  messageType: LessonChatMessageType;
}

export interface LessonChatStoredMessage extends LessonChatHistoryMessage {
  id: string;
  createdAt: string;
}

const DEFAULT_STORED_MESSAGES_LIMIT = 50;
const CONTEXT_SCAN_LIMIT = 80;
const CONTEXT_CHAT_LIMIT = 6;
const CONTEXT_HINT_LIMIT = 2;
const CONTEXT_CODE_ANALYSIS_LIMIT = 2;
const CONTEXT_TOTAL_LIMIT = 10;
const MAX_HISTORY_MESSAGE_LENGTH = 1_500;
const READABLE_MESSAGE_TYPES: LessonChatMessageType[] = [
  'chat',
  'hint',
  'code_analysis',
  'system',
];

interface RecentLessonChatOptions {
  currentExerciseId?: string | null;
  scanLimit?: number;
}

interface LessonChatContextCandidate extends LessonChatHistoryMessage {
  id: string;
  createdAt: Date;
  exerciseId: string | null;
}

function normalizeMessageType(value: string): LessonChatMessageType {
  return READABLE_MESSAGE_TYPES.includes(value as LessonChatMessageType)
    ? (value as LessonChatMessageType)
    : 'chat';
}

function getMetadataExerciseId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as { exerciseId?: unknown }).exerciseId;
  return typeof value === 'string' && value.trim() ? value : null;
}

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
  options: RecentLessonChatOptions = {}
): Promise<LessonChatHistoryMessage[]> {
  const messages = await prisma.ai_chat_messages.findMany({
    where: {
      session_id: sessionId,
      is_delete: 0,
      message_type: { in: READABLE_MESSAGE_TYPES },
      role: { in: ['user', 'assistant'] },
    },
    orderBy: { created_at: 'desc' },
    take: options.scanLimit ?? CONTEXT_SCAN_LIMIT,
    select: {
      id: true,
      role: true,
      message_type: true,
      content: true,
      metadata: true,
      created_at: true,
    },
  });

  const candidates: LessonChatContextCandidate[] = messages.map((message) => ({
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: trimHistoryContent(message.content),
    messageType: normalizeMessageType(message.message_type),
    exerciseId: getMetadataExerciseId(message.metadata),
    createdAt: message.created_at,
  }));

  const selected = new Map<string, LessonChatContextCandidate>();
  const currentExerciseId = options.currentExerciseId ?? null;

  const addByType = (
    messageType: LessonChatMessageType,
    limit: number,
    exerciseOnly: boolean
  ) => {
    let count = 0;

    for (const message of candidates) {
      if (selected.size >= CONTEXT_TOTAL_LIMIT) break;
      if (count >= limit) break;
      if (message.messageType !== messageType) continue;
      if (
        exerciseOnly &&
        currentExerciseId &&
        message.exerciseId !== currentExerciseId
      ) {
        continue;
      }
      if (selected.has(message.id)) continue;

      selected.set(message.id, message);
      count += 1;
    }
  };

  addByType('chat', CONTEXT_CHAT_LIMIT, true);
  addByType('hint', CONTEXT_HINT_LIMIT, true);
  addByType('code_analysis', CONTEXT_CODE_ANALYSIS_LIMIT, true);
  addByType('chat', CONTEXT_CHAT_LIMIT, false);
  addByType('hint', CONTEXT_HINT_LIMIT, false);
  addByType('code_analysis', CONTEXT_CODE_ANALYSIS_LIMIT, false);

  for (const message of candidates) {
    if (selected.size >= CONTEXT_TOTAL_LIMIT) break;
    if (selected.has(message.id)) continue;
    selected.set(message.id, message);
  }

  return Array.from(selected.values())
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .slice(-CONTEXT_TOTAL_LIMIT)
    .map((message) => ({
      role: message.role,
      content: message.content,
      messageType: message.messageType,
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
      message_type: { in: READABLE_MESSAGE_TYPES },
      role: { in: ['user', 'assistant'] },
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    select: {
      id: true,
      role: true,
      message_type: true,
      content: true,
      created_at: true,
    },
  });

  return messages.reverse().map((message) => ({
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    messageType: normalizeMessageType(message.message_type),
    content: message.content,
    createdAt: message.created_at.toISOString(),
  }));
}

// 追加对话消息
export async function appendLessonChatMessage(
  sessionId: string,
  role: LessonChatRole,
  content: string,
  metadata?: Prisma.InputJsonValue,
  messageType: LessonChatMessageType = 'chat'
) {
  const trimmedContent = content.trim();
  if (!trimmedContent) return null;

  return prisma.ai_chat_messages.create({
    data: {
      session_id: sessionId,
      role,
      message_type: messageType,
      content: trimmedContent,
      metadata,
    },
    select: {
      id: true,
      created_at: true,
    },
  });
}
