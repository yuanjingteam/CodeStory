export type AiChatErrorCode =
  | 'AI_REQUEST_INVALID'
  | 'AI_CONTEXT_INVALID'
  | 'AI_CONFIG_MISSING'
  | 'AI_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'AI_PROVIDER_ERROR';

export class AiChatStreamError extends Error {
  code?: AiChatErrorCode;

  constructor(message: string, code?: AiChatErrorCode) {
    super(message);
    this.name = 'AiChatStreamError';
    this.code = code;
  }
}

export function normalizeAiChatErrorCode(code: unknown): AiChatErrorCode | undefined {
  const supported: AiChatErrorCode[] = [
    'AI_REQUEST_INVALID',
    'AI_CONTEXT_INVALID',
    'AI_CONFIG_MISSING',
    'AI_TIMEOUT',
    'AI_RATE_LIMITED',
    'AI_PROVIDER_ERROR',
  ];

  return supported.includes(code as AiChatErrorCode)
    ? (code as AiChatErrorCode)
    : undefined;
}

export async function parseAiChatErrorPayload(response: Response): Promise<{
  code?: AiChatErrorCode;
  message: string;
}> {
  try {
    const data = (await response.json()) as { code?: unknown; message?: string };
    return {
      code: normalizeAiChatErrorCode(data.code),
      message: data.message || 'AI 服务调用失败',
    };
  } catch {
    return { message: 'AI 服务调用失败' };
  }
}
