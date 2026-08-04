import { describe, expect, it } from 'vitest';
import {
  choiceExplanationSchema,
} from '../../src/services/ai/choice-explanation.service';
import {
  codeReviewSchema,
} from '../../src/services/ai/code-review.service';
import { extractJsonObject } from '../../src/services/ai/_shared/model';
import {
  embedDocumentsInBatches,
  splitKnowledgeSource,
} from '../../src/services/rag';
import {
  getTraceId,
  runWithRequestContext,
} from '../../src/middleware/request-context';
import { calculateAiReviewedFinalScore } from '../../src/services/courses/code-grading.service';

describe('阶段 0B · 结构化输出 Schema', () => {
  it('接受合法代码评阅并拒绝越界分数', () => {
    const valid = {
      isLikelyCorrect: true,
      functionalScore: 60,
      qualityScore: 25,
      confidence: 0.92,
      feedback: '整体正确。',
      strengths: ['思路清晰'],
      issues: [],
      suggestions: ['补充边界处理'],
      needsManualReview: false,
    };

    expect(codeReviewSchema.parse(valid)).toEqual(valid);
    expect(() =>
      codeReviewSchema.parse({ ...valid, functionalScore: 71 })
    ).toThrow();
  });

  it('拒绝选择题讲解中的缺失字段和字符串布尔值', () => {
    const valid = {
      summary: '考查 WHERE。',
      correctOption: 'A',
      selectedOption: 'B',
      correctExplanation: 'A 符合题意。',
      selectedExplanation: 'B 混淆了排序和筛选。',
      optionExplanations: [
        { label: 'A', explanation: '用于筛选。', isCorrect: true },
      ],
      studyTip: '区分 WHERE 和 ORDER BY。',
    };

    expect(choiceExplanationSchema.parse(valid)).toEqual(valid);
    expect(() =>
      choiceExplanationSchema.parse({
        ...valid,
        optionExplanations: [
          { label: 'A', explanation: '用于筛选。', isCorrect: 'true' },
        ],
      })
    ).toThrow();
  });

  it('extractJsonObject 支持代码块并拒绝无 JSON 文本', () => {
    expect(
      extractJsonObject('```json\n{"ok":true}\n```', 'INVALID_JSON')
    ).toEqual({ ok: true });
    expect(() =>
      extractJsonObject('没有结构化内容', 'INVALID_JSON')
    ).toThrow('INVALID_JSON');
  });

  it('extractJsonObject 修复字符串内未转义控制字符', () => {
    expect(
      extractJsonObject('{"code":"line 1\n\tline 2"}', 'INVALID_JSON')
    ).toEqual({ code: 'line 1\n\tline 2' });
  });

  it('extractJsonObject 逐个解析平衡对象且不被说明文字中的花括号干扰', () => {
    expect(
      extractJsonObject(
        '说明 {not-json} 后续 {"code":"if (ok) { return {}; }"} 尾注',
        'INVALID_JSON'
      )
    ).toEqual({ code: 'if (ok) { return {}; }' });
    expect(
      extractJsonObject('{"first":1}\n{"second":2}', 'INVALID_JSON')
    ).toEqual({ second: 2 });
    expect(
      extractJsonObject('说明 { 未闭合，最终 {"ok":true}', 'INVALID_JSON')
    ).toEqual({ ok: true });
  });

  it('extractJsonObject 不补齐被截断的对象', () => {
    expect(() =>
      extractJsonObject('{"code":"unfinished"', 'INVALID_JSON')
    ).toThrow('INVALID_JSON');
  });
});

describe('阶段 0B · RAG 纯函数与客户端边界', () => {
  it('按固定规则切片并生成稳定 SHA-256', async () => {
    const source = {
      sourceType: 'lesson' as const,
      sourceId: '11111111-1111-1111-1111-111111111111',
      courseId: '22222222-2222-2222-2222-222222222222',
      lessonId: '11111111-1111-1111-1111-111111111111',
      sourceVersion: new Date('2026-07-30T00:00:00.000Z'),
      content: '第一段介绍数据库。\n\n第二段介绍 SQL 查询。\n\n第三段介绍索引。',
    };
    const first = await splitKnowledgeSource(source, {
      chunkSize: 20,
      chunkOverlap: 4,
    });
    const second = await splitKnowledgeSource(source, {
      chunkSize: 20,
      chunkOverlap: 4,
    });

    expect(first.length).toBeGreaterThan(1);
    expect(first.map((chunk) => chunk.contentHash)).toEqual(
      second.map((chunk) => chunk.contentHash)
    );
    expect(first.every((chunk) => chunk.content.trim().length > 0)).toBe(
      true
    );
  });

  it('11 条输入由本地拆成 10 + 1 两批', async () => {
    const batches: number[] = [];
    const fakeClient = {
      async embedDocuments(texts: string[]) {
        batches.push(texts.length);
        return texts.map(() => Array(1024).fill(0.1));
      },
      async embedQuery() {
        return Array(1024).fill(0.1);
      },
    };

    const vectors = await embedDocumentsInBatches(
      Array.from({ length: 11 }, (_, index) => `文本 ${index + 1}`),
      { client: fakeClient, batchSize: 10, dimensions: 1024 }
    );

    expect(batches).toEqual([10, 1]);
    expect(vectors).toHaveLength(11);
  });
});

describe('阶段 0B · 通用底座', () => {
  it('深层调用无需函数参数即可读取同一个 trace_id', () => {
    function deepServiceCall() {
      return getTraceId();
    }

    expect(
      runWithRequestContext(
        { traceId: 'trace-stage-0b' },
        deepServiceCall
      )
    ).toBe('trace-stage-0b');
  });

  it('AI 评阅最终分会扣提示分并限制在百分制', () => {
    const review = {
      review: {
        isLikelyCorrect: true,
        functionalScore: 70,
        qualityScore: 30,
        feedback: '正确',
        strengths: [],
        issues: [],
        suggestions: [],
        needsManualReview: false,
      },
      model: 'test-model',
      rubricVersion: 'test-rubric',
      rawContent: '{}',
    };

    expect(calculateAiReviewedFinalScore(review, 20)).toBe(80);
    expect(calculateAiReviewedFinalScore(review, -20)).toBe(100);
  });
});
