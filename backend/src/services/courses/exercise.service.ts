import prisma from '../../config/prisma';
import { resolveShortId, uuidToShortId } from '../../utils/short-id';

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
}

export interface UserAnswer {
  answer: string | null;
  submission_count: number;
  feedback: string | null;
  hint_level_used: number;
  score: number;
}

export async function getExerciseDetail(
  exerciseId: string,
  userId: string
): Promise<{ exercise: ExerciseDetail; userAnswer: UserAnswer | null } | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
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
  userId: string
): Promise<{ correct: boolean; score: number; feedback: string; analysis: string } | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
  });

  if (!exercise) return null;

  let correct = false;
  let score = 0;
  let feedback = '';

  if (exercise.type === 'single_choice') {
    const metadata = exercise.metadata as any;
    const options = metadata?.options || [];
    const answerIndex = answer.trim().toUpperCase().charCodeAt(0) - 65;
    const selectedOption = options[answerIndex];
    correct = selectedOption === exercise.answer;
    score = correct ? 100 : 0;
    feedback = correct ? '回答正确，知识点掌握良好' : '回答错误，请重新思考';
  } else if (exercise.type === 'code') {
    correct = answer.trim() === exercise.answer.trim();
    score = correct ? 100 : 0;
    feedback = correct ? '所有测试用例通过' : '部分测试用例未通过';
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
    await prisma.answer.update({
      where: { id: existingAnswer.id },
      data: {
        answer,
        submission_count: existingAnswer.submission_count + 1,
        feedback,
        score,
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
        hint_level_used: 0,
      },
    });
  }

  return {
    correct,
    score,
    feedback,
    analysis: exercise.analysis || '',
  };
}

export function formatExerciseResponse(exercise: ExerciseDetail, userAnswer: UserAnswer | null) {
  return {
    id: uuidToShortId(exercise.id),
    lesson_id: uuidToShortId(exercise.lesson_id),
    type: exercise.type,
    knowledge: exercise.knowledge || '',
    content: exercise.content,
    analysis: exercise.analysis || '',
    difficulty: exercise.difficulty,
    metadata: exercise.metadata,
    userAnswer: userAnswer ? {
      answer: userAnswer.answer || '',
      submission_count: userAnswer.submission_count,
      feedback: userAnswer.feedback || '',
      hint_level_used: userAnswer.hint_level_used,
      score: userAnswer.score,
    } : null,
  };
}
