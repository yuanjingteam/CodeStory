import prisma from '../../config/prisma';

export const MASTERY_LEVEL_MIN = 0;
export const MASTERY_LEVEL_MAX = 100;

export interface MasteryAnswerSnapshot {
  score: number;
  hintLevelUsed: number;
}

export type MasteryEvent =
  | 'choice_correct'
  | 'choice_incorrect'
  | 'code_passed_confident'
  | 'code_failed'
  | 'review_pending'
  | 'human_mastered'
  | 'human_not_mastered'
  | 'guided_review_pending';

export type MasteryBand =
  | 'not_started'
  | 'beginner'
  | 'developing'
  | 'proficient'
  | 'mastered';

function clampMasteryLevel(value: number): number {
  if (!Number.isFinite(value)) return MASTERY_LEVEL_MIN;
  return Math.min(
    MASTERY_LEVEL_MAX,
    Math.max(MASTERY_LEVEL_MIN, Math.round(value))
  );
}

export function calculateAnswerMastery(
  answer: MasteryAnswerSnapshot
): number {
  if (
    !Number.isInteger(answer.hintLevelUsed)
    || answer.hintLevelUsed < 0
    || answer.hintLevelUsed > 3
  ) {
    return MASTERY_LEVEL_MIN;
  }

  // answer.score 在现有判分链中已经扣除了提示分，不能再次按 hintLevelUsed 扣分。
  return clampMasteryLevel(answer.score);
}

export function calculateLessonMasteryLevel(
  answers: MasteryAnswerSnapshot[],
  totalExerciseCount: number
): number {
  if (!Number.isInteger(totalExerciseCount) || totalExerciseCount <= 0) {
    return MASTERY_LEVEL_MIN;
  }

  const totalMastery = answers.reduce(
    (sum, answer) => sum + calculateAnswerMastery(answer),
    0
  );

  return clampMasteryLevel(totalMastery / totalExerciseCount);
}

export function getMasteryBand(level: number): MasteryBand {
  const normalizedLevel = clampMasteryLevel(level);
  if (normalizedLevel === 0) return 'not_started';
  if (normalizedLevel < 40) return 'beginner';
  if (normalizedLevel < 60) return 'developing';
  if (normalizedLevel < 80) return 'proficient';
  return 'mastered';
}

export function resolveMasteryLevel(params: {
  event: MasteryEvent;
  currentLevel: number;
  candidateLevel: number;
  reviewed?: boolean;
}): number {
  const currentLevel = clampMasteryLevel(params.currentLevel);
  const candidateLevel = clampMasteryLevel(params.candidateLevel);

  switch (params.event) {
    case 'choice_correct':
    case 'code_passed_confident':
      return Math.max(currentLevel, candidateLevel);
    case 'human_mastered':
      return params.reviewed
        ? Math.max(currentLevel, candidateLevel)
        : currentLevel;
    case 'human_not_mastered':
      return params.reviewed ? candidateLevel : currentLevel;
    case 'choice_incorrect':
    case 'code_failed':
    case 'review_pending':
    case 'guided_review_pending':
      return currentLevel;
  }
}

export async function updateLessonAndCourseProgress(
  lessonId: string,
  userId: string
): Promise<void> {
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

  const allExercisesCompleted =
    totalExercises > 0 && completedExercises >= totalExercises;
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

  const chapterIds = (
    await prisma.chapters.findMany({
      where: { course_id: courseId, is_delete: 0 },
      select: { id: true },
    })
  ).map((chapter) => chapter.id);

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

  const courseStatus =
    completedLessons === 0 ? 0 : completedLessons >= totalLessons ? 2 : 1;

  if (existingCourseProgress) {
    const newStatus = Math.max(existingCourseProgress.status, courseStatus);
    await prisma.courses_progress.update({
      where: { id: existingCourseProgress.id },
      data: {
        completed_lessons: completedLessons,
        total_lessons: totalLessons,
        status: newStatus,
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
        status: courseStatus,
        last_learned_at: now,
      },
    });
  }
}
