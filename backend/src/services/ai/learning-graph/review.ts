import prisma from '../../../config/prisma';
import type { Prisma } from '../../../generated/prisma';
import {
  createGradingReviewInTransaction,
  sanitizeExerciseGenerationMetadata,
} from '../../courses/grading-review.service';
import {
  getAppliedLearningEffect,
  getAppliedLearningEffectInTransaction,
  markLearningEffectApplied,
} from './effects';
import type { GuidedLearningGraphState } from './graph';

export async function createGuidedLearningReview(
  state: GuidedLearningGraphState
): Promise<string | null> {
  if (!state.exerciseId) return null;
  const effect = {
    runId: state.runId,
    nodeName: 'review',
    effectType: 'create_grading_review',
    effectKey: `${state.runId}:review`,
  };
  const applied = await getAppliedLearningEffect<{
    reviewId: string;
  }>(effect.effectKey);
  if (applied) return applied.reviewId;

  return prisma.$transaction(async (tx) => {
    const replay =
      await getAppliedLearningEffectInTransaction<{
        reviewId: string;
      }>(tx, effect.effectKey);
    if (replay) return replay.reviewId;

    const [answer, exercise] = await Promise.all([
      tx.answer.findUnique({
        where: {
          user_id_exercise_id: {
            user_id: state.userId,
            exercise_id: state.exerciseId!,
          },
        },
      }),
      tx.exercises.findUnique({
        where: { id: state.exerciseId! },
      }),
    ]);
    if (!answer || !exercise || answer.version < 1) return null;

    const review = await createGradingReviewInTransaction(tx, {
      userId: state.userId,
      exerciseId: exercise.id,
      submissionType: exercise.type,
      submittedAnswer: answer.answer || state.answer || '',
      answerVersion: answer.version,
      hintLevelUsed: answer.hint_level_used,
      exerciseSnapshot: {
        id: exercise.id,
        lessonId: exercise.lesson_id,
        type: exercise.type,
        content: exercise.content,
        answer: exercise.answer,
        analysis: exercise.analysis,
        knowledge: exercise.knowledge,
        difficulty: exercise.difficulty,
        source: exercise.source,
        reviewStatus: exercise.review_status,
        genMetadata: sanitizeExerciseGenerationMetadata(
          exercise.gen_metadata as Prisma.JsonValue | null
        ),
        metadata: exercise.metadata,
        grading: {
          currentPassed: false,
          guidedRunId: state.runId,
        },
      },
      triggerReason: 'guided_review_pending',
      ruleScore: answer.score,
    });
    await markLearningEffectApplied(tx, effect, {
      reviewId: review.id,
    });
    return review.id;
  });
}
