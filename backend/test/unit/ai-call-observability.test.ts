import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeRaw, warn } = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../../src/config/prisma', () => ({
  default: { $executeRaw: executeRaw },
}));
vi.mock('../../src/config/logger', () => ({
  logger: { warn },
}));

import {
  observeAiCall,
  observeAiStream,
} from '../../src/services/ai/_shared/ai-call-observability.service';

describe('AI 调用可观测性', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_MODEL = 'test-model';
    process.env.AI_INPUT_COST_USD_PER_MILLION_TOKENS = '2';
    process.env.AI_OUTPUT_COST_USD_PER_MILLION_TOKENS = '8';
    executeRaw.mockResolvedValue(1);
  });

  it('记录 token、成本和后台 trace，但不记录调用输入或输出原文', async () => {
    const result = await observeAiCall(
      { scene: 'test-scene', node: 'invoke', promptVersion: 'v1' },
      async () => ({
        content: 'secret-output',
        usage_metadata: {
          input_tokens: 10,
          output_tokens: 5,
          total_tokens: 15,
        },
      })
    );

    expect(result.content).toBe('secret-output');
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const serializedCall = JSON.stringify(executeRaw.mock.calls[0]);
    expect(serializedCall).toContain('test-scene');
    expect(serializedCall).toContain('test-model');
    expect(serializedCall).not.toContain('secret-output');
    expect(serializedCall).not.toContain('test-key');
  });

  it('日志写入失败时只告警，不影响主调用结果', async () => {
    executeRaw.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(observeAiCall(
      { scene: 'test-scene' },
      async () => 'ok'
    )).resolves.toBe('ok');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('流式调用完成后仅记录供应商可用指标，不估算字符 token', async () => {
    async function* chunks() {
      yield { content: 'first' };
      yield { content: 'second' };
    }
    const received: string[] = [];
    for await (const chunk of observeAiStream(
      { scene: 'lesson-chat', promptVersion: 'v1' },
      async () => chunks()
    )) {
      received.push(chunk.content);
    }

    expect(received).toEqual(['first', 'second']);
    expect(executeRaw).toHaveBeenCalledOnce();
    const serializedCall = JSON.stringify(executeRaw.mock.calls[0]);
    expect(serializedCall).not.toContain('first');
    expect(serializedCall).not.toContain('second');
  });

  it('消费方提前中断流时记录失败且不泄露最后一个 chunk', async () => {
    async function* chunks() {
      yield { content: 'secret-stream-chunk' };
      yield { content: 'unreachable' };
    }
    for await (const _chunk of observeAiStream(
      { scene: 'lesson-chat' },
      async () => chunks()
    )) {
      break;
    }

    expect(executeRaw).toHaveBeenCalledOnce();
    const serializedCall = JSON.stringify(executeRaw.mock.calls[0]);
    expect(serializedCall).toContain('AI_STREAM_ABORTED');
    expect(serializedCall).not.toContain('secret-stream-chunk');
  });
});
