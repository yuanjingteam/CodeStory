import { describe, expect, it } from 'vitest';
import {
  assertNoExerciseGenerationDuplicates,
  evaluateExerciseDuplicatePolicy,
  ExerciseGenerationDuplicateError,
} from '../../src/services/ai/exercise-gen/duplicate-policy';

const lessonId = 'lesson-a';

describe('阶段 2 · 出题重复阻断策略', () => {
  it.each(['approved', 'draft'] as const)(
    '阻断同小节 %s 既有题重复',
    (reviewStatus) => {
      expect(() =>
        assertNoExerciseGenerationDuplicates({
          lessonId,
          existingChecks: [
            {
              candidateIndex: 0,
              candidateLessonId: lessonId,
              matchedExerciseId: `exercise-${reviewStatus}`,
              matchedLessonId: lessonId,
              reviewStatus,
              similarity: 0.92,
            },
          ],
          batchChecks: [],
          phase: 'post_lock',
        })
      ).toThrowError(
        expect.objectContaining({
          code: 'EXERCISE_GENERATION_DUPLICATE',
          decision: expect.objectContaining({
            blocked: true,
            phase: 'post_lock',
          }),
        })
      );
    }
  );

  it('放行其他小节中的相似题', () => {
    const decision = evaluateExerciseDuplicatePolicy({
      lessonId,
      existingChecks: [
        {
          candidateIndex: 0,
          candidateLessonId: lessonId,
          matchedExerciseId: 'exercise-other-lesson',
          matchedLessonId: 'lesson-b',
          reviewStatus: 'approved',
          similarity: 1,
        },
      ],
      batchChecks: [],
    });

    expect(decision).toMatchObject({
      blocked: false,
      code: null,
      existingMatches: [],
    });
  });

  it('阻断同批候选之间的重复', () => {
    expect(() =>
      assertNoExerciseGenerationDuplicates({
        lessonId,
        existingChecks: [],
        batchChecks: [
          {
            candidateIndex: 1,
            matchedCandidateIndex: 0,
            lessonId,
            similarity: 0.97,
          },
        ],
      })
    ).toThrow(ExerciseGenerationDuplicateError);
  });

  it('无有效重复时返回可继续写入的决定', () => {
    const decision = assertNoExerciseGenerationDuplicates({
      lessonId,
      existingChecks: [
        {
          candidateIndex: 0,
          candidateLessonId: lessonId,
          matchedExerciseId: 'exercise-rejected',
          matchedLessonId: lessonId,
          reviewStatus: 'rejected',
          similarity: 1,
        },
        {
          candidateIndex: 1,
          candidateLessonId: lessonId,
          matchedExerciseId: 'exercise-below-threshold',
          matchedLessonId: lessonId,
          reviewStatus: 'approved',
          similarity: 0.919,
        },
      ],
      batchChecks: [],
    });

    expect(decision).toEqual({
      blocked: false,
      code: null,
      phase: 'preflight',
      existingMatches: [],
      batchMatches: [],
    });
  });
});
