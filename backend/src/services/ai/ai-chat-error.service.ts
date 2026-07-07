import type { Response } from 'express';

export type AiChatErrorCode =
  | 'AI_REQUEST_INVALID'
  | 'AI_CONTEXT_INVALID'
  | 'AI_CONFIG_MISSING'
  | 'AI_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'AI_PROVIDER_ERROR';

export interface AiChatErrorPayload {
  code: AiChatErrorCode;
  message: string;
  status: number;
}

export function sendAiChatError(
  res: Response,
  status: number,
  code: AiChatErrorCode,
  message: string
) {
  return res.status(status).json({ code, message });
}

export function createAiChatErrorPayload(error: unknown): AiChatErrorPayload {
  const message = error instanceof Error ? error.message : 'AI 服务调用失败';
  const normalized = message.toLowerCase();

  if (message.includes('QWEN_API_KEY')) {
    return {
      code: 'AI_CONFIG_MISSING',
      message: 'AI 服务未配置，请检查后端 QWEN_API_KEY。',
      status: 500,
    };
  }

  if (message.startsWith('当前练习') || message.includes('小节不存在')) {
    return {
      code: 'AI_CONTEXT_INVALID',
      message,
      status: 400,
    };
  }

  if (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('etimedout')
  ) {
    return {
      code: 'AI_TIMEOUT',
      message: 'AI 响应超时，可以稍后重试。',
      status: 504,
    };
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('429')
  ) {
    return {
      code: 'AI_RATE_LIMITED',
      message: 'AI 请求过于频繁，请稍后再试。',
      status: 429,
    };
  }

  return {
    code: 'AI_PROVIDER_ERROR',
    message: 'AI 服务暂时不可用，请稍后重试。',
    status: 502,
  };
}
