import {
  AiChatStreamError,
  type AiChatErrorCode,
} from '@/app/api/ai/chat-error';

export function getAiErrorMessage(error: unknown): {
  code?: AiChatErrorCode;
  message: string;
} {
  if (error instanceof AiChatStreamError) {
    if (error.code === 'AI_CONFIG_MISSING') {
      return { code: error.code, message: 'AI 服务未配置，请检查后端配置。' };
    }
    if (error.code === 'AI_TIMEOUT') {
      return { code: error.code, message: 'AI 响应超时，可以点重新发送再试一次。' };
    }
    if (error.code === 'AI_RATE_LIMITED') {
      return { code: error.code, message: 'AI 请求过于频繁，请稍后再试。' };
    }
    if (error.code === 'AI_CONTEXT_INVALID') {
      return { code: error.code, message: error.message || '当前小节或练习上下文异常。' };
    }
    if (error.code === 'AI_REQUEST_INVALID') {
      return { code: error.code, message: error.message || '请求内容不符合要求。' };
    }
    return { code: error.code, message: error.message || 'AI 服务暂时不可用，请稍后重试。' };
  }

  if (error instanceof Error) {
    return { message: error.message || '网络异常，请稍后重试。' };
  }

  return { message: 'AI 服务调用失败，请稍后重试。' };
}
