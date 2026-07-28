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

type AiLimitType = 'RPM' | 'RPD' | 'TPM' | 'TPD' | 'IPM' | 'IPD';

interface AiErrorLike {
  status?: unknown;
  code?: unknown;
  type?: unknown;
  requestID?: unknown;
  headers?: unknown;
  error?: unknown;
  cause?: unknown;
  message?: unknown;
}

const LIMIT_MESSAGES: Record<AiLimitType, string> = {
  RPM: 'AI 服务达到每分钟请求次数限制，请稍后再试。',
  RPD: 'AI 服务达到每日请求次数限制，请稍后再试。',
  TPM: 'AI 服务达到每分钟 Token 限制，请稍后再试。',
  TPD: 'AI 服务达到每日 Token 限制，请稍后再试。',
  IPM: 'AI 服务达到每分钟输入 Token 限制，请稍后再试。',
  IPD: 'AI 服务达到每日输入 Token 限制，请稍后再试。',
};

function asErrorLike(value: unknown): AiErrorLike {
  return value && typeof value === 'object' ? (value as AiErrorLike) : {};
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  const value = asErrorLike(error);
  if (typeof value.message === 'string' && value.message) return value.message;

  const providerError = asErrorLike(value.error);
  if (typeof providerError.message === 'string' && providerError.message) {
    return providerError.message;
  }

  return 'AI 服务调用失败';
}

function getProviderMessage(error: unknown): string {
  const value = asErrorLike(error);
  const providerError = asErrorLike(value.error);

  if (typeof providerError.message === 'string' && providerError.message) {
    return providerError.message;
  }

  return getErrorMessage(error);
}

function getNumericStatus(error: unknown): number | undefined {
  const value = asErrorLike(error);
  const providerError = asErrorLike(value.error);
  const cause = asErrorLike(value.cause);
  const statuses = [value.status, providerError.status, cause.status];
  return statuses.find((status): status is number => typeof status === 'number');
}

function getStructuredValue(
  error: unknown,
  key: 'code' | 'type' | 'requestID'
): string | undefined {
  const value = asErrorLike(error);
  const providerError = asErrorLike(value.error);
  const cause = asErrorLike(value.cause);
  const candidates = [value[key], providerError[key], cause[key]];
  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && candidate.length > 0
  );
}

function getLimitType(message: string): AiLimitType | undefined {
  const match = message.toUpperCase().match(/\b(RPM|RPD|TPM|TPD|IPM|IPD)\b/);
  return match?.[1] as AiLimitType | undefined;
}

function getHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined;

  const getter = (headers as { get?: unknown }).get;
  if (typeof getter === 'function') {
    const value = getter.call(headers, name);
    return typeof value === 'string' && value ? value : undefined;
  }

  const record = headers as Record<string, unknown>;
  const value = record[name] ?? record[name.toLowerCase()];
  return typeof value === 'string' && value ? value : undefined;
}

function sanitizeLogMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .slice(0, 500);
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
  const message = getErrorMessage(error);
  const providerMessage = getProviderMessage(error);
  const providerCode = getStructuredValue(error, 'code');
  const providerType = getStructuredValue(error, 'type');
  const normalized =
    `${providerCode || ''} ${providerType || ''} ${message} ${providerMessage}`
      .toLowerCase();
  const status = getNumericStatus(error);

  if (
    normalized.includes('ai_api_key') ||
    normalized.includes('qwen_api_key') ||
    normalized.includes('ai_model')
  ) {
    return {
      code: 'AI_CONFIG_MISSING',
      message: 'AI 服务未配置，请检查后端 AI 配置。',
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
    status === 408 ||
    status === 504 ||
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
    status === 429 ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('429')
  ) {
    const limitType = getLimitType(
      `${providerCode || ''} ${providerType || ''} ${providerMessage}`
    );
    return {
      code: 'AI_RATE_LIMITED',
      message:
        (limitType && LIMIT_MESSAGES[limitType]) ||
        'AI 上游服务当前触发限流，请稍后再试。',
      status: 429,
    };
  }

  if (
    status === 401 ||
    normalized.includes('invalid_api_key') ||
    normalized.includes('api_key_invalid') ||
    normalized.includes('authentication_error')
  ) {
    return {
      code: 'AI_PROVIDER_ERROR',
      message: 'AI 服务密钥无效，请检查服务商配置。',
      status: 502,
    };
  }

  if (
    status === 402 ||
    status === 403 ||
    normalized.includes('insufficient_quota') ||
    normalized.includes('insufficient_balance') ||
    normalized.includes('billing_error') ||
    normalized.includes('permission_denied')
  ) {
    return {
      code: 'AI_PROVIDER_ERROR',
      message: 'AI 服务账户余额不足或没有模型权限。',
      status: 502,
    };
  }

  return {
    code: 'AI_PROVIDER_ERROR',
    message: 'AI 服务暂时不可用，请稍后重试。',
    status: 502,
  };
}

export function logAiError(
  feature: string,
  error: unknown,
  payload = createAiChatErrorPayload(error)
): void {
  const value = asErrorLike(error);
  const providerMessage = getProviderMessage(error);
  const providerCode = getStructuredValue(error, 'code');
  const providerType = getStructuredValue(error, 'type');

  console.error('AI 服务调用失败:', {
    feature,
    modelErrorCode: providerCode,
    providerType,
    providerStatus: getNumericStatus(error),
    requestId: getStructuredValue(error, 'requestID'),
    retryAfter:
      getHeader(value.headers, 'retry-after') ||
      getHeader(value.headers, 'retry-after-ms'),
    limitType: getLimitType(
      `${providerCode || ''} ${providerType || ''} ${providerMessage}`
    ),
    publicCode: payload.code,
    message: sanitizeLogMessage(providerMessage),
  });
}

export function sendAiErrorResponse(
  res: Response,
  feature: string,
  error: unknown
) {
  const payload = createAiChatErrorPayload(error);
  logAiError(feature, error, payload);
  return sendAiChatError(res, payload.status, payload.code, payload.message);
}
