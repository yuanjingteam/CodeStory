import { describe, expect, it } from 'vitest';
import { mergeExerciseHumanReviews } from '../../evals/merge-exercise-generation-audit';
import { scoreExerciseGeneration } from '../../evals/score-exercise-generation';
import { mergeGradingHumanReviews } from '../../evals/merge-grading-review-audit';
import { assertNewGradingRunPath } from '../../evals/run-grading-review';

function stage2Attempts() {
  return Array.from({ length: 100 }, (_, index) => ({
    id: `case-${index}`,
    firstPassStructured: index < 90,
    repaired: index >= 90 && index < 99,
    finalSuccess: index < 99,
    modelCallCount: index < 72 ? 1 : 2,
    validCandidateCount: index < 99 ? 1 : 0,
    answerCorrect: index < 95,
    humanConfirmedDuplicate: index < 4,
    labelProvenance: index < 99 ? 'human-reviewed' : 'pending-human-review',
  }));
}

describe('阶段二严格门禁', () => {
  it('只有完整管理员 sidecar 才能写入 human-reviewed provenance', () => {
    const results = [{ id: 'one', finalSuccess: true, validCandidateCount: 1 }];
    expect(() => mergeExerciseHumanReviews(results, [])).toThrow(/未覆盖/);
    const merged = mergeExerciseHumanReviews(results, [{
      id: 'one', answerCorrect: true, confirmedDuplicate: false,
      reviewer: 'admin-1', reviewedAt: '2026-08-01T00:00:00.000Z', note: 'checked',
    }]);
    expect(merged[0]).toMatchObject({
      answerCorrect: true,
      humanConfirmedDuplicate: false,
      labelProvenance: 'human-reviewed',
    });
  });

  it('校验 100 次、人工覆盖、阈值，并把跨课程相似度仅作为观察项', () => {
    const report = scoreExerciseGeneration(stage2Attempts(), { sampleCount: 100 });
    expect(report.passed).toBe(true);
    expect(report.observationOnly).toContain('crossCourseSimilarityRate');
    expect(report.manifestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(() => scoreExerciseGeneration(stage2Attempts().slice(0, 99), { sampleCount: 99 })).toThrow(/100 次/);
    const missingReview = stage2Attempts();
    missingReview[0].labelProvenance = 'agent-audited';
    expect(() => scoreExerciseGeneration(missingReview, { sampleCount: 100 })).toThrow(/人工标注/);
    const failed = stage2Attempts();
    failed[4].humanConfirmedDuplicate = true;
    failed[5].humanConfirmedDuplicate = true;
    expect(scoreExerciseGeneration(failed, { sampleCount: 100 }).passed).toBe(false);
  });
});

describe('阶段三运行与管理员评分链', () => {
  it('拒绝覆盖已有输出或 manifest', () => {
    expect(() => assertNewGradingRunPath(true, false)).toThrow(/新路径/);
    expect(() => assertNewGradingRunPath(false, true)).toThrow(/新路径/);
    expect(() => assertNewGradingRunPath(false, false)).not.toThrow();
  });

  it('必须 30/30 覆盖才标记 humanReviewed 并应用阈值', () => {
    const results = Array.from({ length: 30 }, (_, index) => ({
      id: `grading-${index}`,
      status: 'completed',
      aiPass: index < 27,
      aiScore: index < 27 ? 95 : 0,
    }));
    const report = { sampleCount: 30, results, manifestHash: 'manifest' };
    const reviews = results.map((result, index) => ({
      id: result.id,
      expectedPass: index < 27,
      expectedScore: index < 27 ? 100 : 0,
      reviewer: 'admin-1',
      reviewedAt: '2026-08-01T00:00:00.000Z',
    }));
    expect(() => mergeGradingHumanReviews(report, reviews.slice(0, 29))).toThrow(/30\/30/);
    const merged = mergeGradingHumanReviews(report, reviews);
    expect(merged).toMatchObject({ humanReviewed: true, passed: true, agreementRate: 1 });
  });
});
