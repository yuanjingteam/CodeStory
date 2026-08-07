import express from 'express';
import { MemoryStore } from 'express-rate-limit';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAiRateLimit } from '../../src/middleware/ai-rate-limit';

function createApp(scene: string) {
  const app = express();
  let downstreamCalls = 0;
  app.use((req, _res, next) => {
    req.user = { id: req.header('x-test-user') || 'user-a' };
    next();
  });
  app.post(
    '/ai',
    createAiRateLimit({
      scene,
      envPrefix: 'AI_TEST',
      defaultWindowMs: 60_000,
      defaultLimit: 1,
      store: new MemoryStore(),
    }),
    (_req, res) => {
      downstreamCalls += 1;
      res.json({ code: 200 });
    }
  );
  return { app, getDownstreamCalls: () => downstreamCalls };
}

describe('AI 高成本接口统一限流', () => {
  it('按 scene 与已认证用户隔离，并返回统一可读 429', async () => {
    const { app, getDownstreamCalls } = createApp('lesson-chat');

    expect((await request(app).post('/ai').set('x-test-user', 'user-a')).status)
      .toBe(200);
    const limited = await request(app).post('/ai').set('x-test-user', 'user-a');
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({
      code: 'AI_RATE_LIMITED',
      data: { scene: 'lesson-chat' },
    });
    expect(limited.body.message).toContain('后重试');

    expect((await request(app).post('/ai').set('x-test-user', 'user-b')).status)
      .toBe(200);
    expect(getDownstreamCalls()).toBe(2);
  });

  it('store 故障时采用一致的 fail-open 策略', async () => {
    class FailingStore extends MemoryStore {
      override async increment(_key: string): Promise<never> {
        throw new Error('redis unavailable');
      }
    }
    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: 'user-a' };
      next();
    });
    app.post(
      '/ai',
      createAiRateLimit({
        scene: 'lesson-chat',
        envPrefix: 'AI_TEST',
        defaultWindowMs: 60_000,
        defaultLimit: 1,
        store: new FailingStore(),
      }),
      (_req, res) => res.json({ code: 200 })
    );

    const response = await request(app).post('/ai');
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(200);
  });
});
