import prisma from '../../config/prisma';
import type { Prisma } from '../../generated/prisma';
import { resolveShortId, uuidToShortId } from '../../utils/idTransform';
import { generateChoiceExplanation } from '../ai/choice-explanation.service';
import { reviewCodeWithAI } from '../ai/evaluate/code-grading-chain';
import {
  createAiChatErrorPayload,
  logAiError,
} from '../ai/ai-chat-error.service';
import {
  applyAiCodeReviewToSubmission,
  calculateAiReviewedFinalScore,
  type CodeGradeResult,
  gradeCodeExercise,
  markCodeReviewFailed,
  recordCodeSubmission,
} from './code-grading.service';
import {
  applySubmissionMasteryInTransaction,
  updateLessonAndCourseProgress,
} from './learning-progress.service';
import {
  getAppliedLearningEffect,
  getAppliedLearningEffectInTransaction,
  markLearningEffectApplied,
  type LearningRunEffectContext,
} from '../ai/learning-graph/effects';

const SCORE_DEDUCTION = [0, 10, 20, 30];
const SERIALIZABLE_RETRY_LIMIT = 3;

function isRetryableTransactionError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'P2034' || code === 'P2002';
}

async function runSerializableWithRetry<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      lastError = error;
      if (!isRetryableTransactionError(error) || attempt === SERIALIZABLE_RETRY_LIMIT - 1) {
        throw error;
      }
    }
  }
  throw lastError;
}

interface ScoreBreakdown {
  functionalScore: number;
  qualityScore: number;
  hintDeduction: number;
  finalScore: number;
}

interface SubmitAiReview {
  isLikelyCorrect: boolean;
  feedback: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  needsManualReview: boolean;
  confidence?: number;
  status: 'completed' | 'failed';
}

export interface SubmitExerciseResult {
  correct: boolean;
  score: number;
  feedback: string;
  analysis: string;
  scoreBreakdown?: ScoreBreakdown;
  aiReview?: SubmitAiReview;
}

export interface ExerciseDetail {
  id: string;
  lesson_id: string;
  type: string;
  knowledge: string | null;
  content: string;
  answer: string;
  analysis: string | null;
  difficulty: number;
  metadata: any;
  hints: any;
}

export interface UserAnswer {
  answer: string | null;
  submission_count: number;
  feedback: string | null;
  hint_level_used: number;
  score: number;
}

function stripOptionLabel(option: string): string {
  return option.replace(/^[A-Z]\.\s*/, '').trim();
}

function normalizeOptionLabel(answer: string): string {
  return answer.trim().toUpperCase().charAt(0);
}

export async function getExerciseDetail(
  exerciseId: string,
  userId: string
): Promise<{ exercise: ExerciseDetail; userAnswer: UserAnswer | null } | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findFirst({
    where: {
      id: resolvedId,
      is_delete: 0,
      review_status: 'approved',
      lessons: {
        is_delete: 0,
        chapters: { is_delete: 0, courses: { is_delete: 0 } },
      },
    },
    include: {
      lessons: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!exercise) return null;

  const userAnswer = await prisma.answer.findUnique({
    where: {
      user_id_exercise_id: {
        user_id: userId,
        exercise_id: resolvedId,
      },
      is_delete: 0,
    },
  });

  return {
    exercise: exercise as ExerciseDetail,
    userAnswer: userAnswer || null,
  };
}

export async function submitExercise(
  exerciseId: string,
  answer: string,
  userId: string,
  effect?: LearningRunEffectContext
): Promise<SubmitExerciseResult | null> {
  if (effect) {
    const applied =
      await getAppliedLearningEffect<SubmitExerciseResult>(
        effect.effectKey
      );
    if (applied) return applied;
  }
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findFirst({
    where: {
      id: resolvedId,
      is_delete: 0,
      review_status: 'approved',
      lessons: {
        is_delete: 0,
        chapters: { is_delete: 0, courses: { is_delete: 0 } },
      },
    },
    include: {
      lessons: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!exercise) return null;

  const existingAnswer = await prisma.answer.findUnique({
    where: {
      user_id_exercise_id: {
        user_id: userId,
        exercise_id: resolvedId,
      },
      is_delete: 0,
    },
  });
  const hintLevelUsed = Math.min(
    3,
    Math.max(0, existingAnswer?.hint_level_used || 0)
  );

  let correct = false;
  let score = 0;
  let feedback = '';
  let scoreBreakdown: ScoreBreakdown | undefined;
  let aiReviewResult: SubmitAiReview | undefined;
  let codeGrade: CodeGradeResult | undefined;
  let completedAiReview: Awaited<ReturnType<typeof reviewCodeWithAI>> | undefined;
  let aiReviewFailure: ReturnType<typeof createAiChatErrorPayload> | undefined;

  if (exercise.type === 'single_choice') {
    const metadata = exercise.metadata as any;
    const options = metadata?.options || [];
    const answerIndex = answer.trim().toUpperCase().charCodeAt(0) - 65;
    const selectedOption = options[answerIndex];
    correct = selectedOption === exercise.answer;

    if (correct) {
      score = Math.max(0, 100 - (SCORE_DEDUCTION[hintLevelUsed] || 0));
      feedback = hintLevelUsed > 0
        ? `回答正确。使用了 ${hintLevelUsed} 级提示，得分：${score} 分`
        : '回答正确，知识点掌握良好';
    } else {
      feedback = '回答错误，请重新思考';
    }
  } else if (exercise.type === 'code') {
    const grade = gradeCodeExercise({
      userCode: answer,
      correctAnswer: exercise.answer,
      metadata: exercise.metadata,
      hintLevelUsed,
    });

    correct = grade.correct;
    score = grade.score;
    feedback = grade.feedback;
    scoreBreakdown = {
      functionalScore: grade.functionalScore,
      qualityScore: 0,
      hintDeduction: grade.hintDeduction,
      finalScore: grade.score,
    };

    codeGrade = grade;

    try {
      const aiReview = await reviewCodeWithAI({
        exerciseContent: exercise.content,
        knowledge: exercise.knowledge,
        correctAnswer: exercise.answer,
        analysis: exercise.analysis,
        userCode: answer,
        language: grade.language,
        hintLevelUsed,
        staticGrade: grade,
      });

      completedAiReview = aiReview;

      correct = aiReview.review.isLikelyCorrect;
      score = calculateAiReviewedFinalScore(aiReview, grade.hintDeduction);
      feedback = aiReview.review.feedback;
      scoreBreakdown = {
        functionalScore: aiReview.review.functionalScore,
        qualityScore: aiReview.review.qualityScore,
        hintDeduction: grade.hintDeduction,
        finalScore: score,
      };
      aiReviewResult = {
        isLikelyCorrect: aiReview.review.isLikelyCorrect,
        feedback: aiReview.review.feedback,
        strengths: aiReview.review.strengths,
        issues: aiReview.review.issues,
        suggestions: aiReview.review.suggestions,
        needsManualReview: aiReview.review.needsManualReview,
        confidence: aiReview.review.confidence,
        status: 'completed',
      };
    } catch (error) {
      const aiError = createAiChatErrorPayload(error);
      aiReviewFailure = aiError;
      logAiError('code-review', error, aiError);
      const aiFailureMessage = aiError.message.replace(/[。！？!?]+$/, '');
      feedback = `${grade.feedback}。${aiFailureMessage}，已保留静态初判结果。`;
      aiReviewResult = {
        isLikelyCorrect: grade.correct,
        feedback,
        strengths: [],
        issues: [],
        suggestions: [],
        needsManualReview: true,
        status: 'failed',
      };
    }
  }

  const persisted = await runSerializableWithRetry(async (tx) => {
    if (effect) {
      const applied =
        await getAppliedLearningEffectInTransaction<SubmitExerciseResult>(
          tx,
          effect.effectKey
        );
      if (applied) {
        return {
          replayedResult: applied,
          result: applied,
        };
      }
    }
    const currentAnswer = await tx.answer.findUnique({
      where: {
        user_id_exercise_id: {
          user_id: userId,
          exercise_id: resolvedId,
        },
      },
    });
    const effectiveHintLevelUsed = Math.min(
      3,
      Math.max(hintLevelUsed, currentAnswer?.hint_level_used || 0)
    );

    if (exercise.type === 'single_choice' && correct) {
      score = Math.max(
        0,
        100 - (SCORE_DEDUCTION[effectiveHintLevelUsed] || 0)
      );
      feedback = effectiveHintLevelUsed > 0
        ? `回答正确。使用了 ${effectiveHintLevelUsed} 级提示，得分：${score} 分`
        : '回答正确，知识点掌握良好';
    } else if (exercise.type === 'code' && codeGrade) {
      codeGrade = gradeCodeExercise({
        userCode: answer,
        correctAnswer: exercise.answer,
        metadata: exercise.metadata,
        hintLevelUsed: effectiveHintLevelUsed,
      });
      if (completedAiReview) {
        score = calculateAiReviewedFinalScore(
          completedAiReview,
          codeGrade.hintDeduction
        );
        scoreBreakdown = {
          functionalScore: completedAiReview.review.functionalScore,
          qualityScore: completedAiReview.review.qualityScore,
          hintDeduction: codeGrade.hintDeduction,
          finalScore: score,
        };
      } else if (aiReviewFailure) {
        score = codeGrade.score;
        const aiFailureMessage = aiReviewFailure.message.replace(/[。！？!?]+$/, '');
        feedback = `${codeGrade.feedback}。${aiFailureMessage}，已保留静态初判结果。`;
        if (aiReviewResult) aiReviewResult.feedback = feedback;
        scoreBreakdown = {
          functionalScore: codeGrade.functionalScore,
          qualityScore: 0,
          hintDeduction: codeGrade.hintDeduction,
          finalScore: score,
        };
      }
    }

    let codeSubmissionId: string | undefined;
    if (exercise.type === 'code' && codeGrade) {
      const submission = await recordCodeSubmission({
        tx,
        userId,
        exerciseId: resolvedId,
        code: answer,
        grade: codeGrade,
      });
      codeSubmissionId = submission.id;
      if (completedAiReview) {
        await applyAiCodeReviewToSubmission({
          tx,
          submissionId: submission.id,
          review: completedAiReview,
          hintDeduction: codeGrade.hintDeduction,
        });
      } else if (aiReviewFailure) {
        await markCodeReviewFailed({
          tx,
          submissionId: submission.id,
          error: aiReviewFailure,
        });
      }
    }
    const savedAnswer = await tx.answer.upsert({
      where: {
        user_id_exercise_id: {
          user_id: userId,
          exercise_id: resolvedId,
        },
      },
      create: {
        user_id: userId,
        exercise_id: resolvedId,
        answer,
        submission_count: 1,
        feedback,
        score,
        hint_level_used: effectiveHintLevelUsed,
        version: 1,
        is_delete: 0,
      },
      update: {
        answer,
        submission_count: { increment: 1 },
        feedback,
        score: Math.max(currentAnswer?.score ?? 0, score),
        hint_level_used: effectiveHintLevelUsed,
        version: { increment: 1 },
        is_delete: 0,
      },
    });

    const totalScore = await tx.answer.aggregate({
      where: { user_id: userId, is_delete: 0 },
      _sum: { score: true },
    });
    await tx.users.update({
      where: { id: userId },
      data: { score: totalScore._sum.score || 0 },
    });

    const masteryEvent = exercise.type === 'single_choice'
      ? (correct ? 'choice_correct' : 'choice_incorrect')
      : correct
        ? 'code_passed_confident'
        : 'code_failed';
    await applySubmissionMasteryInTransaction(tx, {
      lessonId: exercise.lesson_id,
      userId,
      event: masteryEvent,
    });
    const result: SubmitExerciseResult = {
      correct,
      score,
      feedback,
      analysis: exercise.analysis || '',
      scoreBreakdown,
      aiReview: aiReviewResult,
    };
    if (effect) {
      await markLearningEffectApplied(
        tx,
        effect,
        JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue
      );
    }
    return { replayedResult: null, result };
  });

  if (persisted.replayedResult) {
    return persisted.replayedResult;
  }
  await updateLessonAndCourseProgress(exercise.lesson_id, userId);
  return persisted.result;
}

export async function explainChoiceExercise(
  exerciseId: string,
  selectedAnswer: string,
  userId: string
) {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findFirst({
    where: {
      id: resolvedId,
      is_delete: 0,
      review_status: 'approved',
      lessons: {
        is_delete: 0,
        chapters: { is_delete: 0, courses: { is_delete: 0 } },
      },
    },
  });

  if (!exercise || exercise.type !== 'single_choice') return null;

  const metadata = exercise.metadata as any;
  const options = Array.isArray(metadata?.options) ? metadata.options : [];
  if (options.length === 0) return null;

  const savedAnswer = await prisma.answer.findUnique({
    where: {
      user_id_exercise_id: {
        user_id: userId,
        exercise_id: resolvedId,
      },
      is_delete: 0,
    },
  });

  const selectedLabel = normalizeOptionLabel(selectedAnswer || savedAnswer?.answer || '');
  const correctIndex = options.findIndex((option: string) => option === exercise.answer);
  const selectedIndex = selectedLabel.charCodeAt(0) - 65;

  if (correctIndex < 0 || selectedIndex < 0 || selectedIndex >= options.length) {
    return null;
  }

  const correctLabel = String.fromCharCode(65 + correctIndex);
  const explanation = await generateChoiceExplanation({
    exerciseContent: exercise.content,
    knowledge: exercise.knowledge,
    analysis: exercise.analysis,
    correctOption: correctLabel,
    selectedOption: selectedLabel,
    options: options.map((option: string, index: number) => ({
      label: String.fromCharCode(65 + index),
      content: stripOptionLabel(option),
      isCorrect: index === correctIndex,
      isSelected: index === selectedIndex,
    })),
  });

  return explanation;
}

export function formatExerciseResponse(exercise: ExerciseDetail, userAnswer: UserAnswer | null) {
  const hints = exercise.hints as any;
  return {
    id: uuidToShortId(exercise.id),
    lesson_id: uuidToShortId(exercise.lesson_id),
    type: exercise.type,
    knowledge: exercise.knowledge || '',
    content: exercise.content,
    analysis: exercise.analysis || '',
    difficulty: exercise.difficulty,
    metadata: exercise.metadata,
    hints: hints ? {
      _meta: hints._meta,
    } : null,
    userAnswer: userAnswer ? {
      answer: userAnswer.answer || '',
      submission_count: userAnswer.submission_count,
      feedback: userAnswer.feedback || '',
      hint_level_used: userAnswer.hint_level_used,
      score: userAnswer.score,
    } : null,
  };
}
