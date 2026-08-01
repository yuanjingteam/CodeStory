import express from 'express';
import request from 'supertest';
import { MemoryStore } from 'express-rate-limit';
import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  generatedExerciseBatchSchema,
} from '../../src/services/ai/exercise-gen';
import { createExerciseGenerationRateLimit } from '../../src/middleware/exercise-generation-rate-limit';

describe('阶段 2 · 出题结构化 Schema', () => {
  it('同批候选使用与索引一致的余弦阈值识别重复', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(Math.SQRT1_2);
  });

  it('固定构造的选择题和编程题 100% 通过', () => {
    const samples = Array.from({ length: 100 }, (_, index) =>
      index % 2 === 0
        ? {
            type: 'single_choice' as const,
            content: `第 ${index + 1} 道选择题`,
            answer: 'WHERE',
            analysis: 'WHERE 用于筛选行。',
            knowledge: 'SQL 条件查询',
            difficulty: 1,
            metadata: { options: ['WHERE', 'ORDER BY', 'GROUP BY'] },
            selfCheck: {
              formatValid: true as const,
              answerExists: true as const,
              difficultyMatch: true as const,
              notes: ['答案存在于选项中'],
            },
          }
        : {
            type: 'code' as const,
            content: `第 ${index + 1} 道编程题`,
            answer: 'def solve():\n    return 1',
            analysis: '返回目标值。',
            knowledge: 'Python 函数',
            difficulty: 1,
            metadata: {
              codeTemplate: 'def solve():\n    pass',
              language: 'python',
              testCases: [{ input: '', output: '1' }],
            },
            selfCheck: {
              formatValid: true as const,
              answerExists: true as const,
              difficultyMatch: true as const,
              notes: ['参考实现完整'],
            },
          }
    );

    for (const candidate of samples) {
      expect(
        generatedExerciseBatchSchema.safeParse({ candidates: [candidate] })
          .success
      ).toBe(true);
    }
  });

  it('拒绝答案不在选项、缺少自检和不支持题型的候选', () => {
    const base = {
      type: 'single_choice',
      content: 'WHERE 的作用是什么？',
      answer: '不存在的选项',
      analysis: '用于筛选。',
      knowledge: 'SQL',
      difficulty: 1,
      metadata: { options: ['筛选', '排序'] },
      selfCheck: {
        formatValid: true,
        answerExists: true,
        difficultyMatch: true,
        notes: [],
      },
    };
    expect(
      generatedExerciseBatchSchema.safeParse({ candidates: [base] }).success
    ).toBe(false);
    expect(
      generatedExerciseBatchSchema.safeParse({
        candidates: [{ ...base, answer: '筛选', selfCheck: undefined }],
      }).success
    ).toBe(false);
    expect(
      generatedExerciseBatchSchema.safeParse({
        candidates: [{ ...base, type: 'fill', answer: '筛选' }],
      }).success
    ).toBe(false);
  });
});

describe('阶段 2 · 出题限流', () => {
  it('超过阈值返回可读 429 且不再进入下游调用', async () => {
    const app = express();
    let downstreamCalls = 0;
    app.use((req, _res, next) => {
      req.user = { id: 'admin-stage-2' };
      next();
    });
    app.post(
      '/generate',
      createExerciseGenerationRateLimit({
        windowMs: 60_000,
        limit: 2,
        store: new MemoryStore(),
      }),
      (_req, res) => {
        downstreamCalls += 1;
        res.json({ code: 200 });
      }
    );

    expect((await request(app).post('/generate')).status).toBe(200);
    expect((await request(app).post('/generate')).status).toBe(200);
    const limited = await request(app).post('/generate');

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('AI_EXERCISE_GENERATION_RATE_LIMITED');
    expect(limited.body.message).toContain('后重试');
    expect(downstreamCalls).toBe(2);
  });
});
