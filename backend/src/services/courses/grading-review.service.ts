import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import { getTraceId } from '../../middleware/request-context';
import { resolveShortId } from '../../utils/idTransform';
import {
  calculateLessonMasteryLevel,
  resolveMasteryLevel,
  updateLessonMasteryInTransaction,
} from './learning-progress.service';

export const GRADING_REVIEW_STATUSES = ['pending', 'reviewed', 'stale'] as const;
export const GRADING_REVIEW_RESULTS = ['maintained', 'mastered', 'not_mastered'] as const;

export type GradingReviewStatus = typeof GRADING_REVIEW_STATUSES[number];
export type GradingReviewResult = typeof GRADING_REVIEW_RESULTS[number];
export type GradingReviewTriggerReason =
  | 'rule_ai_conflict'
  | 'low_confidence'
  | 'ai_requested'
  | 'structured_output_failure'
  | 'guided_review_pending'
  | 'user_appeal';

export interface GradingReviewCandidate {
  userId: string;
  exerciseId: string;
  submissionType: string;
  codeSubmissionId?: string;
  submittedAnswer: string;
  answerVersion: number;
  hintLevelUsed: number;
  exerciseSnapshot: Prisma.InputJsonValue;
  triggerReason: GradingReviewTriggerReason;
  aiScore?: number;
  ruleScore?: number;
  appealReason?: string;
}

export class GradingReviewNotFoundError extends Error {}
export class GradingReviewConflictError extends Error {
  constructor(message: string, public readonly reason: 'already_reviewed' | 'stale') {
    super(message);
  }
}

export function sanitizeExerciseGenerationMetadata(
  value: Prisma.JsonValue | null
): Prisma.InputJsonValue | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  const metadata = value as Record<string, Prisma.JsonValue>;
  const allowedKeys = [
    'traceId',
    'model',
    'promptVersion',
    'retrieval',
    'parameters',
    'selfCheck',
    'duplicateCheck',
    'generationMetrics',
    'generatedAt',
  ];
  return Object.fromEntries(
    allowedKeys
      .filter((key) => metadata[key] !== undefined)
      .map((key) => [key, metadata[key]])
  ) as Prisma.InputJsonObject;
}

const SERIALIZABLE_RETRY_LIMIT = 3;

function isSerializationConflict(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2034';
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function createSubmissionFingerprint(params: {
  userId: string;
  exerciseId: string;
  answerVersion: number;
  submittedAnswer: string;
  hintLevelUsed: number;
  codeSubmissionId?: string | null;
}): string {
  return createHash('sha256')
    .update(stableStringify({
      userId: params.userId,
      exerciseId: params.exerciseId,
      answerVersion: params.answerVersion,
      submittedAnswer: params.submittedAnswer,
      hintLevelUsed: params.hintLevelUsed,
      codeSubmissionId: params.codeSubmissionId || null,
    }))
    .digest('hex');
}

export async function createGradingReviewInTransaction(
  tx: Prisma.TransactionClient,
  candidate: GradingReviewCandidate
) {
  const submissionFingerprint = createSubmissionFingerprint({
    userId: candidate.userId,
    exerciseId: candidate.exerciseId,
    answerVersion: candidate.answerVersion,
    submittedAnswer: candidate.submittedAnswer,
    hintLevelUsed: candidate.hintLevelUsed,
    codeSubmissionId: candidate.codeSubmissionId,
  });

  if (candidate.appealReason) {
    const pending = await tx.ai_grading_reviews.findFirst({
      where: {
        user_id: candidate.userId,
        exercise_id: candidate.exerciseId,
        submission_fingerprint: submissionFingerprint,
        status: 'pending',
      },
    });
    if (pending) {
      return tx.ai_grading_reviews.update({
        where: { id: pending.id },
        data: { appeal_reason: candidate.appealReason },
      });
    }
  }

  return tx.ai_grading_reviews.upsert({
    where: {
      user_id_exercise_id_submission_fingerprint_trigger_reason: {
        user_id: candidate.userId,
        exercise_id: candidate.exerciseId,
        submission_fingerprint: submissionFingerprint,
        trigger_reason: candidate.triggerReason,
      },
    },
    create: {
      trace_id: getTraceId(),
      user_id: candidate.userId,
      exercise_id: candidate.exerciseId,
      submission_type: candidate.submissionType,
      code_submission_id: candidate.codeSubmissionId,
      submission_fingerprint: submissionFingerprint,
      answer_version: candidate.answerVersion,
      submitted_answer: candidate.submittedAnswer,
      hint_level_used: candidate.hintLevelUsed,
      exercise_snapshot: candidate.exerciseSnapshot,
      trigger_reason: candidate.triggerReason,
      ai_score: candidate.aiScore,
      rule_score: candidate.ruleScore,
      appeal_reason: candidate.appealReason,
    },
    update: candidate.appealReason
      ? { appeal_reason: candidate.appealReason }
      : {},
  });
}

function toReviewStatus(review: {
  id: string;
  status: string;
  trigger_reason: string;
  answer_version: number;
  appeal_reason: string | null;
}) {
  return {
    id: review.id,
    status: review.status as GradingReviewStatus,
    triggerReason: review.trigger_reason,
    answerVersion: review.answer_version,
    canAppeal: review.status === 'pending' && !review.appeal_reason,
  };
}

const reviewInclude = {
  users: { select: { id: true, email: true, nickname: true } },
  reviewer: { select: { id: true, email: true, nickname: true } },
  exercises: {
    select: {
      id: true,
      content: true,
      lessons: { select: { id: true, title: true } },
    },
  },
} satisfies Prisma.ai_grading_reviewsInclude;

type ReviewWithRelations = Prisma.ai_grading_reviewsGetPayload<{
  include: typeof reviewInclude;
}>;

function mapReviewSummary(review: ReviewWithRelations) {
  return {
    id: review.id,
    traceId: review.trace_id,
    exerciseId: review.exercise_id,
    exerciseContent: review.exercises.content,
    lessonTitle: review.exercises.lessons.title,
    user: review.users,
    submissionType: review.submission_type,
    triggerReason: review.trigger_reason,
    aiScore: review.ai_score,
    ruleScore: review.rule_score,
    status: review.status as GradingReviewStatus,
    answerVersion: review.answer_version,
    hintLevelUsed: review.hint_level_used,
    appealed: Boolean(review.appeal_reason),
    createdAt: review.created_at,
  };
}

function mapReviewDetail(review: ReviewWithRelations) {
  return {
    ...mapReviewSummary(review),
    submittedAnswer: review.submitted_answer,
    exerciseSnapshot: review.exercise_snapshot,
    codeSubmissionId: review.code_submission_id,
    appealReason: review.appeal_reason,
    reviewedResult: review.reviewed_result,
    reviewNote: review.review_note,
    reviewedAt: review.reviewed_at,
    reviewer: review.reviewer,
  };
}

export async function listGradingReviews(params: {
  status?: GradingReviewStatus;
  page: number;
  size: number;
}) {
  const where = params.status ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    prisma.ai_grading_reviews.findMany({
      where,
      include: reviewInclude,
      orderBy: [{ status: 'asc' }, { created_at: 'asc' }],
      skip: (params.page - 1) * params.size,
      take: params.size,
    }),
    prisma.ai_grading_reviews.count({ where }),
  ]);

  return {
    items: items.map(mapReviewSummary),
    pagination: {
      page: params.page,
      size: params.size,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.size)),
    },
  };
}

export async function getGradingReviewDetail(id: string) {
  const review = await prisma.ai_grading_reviews.findUnique({
    where: { id },
    include: reviewInclude,
  });
  return review ? mapReviewDetail(review) : null;
}

async function calculateCandidateMastery(
  tx: Prisma.TransactionClient,
  lessonId: string,
  userId: string
) {
  const [totalExercises, answers] = await Promise.all([
    tx.exercises.count({
      where: {
        lesson_id: lessonId,
        is_delete: 0,
        review_status: 'approved',
      },
    }),
    tx.answer.findMany({
      where: {
        user_id: userId,
        is_delete: 0,
        exercises: {
          lesson_id: lessonId,
          is_delete: 0,
          review_status: 'approved',
        },
      },
      select: { score: true, hint_level_used: true },
    }),
  ]);
  return calculateLessonMasteryLevel(
    answers.map((answer) => ({
      score: answer.score,
      hintLevelUsed: answer.hint_level_used,
    })),
    totalExercises
  );
}

export async function reviewGradingReview(params: {
  reviewId: string;
  reviewerId: string;
  result: GradingReviewResult;
  note?: string;
}) {
  let lastSerializationError: unknown;
  try {
    for (let attempt = 0; attempt < SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
      try {
        const outcome = await prisma.$transaction(async (tx) => {
      const review = await tx.ai_grading_reviews.findUnique({
        where: { id: params.reviewId },
        include: {
          exercises: { select: { lesson_id: true } },
        },
      });
      if (!review) throw new GradingReviewNotFoundError('复核单不存在');
      if (review.status !== 'pending') {
        throw new GradingReviewConflictError('复核单已处理', 'already_reviewed');
      }

      const currentAnswer = await tx.answer.findUnique({
        where: {
          user_id_exercise_id: {
            user_id: review.user_id,
            exercise_id: review.exercise_id,
          },
        },
      });
      if (!currentAnswer || currentAnswer.version !== review.answer_version) {
        const stale = await tx.ai_grading_reviews.updateMany({
          where: { id: review.id, status: 'pending' },
          data: {
            status: 'stale',
            reviewer_id: params.reviewerId,
            reviewed_result: params.result,
            review_note: params.note,
            reviewed_at: new Date(),
          },
        });
        if (stale.count !== 1) {
          throw new GradingReviewConflictError('复核单已被其他管理员处理', 'already_reviewed');
        }
        return { status: 'stale' as const };
      }

      const updated = await tx.ai_grading_reviews.updateMany({
        where: { id: review.id, status: 'pending' },
        data: {
          status: 'reviewed',
          reviewer_id: params.reviewerId,
          reviewed_result: params.result,
          review_note: params.note,
          reviewed_at: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new GradingReviewConflictError('复核单已被其他管理员处理', 'already_reviewed');
      }

      await tx.ai_grading_reviews.updateMany({
        where: {
          id: { not: review.id },
          user_id: review.user_id,
          exercise_id: review.exercise_id,
          submission_fingerprint: review.submission_fingerprint,
          status: 'pending',
        },
        data: {
          status: 'stale',
          reviewer_id: params.reviewerId,
          review_note: '同一提交的其他复核单已由当前结论取代',
          reviewed_at: new Date(),
        },
      });

      let reviewedScore = currentAnswer.score;
      if (params.result === 'mastered') {
        reviewedScore = 100;
      } else if (params.result === 'not_mastered') {
        reviewedScore = 0;
      }
      if (reviewedScore !== currentAnswer.score) {
        await tx.answer.update({
          where: { id: currentAnswer.id },
          data: { score: reviewedScore },
        });
      }

      const totalScore = await tx.answer.aggregate({
        where: { user_id: review.user_id, is_delete: 0 },
        _sum: { score: true },
      });
      await tx.users.update({
        where: { id: review.user_id },
        data: { score: totalScore._sum.score || 0 },
      });

      {
        const progress = await tx.lessons_progress.findUnique({
          where: {
            user_id_lesson_id: {
              user_id: review.user_id,
              lesson_id: review.exercises.lesson_id,
            },
          },
          select: { mastery_level: true },
        });
        const candidateLevel = await calculateCandidateMastery(
          tx,
          review.exercises.lesson_id,
          review.user_id
        );
        const snapshot = review.exercise_snapshot as {
          grading?: { currentPassed?: boolean };
        } | null;
        const maintainedPassed = snapshot?.grading?.currentPassed
          ?? currentAnswer.score > 0;
        const nextLevel = resolveMasteryLevel({
          event: params.result === 'not_mastered'
            || (params.result === 'maintained' && !maintainedPassed)
            ? 'human_not_mastered'
            : 'human_mastered',
          currentLevel: progress?.mastery_level ?? 0,
          candidateLevel,
          reviewed: true,
        });
        await updateLessonMasteryInTransaction(
          tx,
          review.exercises.lesson_id,
          review.user_id,
          nextLevel
        );
      }

      return { status: 'reviewed' as const };
        }, { isolationLevel: 'Serializable' });
        if (outcome.status === 'stale') {
          throw new GradingReviewConflictError('提交版本已更新，复核单已过期', 'stale');
        }
        return params.reviewId;
      } catch (error) {
        if (!isSerializationConflict(error)) throw error;
        lastSerializationError = error;
      }
    }
    throw new GradingReviewConflictError(
      lastSerializationError ? '复核单正在被其他管理员处理' : '复核失败',
      'already_reviewed'
    );
  } catch (error) {
    throw error;
  }
}

export async function appealLatestSubmission(params: {
  exerciseId: string;
  userId: string;
  reason: string;
}) {
  const resolvedId = await resolveShortId('exercises', params.exerciseId);
  if (!resolvedId) throw new GradingReviewNotFoundError('题目不存在');

  return prisma.$transaction(async (tx) => {
    const [answer, exercise, codeSubmission] = await Promise.all([
      tx.answer.findUnique({
        where: {
          user_id_exercise_id: {
            user_id: params.userId,
            exercise_id: resolvedId,
          },
        },
      }),
      tx.exercises.findFirst({
        where: {
          id: resolvedId,
          is_delete: 0,
          review_status: 'approved',
          lessons: {
            is_delete: 0,
            chapters: { is_delete: 0, courses: { is_delete: 0 } },
          },
        },
        select: {
          id: true,
          lesson_id: true,
          type: true,
          content: true,
          answer: true,
          analysis: true,
          knowledge: true,
          difficulty: true,
          source: true,
          review_status: true,
          gen_metadata: true,
          metadata: true,
        },
      }),
      tx.code_submissions.findFirst({
        where: { user_id: params.userId, exercise_id: resolvedId, is_delete: 0 },
        orderBy: { submission_no: 'desc' },
        select: { id: true, final_score: true, status: true },
      }),
    ]);
    if (!answer || answer.version < 1 || !exercise) {
      throw new GradingReviewNotFoundError('当前题目没有可申诉的提交');
    }

    const review = await createGradingReviewInTransaction(tx, {
      userId: params.userId,
      exerciseId: resolvedId,
      submissionType: exercise.type,
      codeSubmissionId: exercise.type === 'code' ? codeSubmission?.id : undefined,
      submittedAnswer: answer.answer || '',
      answerVersion: answer.version,
      hintLevelUsed: answer.hint_level_used,
      exerciseSnapshot: {
        ...exercise,
        gen_metadata: sanitizeExerciseGenerationMetadata(
          exercise.gen_metadata as Prisma.JsonValue | null
        ),
        grading: {
          currentPassed: exercise.type === 'code'
            ? codeSubmission?.status === 'passed'
            : answer.score > 0,
        },
      } as unknown as Prisma.InputJsonValue,
      triggerReason: 'user_appeal',
      aiScore: codeSubmission?.final_score,
      ruleScore: answer.score,
      appealReason: params.reason,
    });
    return toReviewStatus(review);
  }, { isolationLevel: 'Serializable' });
}

export async function getLatestUserGradingReview(params: {
  exerciseId: string;
  userId: string;
}) {
  const resolvedId = await resolveShortId('exercises', params.exerciseId);
  if (!resolvedId) return null;
  const review = await prisma.ai_grading_reviews.findFirst({
    where: { exercise_id: resolvedId, user_id: params.userId },
    orderBy: { created_at: 'desc' },
  });
  if (!review) return null;
  return {
    ...toReviewStatus(review),
    appealReason: review.appeal_reason,
    reviewedResult: review.reviewed_result,
    reviewedAt: review.reviewed_at,
  };
}

export { toReviewStatus as formatSubmitGradingReview };
