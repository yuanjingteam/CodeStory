import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAiChatErrorPayload,
  logAiError,
} from '../../src/services/ai/ai-chat-error.service';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI 上游错误映射', () => {
  it.each([
    ['RPM', '每分钟请求次数'],
    ['RPD', '每日请求次数'],
    ['TPM', '每分钟 Token'],
    ['TPD', '每日 Token'],
    ['IPM', '每分钟输入 Token'],
    ['IPD', '每日输入 Token'],
  ])('识别结构化 429 的 %s 限流维度', (type, expectedMessage) => {
    const payload = createAiChatErrorPayload({
      status: 429,
      type,
      error: { code: 'rate_limit_exceeded', message: 'limit reached' },
    });

    expect(payload).toMatchObject({
      code: 'AI_RATE_LIMITED',
      status: 429,
    });
    expect(payload.message).toContain(expectedMessage);
  });

  it('区分超时、无效 Key 与余额或权限不足', () => {
    expect(createAiChatErrorPayload({ code: 'ETIMEDOUT' })).toMatchObject({
      code: 'AI_TIMEOUT',
      status: 504,
    });
    expect(
      createAiChatErrorPayload({ error: { status: 401, code: 'invalid_api_key' } })
    ).toMatchObject({
      code: 'AI_PROVIDER_ERROR',
      status: 502,
      message: expect.stringContaining('密钥无效'),
    });
    expect(
      createAiChatErrorPayload({ status: 403, type: 'insufficient_quota' })
    ).toMatchObject({
      code: 'AI_PROVIDER_ERROR',
      status: 502,
      message: expect.stringContaining('余额不足或没有模型权限'),
    });
    expect(
      createAiChatErrorPayload({
        status: 400,
        error: { code: 'invalid_api_key' },
      })
    ).toMatchObject({
      status: 502,
      message: expect.stringContaining('密钥无效'),
    });
    expect(
      createAiChatErrorPayload({
        status: 400,
        type: 'insufficient_balance',
      })
    ).toMatchObject({
      status: 502,
      message: expect.stringContaining('余额不足或没有模型权限'),
    });
  });

  it('日志保留诊断字段但脱敏 Bearer 与 Key', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logAiError('chat', {
      status: 429,
      type: 'TPM',
      requestID: 'request-1',
      message: 'Bearer secret-token sk-super-secret',
    });

    expect(errorSpy).toHaveBeenCalledOnce();
    const serialized = JSON.stringify(errorSpy.mock.calls[0]);
    expect(serialized).toContain('request-1');
    expect(serialized).toContain('TPM');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('sk-super-secret');
  });
});
