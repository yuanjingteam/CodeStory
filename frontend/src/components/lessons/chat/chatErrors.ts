import axios from 'axios';
import {
  AiChatStreamError,
  normalizeAiChatErrorCode,
  type AiChatErrorCode,
} from '@/app/api/ai/chat-error';

function resolveAiError(
  code: AiChatErrorCode | undefined,
  message: string
): {
  code?: AiChatErrorCode;
  message: string;
} {
  if (code === 'AI_CONFIG_MISSING') {
    return { code, message: 'AI 服务未配置，请检查后端配置。' };
  }
  if (code === 'AI_TIMEOUT') {
    return { code, message: 'AI 响应超时，可以点重新发送再试一次。' };
  }
  if (code === 'AI_RATE_LIMITED') {
    return { code, message: message || 'AI 上游服务当前触发限流，请稍后再试。' };
  }
  if (code === 'AI_CONTEXT_INVALID') {
    return { code, message: message || '当前小节或练习上下文异常。' };
  }
  if (code === 'AI_REQUEST_INVALID') {
    return { code, message: message || '请求内容不符合要求。' };
  }
  return { code, message: message || 'AI 服务暂时不可用，请稍后重试。' };
}

export function getAiErrorMessage(error: unknown): {
  code?: AiChatErrorCode;
  message: string;
} {
  if (error instanceof AiChatStreamError) {
    return resolveAiError(error.code, error.message);
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { code?: unknown; message?: unknown }
      | undefined;
    const code = normalizeAiChatErrorCode(data?.code);
    const message =
      typeof data?.message === 'string' ? data.message : error.message;
    return resolveAiError(code, message);
  }

  if (error instanceof Error) {
    return { message: error.message || '网络异常，请稍后重试。' };
  }

  return { message: 'AI 服务调用失败，请稍后重试。' };
}
