import express from 'express';
import request from 'supertest';
import { MemoryStore } from 'express-rate-limit';
import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  EXERCISE_GENERATION_DUPLICATE_THRESHOLD,
  ExerciseGenerationError,
  findActiveDraftSemanticDuplicates,
  generatedExerciseBatchSchema,
  runExerciseGenerationPipeline,
} from '../../src/services/ai/exercise-gen';
import { createExerciseGenerationRateLimit } from '../../src/middleware/exercise-generation-rate-limit';

describe('阶段 2 · 出题结构化 Schema', () => {
  it('同批候选使用与索引一致的余弦阈值识别重复', () => {
    expect(EXERCISE_GENERATION_DUPLICATE_THRESHOLD).toBe(0.92);
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(Math.SQRT1_2);
  });

  it('批量比较同小节 active draft，并用快照跳过未变化草稿', async () => {
    const exercises = {
      findMany: async () => [
        { id: 'draft-close', content: '语义相同的草稿' },
        { id: 'draft-far', content: '无关草稿' },
      ],
    };
    let embeddingCalls = 0;
    const embedDocuments = async () => {
      embeddingCalls += 1;
      return [[1, 0], [0, 1]];
    };
    const first = await findActiveDraftSemanticDuplicates(
      { exercises } as never,
      'lesson-1',
      [[0.99, 0.01]],
      [],
      embedDocuments,
      2
    );

    expect(first.checks).toMatchObject([{
      matchedExerciseId: 'draft-close',
      reviewStatus: 'draft',
    }]);
    expect(embeddingCalls).toBe(1);

    const second = await findActiveDraftSemanticDuplicates(
      { exercises } as never,
      'lesson-1',
      [[0.99, 0.01]],
      first.snapshot,
      embedDocuments,
      2
    );
    expect(second.checks).toEqual([]);
    expect(embeddingCalls).toBe(1);
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

  it('归一化模型常见的等价字段表示但不改变题型约束', () => {
    const choice = generatedExerciseBatchSchema.parse({
      candidates: [{
        type: 'single_choice',
        content: '正确选项是什么？',
        answer: 'A',
        analysis: 'A 正确。',
        knowledge: '示例知识点',
        difficulty: 0,
        metadata: { options: [{ label: 'A' }, { text: 'B' }] },
        selfCheck: {
          formatValid: true,
          answerExists: true,
          difficultyMatch: true,
          notes: '已检查',
        },
      }],
    });
    expect(choice.candidates[0].metadata).toEqual({ options: ['A', 'B'] });
    expect(choice.candidates[0].selfCheck.notes).toEqual(['已检查']);

    const code = generatedExerciseBatchSchema.parse({
      candidates: [{
        type: 'code',
        content: '返回输入值。',
        answer: 'return input',
        analysis: '直接返回。',
        knowledge: '函数',
        difficulty: 0,
        metadata: {
          codeTemplate: 'function solve(input) {}',
          language: 'JavaScript',
          testCases: [{ input: { value: 1 }, expectedOutput: 1 }],
        },
        selfCheck: {
          formatValid: true,
          answerExists: true,
          difficultyMatch: true,
          notes: ['已检查'],
        },
      }],
    });
    expect(code.candidates[0].metadata).toMatchObject({
      testCases: [{ input: '{"value":1}', output: '1' }],
    });
  });
});

describe('阶段 2 · 出题调用稳定性', () => {
  const values = {
    hierarchy: '评测课程 / SQL / WHERE',
    knowledge: 'SQL WHERE',
    type: 'single_choice' as const,
    difficulty: 2,
    count: 1,
    evidence: 'WHERE 用于筛选满足条件的行。',
  };
  const validChoice = {
    candidates: [{
      type: 'single_choice',
      content: '哪个子句用于筛选行？',
      answer: 'WHERE',
      analysis: 'WHERE 在分组前筛选行。',
      knowledge: 'SQL WHERE',
      difficulty: 2,
      metadata: { options: ['WHERE', 'ORDER BY'] },
      selfCheck: {
        formatValid: true,
        answerExists: true,
        difficultyMatch: true,
        notes: ['已检查'],
      },
    }],
  };

  it('传输超时只重试 generation prompt 并记录实际调用', async () => {
    const promptKinds: string[] = [];
    let calls = 0;
    const result = await runExerciseGenerationPipeline(values, async (invocation) => {
      promptKinds.push(invocation.promptKind);
      calls += 1;
      if (calls === 1) throw new Error('Request timed out.');
      return JSON.stringify(validChoice);
    });

    expect(promptKinds).toEqual(['generation', 'generation']);
    expect(result.metrics).toMatchObject({
      firstPassStructured: true,
      repaired: false,
      firstFailureKind: 'transport_timeout',
      modelCallCount: 2,
    });
    expect(result.metrics.attemptLatenciesMs).toHaveLength(2);
  });

  it('连续两次传输超时后执行第三次同提示重试', async () => {
    const promptKinds: string[] = [];
    let calls = 0;
    const result = await runExerciseGenerationPipeline(values, async (invocation) => {
      promptKinds.push(invocation.promptKind);
      calls += 1;
      if (calls < 3) throw new Error('Request timed out.');
      return JSON.stringify(validChoice);
    });

    expect(promptKinds).toEqual(['generation', 'generation', 'generation']);
    expect(result.metrics).toMatchObject({
      firstPassStructured: true,
      repaired: false,
      firstFailureKind: 'transport_timeout',
      modelCallCount: 3,
    });
    expect(result.metrics.attemptLatenciesMs).toHaveLength(3);
  });

  it('JSON 缺失时把截断响应和安全问题路径交给 repair', async () => {
    const invocations: Array<{ promptKind: string; values: Record<string, unknown> }> = [];
    const result = await runExerciseGenerationPipeline(values, async (invocation) => {
      invocations.push(invocation);
      return invocation.promptKind === 'generation'
        ? '不是 JSON'.repeat(2_500)
        : JSON.stringify(validChoice);
    });

    expect(result.metrics.firstFailureKind).toBe('json_not_found');
    expect(result.metrics.repaired).toBe(true);
    expect(result.metrics.modelCallCount).toBe(2);
    expect(invocations[1].values.validationIssues).toBe('<root>:invalid_json');
    expect(String(invocations[1].values.previousResponse)).toHaveLength(4_000);
  });

  it('Schema 错误只向 repair 暴露 issue code 与字段路径', async () => {
    const broken = structuredClone(validChoice);
    delete (broken.candidates[0] as Partial<typeof validChoice.candidates[0]>).selfCheck;
    let repairIssues = '';
    const result = await runExerciseGenerationPipeline(values, async (invocation) => {
      if (invocation.promptKind === 'repair') {
        repairIssues = String(invocation.values.validationIssues);
        return JSON.stringify(validChoice);
      }
      return JSON.stringify(broken);
    });

    expect(result.metrics.firstFailureKind).toBe('schema_validation');
    expect(repairIssues).toContain('candidates.0');
    expect(repairIssues).toMatch(/invalid_type/);
    expect(repairIssues).toContain('selfCheck');
    expect(repairIssues).not.toContain('Invalid input');
  });

  it('数量不匹配进入 repair，Schema 示例动态匹配数量、难度与语言', async () => {
    const codeCandidate = {
      type: 'code' as const,
      content: '编写 SQL 查询。',
      answer: 'SELECT 1;',
      analysis: '返回常量。',
      knowledge: 'SQL SELECT',
      difficulty: 2,
      metadata: {
        codeTemplate: 'SELECT ...;',
        language: 'SQL',
        testCases: [{ input: '', output: '1' }],
      },
      selfCheck: {
        formatValid: true as const,
        answerExists: true as const,
        difficultyMatch: true as const,
        notes: ['已检查'],
      },
    };
    const codeValues = {
      ...values,
      type: 'code' as const,
      knowledge: 'SQL SELECT',
      count: 2,
    };
    let generationSchema = '';
    const result = await runExerciseGenerationPipeline(codeValues, async (invocation) => {
      if (invocation.promptKind === 'generation') {
        generationSchema = String(invocation.values.schemaInstructions);
        return JSON.stringify({ candidates: [codeCandidate] });
      }
      return JSON.stringify({ candidates: [codeCandidate, codeCandidate] });
    });

    const schema = JSON.parse(generationSchema);
    expect(schema.candidates).toHaveLength(2);
    expect(schema.candidates[0]).toMatchObject({
      difficulty: 2,
      metadata: { language: 'SQL' },
    });
    expect(result.metrics.firstFailureKind).toBe('count_mismatch');
    expect(result.metrics.modelCallCount).toBe(2);
  });

  it('题型或难度不符进入 repair，repair 后仍不符则结构失败', async () => {
    const mismatched = {
      candidates: [{
        type: 'code' as const,
        content: '返回 1。',
        answer: 'return 1',
        analysis: '返回常量。',
        knowledge: '函数',
        difficulty: 1,
        metadata: {
          codeTemplate: 'function solve() {}',
          language: 'JavaScript',
          testCases: [{ input: '', output: '1' }],
        },
        selfCheck: {
          formatValid: true as const,
          answerExists: true as const,
          difficultyMatch: true as const,
          notes: ['已检查'],
        },
      }],
    };
    const prompts: string[] = [];
    await expect(
      runExerciseGenerationPipeline(values, async (invocation) => {
        prompts.push(invocation.promptKind);
        if (invocation.promptKind === 'repair') {
          expect(String(invocation.values.validationIssues)).toContain(
            'candidates.0.type:constraint_mismatch'
          );
          expect(String(invocation.values.validationIssues)).toContain(
            'candidates.0.difficulty:constraint_mismatch'
          );
        }
        return JSON.stringify(mismatched);
      })
    ).rejects.toMatchObject({
      code: 'EXERCISE_GENERATION_SCHEMA_FAILED',
      originalCause: {
        firstFailureKind: 'constraint_mismatch',
        repairFailureKind: 'constraint_mismatch',
      },
    });
    expect(prompts).toEqual(['generation', 'repair']);
  });

  it('repair 模型普通请求错误映射为 request failed', async () => {
    let calls = 0;
    let thrown: unknown;
    try {
      await runExerciseGenerationPipeline(values, async () => {
        calls += 1;
        if (calls === 1) return 'not json';
        throw new Error('connection reset');
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ExerciseGenerationError);
    expect(thrown).toMatchObject({
      code: 'EXERCISE_GENERATION_REQUEST_FAILED',
      originalCause: {
        firstFailureKind: 'json_not_found',
        modelCallCount: 2,
      },
    });
  });

  it('结构修复最终失败只记录响应长度，不记录额外响应副本', async () => {
    await expect(
      runExerciseGenerationPipeline(values, async (invocation) =>
        invocation.promptKind === 'generation' ? 'not json' : 'still not json'
      )
    ).rejects.toMatchObject({
      code: 'EXERCISE_GENERATION_SCHEMA_FAILED',
      originalCause: {
        firstFailureKind: 'json_not_found',
        repairFailureKind: 'json_not_found',
        firstResponseLength: 8,
        repairResponseLength: 14,
      },
    });
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
