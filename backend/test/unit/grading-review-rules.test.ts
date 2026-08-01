import { describe, expect, it } from 'vitest';
import { calculateAiReviewedFinalScore } from '../../src/services/courses/code-grading.service';
import { createSubmissionFingerprint } from '../../src/services/courses/grading-review.service';
import { gradingStage3Dataset } from '../../evals/datasets/grading-stage3';
import {
  buildGradingReportCase,
  buildGradingReviewInput,
  NEUTRAL_GRADING_REFERENCE_ANALYSIS,
} from '../../evals/run-grading-review';

describe('阶段 3 · 提交指纹', () => {
  const base = {
    userId: 'user-1',
    exerciseId: 'exercise-1',
    answerVersion: 1,
    submittedAnswer: 'SELECT 1;',
    hintLevelUsed: 2,
    codeSubmissionId: 'submission-1',
  };

  it('相同服务端快照生成相同 SHA-256', () => {
    expect(createSubmissionFingerprint(base)).toBe(createSubmissionFingerprint({ ...base }));
    expect(createSubmissionFingerprint(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('answer version 或服务端提示等级变化会生成不同指纹', () => {
    expect(createSubmissionFingerprint(base)).not.toBe(
      createSubmissionFingerprint({ ...base, answerVersion: 2 })
    );
    expect(createSubmissionFingerprint(base)).not.toBe(
      createSubmissionFingerprint({ ...base, hintLevelUsed: 3 })
    );
  });
});

describe('阶段 3 · AI 评分合并', () => {
  it('functional + quality - 服务端提示扣分，并限制到 0-100', () => {
    expect(calculateAiReviewedFinalScore({
      review: {
        isLikelyCorrect: true,
        functionalScore: 70,
        qualityScore: 25,
        confidence: 0.95,
        feedback: '通过',
        strengths: [],
        issues: [],
        suggestions: [],
        needsManualReview: false,
      },
      model: 'test',
      rubricVersion: 'test',
      rawContent: '{}',
    }, 20)).toBe(75);
  });
});

describe('阶段 3 · 固定评测集', () => {
  it('正确、错误、边界答案各 10 条且均标注期望结论与分数', () => {
    expect(gradingStage3Dataset).toHaveLength(30);
    for (const answerClass of ['correct', 'wrong', 'boundary']) {
      expect(gradingStage3Dataset.filter((item) => item.answerClass === answerClass)).toHaveLength(10);
    }
    expect(gradingStage3Dataset.every((item) => (
      typeof item.expectedPass === 'boolean'
      && item.agentScore >= 0
      && item.agentScore <= 100
    ))).toBe(true);
  });

  it('构造模型输入时不泄漏 Agent 金标解释', () => {
    const item = {
      ...gradingStage3Dataset[0],
      rationale: 'UNIQUE_GOLD_LABEL_RATIONALE',
    };
    const staticGrade = {
      correct: false,
      score: 0,
      feedback: '静态初判',
      language: 'sql',
      compileSuccess: null,
      functionalScore: 0,
      hintDeduction: 0,
      passedCount: 0,
      totalCount: 0,
      errorType: 'wrong_answer',
      testResult: null,
    };

    const input = buildGradingReviewInput(item, staticGrade);

    expect(input.analysis).toBe(NEUTRAL_GRADING_REFERENCE_ANALYSIS);
    expect(JSON.stringify(input)).not.toContain(item.rationale);

    const reportCase = buildGradingReportCase(item);
    expect(reportCase).not.toHaveProperty('rationale');
    expect(JSON.stringify(reportCase)).not.toContain(item.rationale);
  });
});
