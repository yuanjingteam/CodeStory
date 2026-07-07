import prisma from '../../config/prisma';
import { resolveShortId, uuidToShortId } from '../../utils/idTransform';
import { generateChoiceExplanation } from '../ai/choice-explanation.service';
import { reviewCodeWithAI } from '../ai/code-review.service';
import {
  applyAiCodeReviewToSubmission,
  calculateAiReviewedFinalScore,
  gradeCodeExercise,
  markCodeReviewFailed,
  recordCodeSubmission,
} from './code-grading.service';
import { updateLessonAndCourseProgress } from './learning-progress.service';

const SCORE_DEDUCTION = [0, 10, 20, 30];

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
  status: 'completed' | 'failed';
}

interface SubmitExerciseResult {
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

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
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
  hintLevelUsed: number = 0
): Promise<SubmitExerciseResult | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
    include: {
      lessons: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!exercise) return null;

  let correct = false;
  let score = 0;
  let feedback = '';
  let scoreBreakdown: ScoreBreakdown | undefined;
  let aiReviewResult: SubmitAiReview | undefined;

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

    const submission = await recordCodeSubmission({
      userId,
      exerciseId: resolvedId,
      code: answer,
      grade,
    });

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

      await applyAiCodeReviewToSubmission({
        submissionId: submission.id,
        review: aiReview,
        hintDeduction: grade.hintDeduction,
      });

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
        status: 'completed',
      };
    } catch (error) {
      await markCodeReviewFailed({
        submissionId: submission.id,
        error,
      });
      feedback = `${grade.feedback}。AI 评阅暂不可用，已保留静态初判结果。`;
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

  const existingAnswer = await prisma.answer.findUnique({
    where: {
      user_id_exercise_id: {
        user_id: userId,
        exercise_id: resolvedId,
      },
      is_delete: 0,
    },
  });

  if (existingAnswer) {
    const newScore = exercise.type === 'code'
      ? Math.max(existingAnswer.score, score)
      : correct
        ? score
        : existingAnswer.score;
    await prisma.answer.update({
      where: { id: existingAnswer.id },
      data: {
        answer,
        submission_count: existingAnswer.submission_count + 1,
        feedback,
        score: newScore,
        hint_level_used: Math.max(existingAnswer.hint_level_used, hintLevelUsed),
      },
    });
  } else {
    await prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: resolvedId,
        answer,
        submission_count: 1,
        feedback,
        score,
        hint_level_used: hintLevelUsed,
      },
    });
  }

  const totalScore = await prisma.answer.aggregate({
    where: { user_id: userId, is_delete: 0 },
    _sum: { score: true },
  });
  await prisma.users.update({
    where: { id: userId },
    data: { score: totalScore._sum.score || 0 },
  });

  await updateLessonAndCourseProgress(exercise.lesson_id, userId);

  return {
    correct,
    score,
    feedback,
    analysis: exercise.analysis || '',
    scoreBreakdown,
    aiReview: aiReviewResult,
  };
}

export async function explainChoiceExercise(
  exerciseId: string,
  selectedAnswer: string,
  userId: string
) {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
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
