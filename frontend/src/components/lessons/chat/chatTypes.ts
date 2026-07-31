import type { AiChatErrorCode } from '@/app/api/ai/chat-error';
import type {
  LessonAnswerScope,
  LessonChatSourceReference,
  LessonEvidenceQuality,
  LessonTutorPromptRevision,
} from '@/app/api/ai/chat';

export type ChatMessageType = 'chat' | 'hint' | 'code_analysis' | 'system';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  messageType?: ChatMessageType;
  content: string;
  errorCode?: AiChatErrorCode;
  status?: 'streaming' | 'error' | 'stopped';
  retryQuestion?: string;
  retryMessageType?: ChatMessageType;
  retryCurrentCode?: string | null;
  answerScope?: LessonAnswerScope;
  promptVersion?: 'grounded-v2' | 'grounded-v3';
  promptRevision?: LessonTutorPromptRevision;
  evidenceQuality?: LessonEvidenceQuality;
  sources?: LessonChatSourceReference[];
}

export function getMessageTypeLabel(messageType?: ChatMessageType): string {
  if (messageType === 'hint') return '提示';
  if (messageType === 'code_analysis') return '代码分析';
  if (messageType === 'system') return '系统';
  return '普通问答';
}

export function getMessageTypeClass(messageType?: ChatMessageType): string {
  if (messageType === 'hint') return 'bg-yellow-100 text-yellow-900';
  if (messageType === 'code_analysis') return 'bg-blue-100 text-blue-900';
  if (messageType === 'system') return 'bg-gray-100 text-gray-700';
  return 'bg-purple-100 text-purple-900';
}
