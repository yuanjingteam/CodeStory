import prisma from '../../config/prisma';
import { resolveShortId, uuidToShortId } from '../../utils/idTransform';
import { updateLessonAndCourseProgress } from './learning-progress.service';

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
): Promise<{ correct: boolean; score: number; feedback: string; analysis: string } | null> {
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

  if (exercise.type === 'single_choice') {
    const metadata = exercise.metadata as any;
    const options = metadata?.options || [];
    const answerIndex = answer.trim().toUpperCase().charCodeAt(0) - 65;
    const selectedOption = options[answerIndex];
    correct = selectedOption === exercise.answer;
    
    if (correct) {
      const SCORE_DEDUCTION = [0, 10, 20, 30];
      score = Math.max(0, 100 - (SCORE_DEDUCTION[hintLevelUsed] || 0));
      feedback = hintLevelUsed > 0 
        ? `回答正确！使用了 ${hintLevelUsed} 次提示，得分: ${score} 分` 
        : '回答正确，知识点掌握良好';
    } else {
      score = 0;
      feedback = '回答错误，请重新思考';
    }
  } else if (exercise.type === 'code') {
    const normalizeCode = (code: string): string => {
      let result = code;
      result = result.replace(/--.*$/gm, '');
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
      result = result.replace(/'''[\s\S]*?'''/g, '');
      result = result.replace(/"""[\s\S]*?"""/g, '');
      result = result.replace(/#.*$/gm, '');
      result = result.replace(/\/\/.*$/gm, '');
      result = result.replace(/%.*$/gm, '');
      result = result.replace(/REM\s+.*$/gim, '');
      result = result.replace(/;.*$/gm, '');
      result = result.replace(/\s+/g, ' ');
      return result.trim();
    };
    const normalizedAnswer = normalizeCode(answer);
    const normalizedCorrect = normalizeCode(exercise.answer);
    correct = normalizedAnswer === normalizedCorrect;
    
    if (correct) {
      const SCORE_DEDUCTION = [0, 10, 20, 30];
      score = Math.max(0, 100 - (SCORE_DEDUCTION[hintLevelUsed] || 0));
      feedback = hintLevelUsed > 0 
        ? `所有测试用例通过！使用了 ${hintLevelUsed} 次提示，得分: ${score} 分`
        : '所有测试用例通过';
    } else {
      score = 0;
      feedback = '部分测试用例未通过';
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

  const isFirstSubmission = !existingAnswer;

  if (existingAnswer) {
    const newScore = correct ? score : existingAnswer.score;
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
  };
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
      _meta: hints._meta
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
