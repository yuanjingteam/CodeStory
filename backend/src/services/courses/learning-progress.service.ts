import prisma from '../../config/prisma';
import type { Prisma } from '../../generated/prisma';

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

export async function updateLessonMasteryInTransaction(
  tx: Prisma.TransactionClient,
  lessonId: string,
  userId: string,
  masteryLevel: number
): Promise<void> {
  const existing = await tx.lessons_progress.findUnique({
    where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    select: { status: true },
  });
  await tx.lessons_progress.upsert({
    where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    create: {
      user_id: userId,
      lesson_id: lessonId,
      status: 1,
      mastery_level: clampMasteryLevel(masteryLevel),
      last_learned_at: new Date(),
      is_delete: 0,
    },
    update: {
      status: Math.max(existing?.status ?? 0, 1),
      mastery_level: clampMasteryLevel(masteryLevel),
      last_learned_at: new Date(),
      is_delete: 0,
    },
  });
}

export async function applySubmissionMasteryInTransaction(
  tx: Prisma.TransactionClient,
  params: {
    lessonId: string;
    userId: string;
    event: Extract<MasteryEvent,
      | 'choice_correct'
      | 'choice_incorrect'
      | 'code_passed_confident'
      | 'code_failed'
      | 'review_pending'>;
  }
): Promise<number> {
  const [totalExercises, answers, progress] = await Promise.all([
    tx.exercises.count({
      where: { lesson_id: params.lessonId, is_delete: 0 },
    }),
    tx.answer.findMany({
      where: {
        user_id: params.userId,
        is_delete: 0,
        exercises: { lesson_id: params.lessonId, is_delete: 0 },
      },
      select: { score: true, hint_level_used: true },
    }),
    tx.lessons_progress.findUnique({
      where: {
        user_id_lesson_id: {
          user_id: params.userId,
          lesson_id: params.lessonId,
        },
      },
      select: { mastery_level: true },
    }),
  ]);
  const candidateLevel = calculateLessonMasteryLevel(
    answers.map((answer) => ({
      score: answer.score,
      hintLevelUsed: answer.hint_level_used,
    })),
    totalExercises
  );
  const nextLevel = resolveMasteryLevel({
    event: params.event,
    currentLevel: progress?.mastery_level ?? 0,
    candidateLevel,
  });
  await updateLessonMasteryInTransaction(
    tx,
    params.lessonId,
    params.userId,
    nextLevel
  );
  return nextLevel;
}

export function calculateCourseProgressStatus(
  startedLessons: number,
  completedLessons: number,
  totalLessons: number
): 0 | 1 | 2 {
  if (totalLessons > 0 && completedLessons >= totalLessons) return 2;
  if (startedLessons > 0) return 1;
  return 0;
}

async function syncCourseProgress(
  tx: Prisma.TransactionClient,
  courseId: string,
  userId: string,
  now: Date
): Promise<void> {
  const chapterIds = (
    await tx.chapters.findMany({
      where: { course_id: courseId, is_delete: 0 },
      select: { id: true },
    })
  ).map((chapter) => chapter.id);

  const [totalLessons, startedLessons, completedLessons] = await Promise.all([
    tx.lessons.count({
      where: {
        chapter_id: { in: chapterIds },
        is_delete: 0,
      },
    }),
    tx.lessons_progress.count({
      where: {
        user_id: userId,
        status: { in: [1, 2] },
        is_delete: 0,
        lessons: {
          chapter_id: { in: chapterIds },
          is_delete: 0,
        },
      },
    }),
    tx.lessons_progress.count({
      where: {
        user_id: userId,
        status: 2,
        is_delete: 0,
        lessons: {
          chapter_id: { in: chapterIds },
          is_delete: 0,
        },
      },
    }),
  ]);

  const status = calculateCourseProgressStatus(
    startedLessons,
    completedLessons,
    totalLessons
  );

  await tx.courses_progress.upsert({
    where: {
      user_id_course_id: {
        user_id: userId,
        course_id: courseId,
      },
    },
    create: {
      user_id: userId,
      course_id: courseId,
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      status,
      last_learned_at: now,
      is_delete: 0,
    },
    update: {
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      status,
      last_learned_at: now,
      is_delete: 0,
    },
  });
}

export async function markLessonStarted(
  lessonId: string,
  userId: string
): Promise<boolean> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lessons.findUnique({
      where: { id: lessonId, is_delete: 0 },
      include: { chapters: { select: { course_id: true } } },
    });

    if (!lesson) return false;

    const existingProgress = await tx.lessons_progress.findUnique({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      select: { status: true },
    });

    await tx.lessons_progress.upsert({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      create: {
        user_id: userId,
        lesson_id: lessonId,
        status: 1,
        mastery_level: 0,
        last_learned_at: now,
        is_delete: 0,
      },
      update: {
        status: Math.max(existingProgress?.status ?? 0, 1),
        last_learned_at: now,
        is_delete: 0,
      },
    });

    await syncCourseProgress(tx, lesson.chapters.course_id, userId, now);
    return true;
  });
}

export async function updateLessonAndCourseProgress(
  lessonId: string,
  userId: string
): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const lesson = await tx.lessons.findUnique({
      where: { id: lessonId, is_delete: 0 },
      include: { chapters: { select: { course_id: true } } },
    });

    if (!lesson) return;

    const [totalExercises, completedExercises, existingProgress] =
      await Promise.all([
        tx.exercises.count({
          where: { lesson_id: lessonId, is_delete: 0 },
        }),
        tx.answer.count({
          where: {
            user_id: userId,
            is_delete: 0,
            submission_count: { gte: 1 },
            exercises: {
              lesson_id: lessonId,
              is_delete: 0,
            },
          },
        }),
        tx.lessons_progress.findUnique({
          where: {
            user_id_lesson_id: {
              user_id: userId,
              lesson_id: lessonId,
            },
          },
          select: { status: true },
        }),
      ]);

    const allExercisesCompleted =
      totalExercises > 0 && completedExercises >= totalExercises;
    const candidateStatus = allExercisesCompleted ? 2 : 1;

    await tx.lessons_progress.upsert({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      create: {
        user_id: userId,
        lesson_id: lessonId,
        status: candidateStatus,
        mastery_level: 0,
        last_learned_at: now,
        is_delete: 0,
      },
      update: {
        status: Math.max(existingProgress?.status ?? 0, candidateStatus),
        last_learned_at: now,
        is_delete: 0,
      },
    });

    await syncCourseProgress(tx, lesson.chapters.course_id, userId, now);
  });
}
