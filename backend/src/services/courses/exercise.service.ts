import prisma from '../../config/prisma';
import { resolveShortId, uuidToShortId } from '../../utils/idTransform';

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
      const hints = exercise.hints as any;
      const scoreDeduction = hints?._meta?.score_deduction || [0, 10, 25, 45];
      score = Math.max(0, 100 - (scoreDeduction[hintLevelUsed] || 0));
      feedback = hintLevelUsed > 0 
        ? `回答正确！使用了 ${hintLevelUsed} 次提示，得分: ${score} 分` 
        : '回答正确，知识点掌握良好';
    } else {
      score = 0;
      feedback = '回答错误，请重新思考';
    }
  } else if (exercise.type === 'code') {
    correct = answer.trim() === exercise.answer.trim();
    
    if (correct) {
      const hints = exercise.hints as any;
      const scoreDeduction = hints?._meta?.score_deduction || [0, 10, 25, 45];
      score = Math.max(0, 100 - (scoreDeduction[hintLevelUsed] || 0));
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

async function updateLessonAndCourseProgress(lessonId: string, userId: string): Promise<void> {
  const now = new Date();

  const lesson = await prisma.lessons.findUnique({
    where: { id: lessonId, is_delete: 0 },
    include: { chapters: { include: { courses: true } } },
  });

  if (!lesson) return;

  const courseId = lesson.chapters.courses.id;

  const totalExercises = await prisma.exercises.count({
    where: { lesson_id: lessonId, is_delete: 0 },
  });

  const completedExercises = await prisma.answer.count({
    where: {
      user_id: userId,
      is_delete: 0,
      submission_count: { gte: 1 },
      exercises: {
        lesson_id: lessonId,
        is_delete: 0,
      },
    },
  });

  const allExercisesCompleted = totalExercises > 0 && completedExercises >= totalExercises;
  const newLessonStatus = allExercisesCompleted ? 2 : 1;

  const existingLessonProgress = await prisma.lessons_progress.findUnique({
    where: {
      user_id_lesson_id: {
        user_id: userId,
        lesson_id: lessonId,
      },
    },
  });

  if (existingLessonProgress) {
    const shouldUpdateStatus = newLessonStatus > existingLessonProgress.status;
    await prisma.lessons_progress.update({
      where: { id: existingLessonProgress.id },
      data: {
        status: shouldUpdateStatus ? newLessonStatus : existingLessonProgress.status,
        last_learned_at: now,
      },
    });
  } else {
    await prisma.lessons_progress.create({
      data: {
        user_id: userId,
        lesson_id: lessonId,
        status: newLessonStatus,
        mastery_level: 0,
        last_learned_at: now,
      },
    });
  }

  const chapterIds = (await prisma.chapters.findMany({
    where: { course_id: courseId, is_delete: 0 },
    select: { id: true },
  })).map(ch => ch.id);

  const totalLessons = await prisma.lessons.count({
    where: {
      chapter_id: { in: chapterIds },
      is_delete: 0,
    },
  });

  const completedLessons = await prisma.lessons_progress.count({
    where: {
      user_id: userId,
      status: 2,
      is_delete: 0,
      lessons: {
        chapter_id: { in: chapterIds },
      },
    },
  });

  const existingCourseProgress = await prisma.courses_progress.findUnique({
    where: {
      user_id_course_id: {
        user_id: userId,
        course_id: courseId,
      },
    },
  });

  if (existingCourseProgress) {
    await prisma.courses_progress.update({
      where: { id: existingCourseProgress.id },
      data: {
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        status: 1,
        last_learned_at: now,
      },
    });
  } else {
    await prisma.courses_progress.create({
      data: {
        user_id: userId,
        course_id: courseId,
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        status: 1,
        last_learned_at: now,
      },
    });
  }
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

export async function getExerciseHint(
  exerciseId: string,
  hintLevel: number,
  userId: string
): Promise<{ content: string; level: number; maxLevel: number } | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
  });

  if (!exercise || !exercise.hints) return null;

  const hints = exercise.hints as any;
  const maxLevel = hints._meta?.max_level || 0;

  if (hintLevel < 1 || hintLevel > maxLevel) {
    return null;
  }

  const hintKey = `level_${hintLevel}` as const;
  const hintContent = hints[hintKey];

  if (!hintContent) {
    return null;
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
        hint_level_used: Math.max(existingAnswer.hint_level_used, hintLevel),
      },
    });
  } else {
    await prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: resolvedId,
        answer: '',
        submission_count: 0,
        feedback: '',
        score: 0,
        hint_level_used: hintLevel,
      },
    });
  }

  return {
    content: hintContent,
    level: hintLevel,
    maxLevel: maxLevel,
  };
}

export async function getAcquiredHints(
  exerciseId: string,
  userId: string
): Promise<{ hints: Array<{ level: number; content: string }>; currentLevel: number; maxLevel: number } | null> {
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return null;

  const exercise = await prisma.exercises.findUnique({
    where: { id: resolvedId, is_delete: 0 },
  });

  if (!exercise || !exercise.hints) return null;

  const userAnswer = await prisma.answer.findUnique({
    where: {
      user_id_exercise_id: {
        user_id: userId,
        exercise_id: resolvedId,
      },
      is_delete: 0,
    },
  });

  const currentLevel = userAnswer?.hint_level_used || 0;
  const hints = exercise.hints as any;
  const maxLevel = hints._meta?.max_level || 0;

  const acquiredHints = [];
  
  for (let i = 1; i <= currentLevel && i <= maxLevel; i++) {
    const hintKey = `level_${i}` as const;
    const hintContent = hints[hintKey];
    
    if (hintContent) {
      acquiredHints.push({
        level: i,
        content: hintContent,
      });
    }
  }

  return {
    hints: acquiredHints,
    currentLevel,
    maxLevel,
  };
}
