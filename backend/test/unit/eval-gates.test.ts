import { describe, expect, it } from 'vitest';
import { mergeExerciseHumanReviews } from '../../evals/merge-exercise-generation-audit';
import { scoreExerciseGeneration } from '../../evals/score-exercise-generation';
import { mergeGradingHumanReviews } from '../../evals/merge-grading-review-audit';
import { assertNewGradingRunPath } from '../../evals/run-grading-review';
import { screenAgainstApprovedLesson } from '../../evals/exercise-generation-duplicate';
import { exerciseGenerationApprovedBaseline } from '../../evals/datasets/exercise-generation-approved-baseline';

function stage2Attempts() {
  return Array.from({ length: 50 }, (_, index) => ({
    id: `case-${index}`,
    firstPassStructured: index < 45,
    repaired: index >= 45,
    finalSuccess: true,
    modelCallCount: index < 36 ? 1 : 2,
    validCandidateCount: 1,
    answerCorrect: index < 48,
    humanConfirmedDuplicate: index < 2,
    labelProvenance: 'human-reviewed',
  }));
}

describe('阶段二严格门禁', () => {
  it('只按同小节 approved baseline 进行 0.92 embedding 初筛', () => {
    const result = screenAgainstApprovedLesson(
      { lessonId: 'lesson-sql-where', embedding: [0.97, 0.24, 0] },
      exerciseGenerationApprovedBaseline,
    );
    expect(result.machineDuplicate).toBe(true);
    expect(result.matchedExerciseId).toBe('approved-sql-001');
    expect(result.similarity).toBeCloseTo(0.9701, 4);
    expect(screenAgainstApprovedLesson(
      { lessonId: 'lesson-python-branch', embedding: [1, 0, 0] },
      exerciseGenerationApprovedBaseline,
    ).machineDuplicate).toBe(false);
    expect(screenAgainstApprovedLesson(
      { lessonId: 'lesson-unrelated', embedding: [1, 0, 0] },
      exerciseGenerationApprovedBaseline,
    ).machineDuplicate).toBe(false);
  });
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

  it('校验 50 次、人工覆盖、阈值，并把跨课程相似度仅作为观察项', () => {
    const report = scoreExerciseGeneration(stage2Attempts(), { sampleCount: 50 });
    expect(report.passed).toBe(true);
    expect(report.observationOnly).toContain('crossCourseSimilarityRate');
    expect(report.manifestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(() => scoreExerciseGeneration(stage2Attempts().slice(0, 49), { sampleCount: 49 })).toThrow(/50 次/);
    const missingReview = stage2Attempts();
    missingReview[0].labelProvenance = 'agent-audited';
    expect(() => scoreExerciseGeneration(missingReview, { sampleCount: 50 })).toThrow(/人工标注/);
    const failed = stage2Attempts();
    failed[4].humanConfirmedDuplicate = true;
    failed[5].humanConfirmedDuplicate = true;
    expect(scoreExerciseGeneration(failed, { sampleCount: 50 }).passed).toBe(false);
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
