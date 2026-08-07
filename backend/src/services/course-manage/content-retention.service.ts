import { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import {
  deleteFromOSS,
  extractOSSKey,
} from '../../middleware/upload';

export const CONTENT_RETENTION_DAYS = Number(
  process.env.CONTENT_RETENTION_DAYS || 30
);
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const ADVISORY_LOCK_ID = 20_260_731;

function getCutoff(now: Date): Date {
  return new Date(
    now.getTime() -
      CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000
  );
}

async function deleteKnowledgeForLessons(
  tx: Prisma.TransactionClient,
  lessonIds: string[]
): Promise<void> {
  if (lessonIds.length === 0) return;
  await tx.$executeRaw(
    Prisma.sql`
      DELETE FROM "knowledge_chunks"
      WHERE "lesson_id" IN (${Prisma.join(lessonIds)})
    `
  );
  await tx.$executeRaw(
    Prisma.sql`
      DELETE FROM "knowledge_index_state"
      WHERE (
        "source_type" = 'lesson'
        AND "source_id" IN (${Prisma.join(lessonIds)})
      ) OR (
        "source_type" = 'exercise'
        AND "source_id" IN (
          SELECT "id" FROM "exercises"
          WHERE "lesson_id" IN (${Prisma.join(lessonIds)})
        )
      )
    `
  );
}

async function lessonHasLearningRecords(
  lessonId: string
): Promise<boolean> {
  const [progress, sessions, answers, submissions] =
    await Promise.all([
      prisma.lessons_progress.count({ where: { lesson_id: lessonId } }),
      prisma.ai_chat_sessions.count({ where: { lesson_id: lessonId } }),
      prisma.answer.count({
        where: { exercises: { lesson_id: lessonId } },
      }),
      prisma.code_submissions.count({
        where: { exercise: { lesson_id: lessonId } },
      }),
    ]);
  return progress + sessions + answers + submissions > 0;
}

async function purgeExpiredExercises(cutoff: Date): Promise<number> {
  const candidates = await prisma.exercises.findMany({
    where: { is_delete: 1, deleted_at: { lte: cutoff } },
    select: { id: true },
    take: 100,
  });
  let purged = 0;
  for (const exercise of candidates) {
    const [answers, submissions] = await Promise.all([
      prisma.answer.count({ where: { exercise_id: exercise.id } }),
      prisma.code_submissions.count({
        where: { exercise_id: exercise.id },
      }),
    ]);
    if (answers + submissions > 0) continue;
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`
          DELETE FROM "knowledge_chunks"
          WHERE "source_type" = 'exercise'
            AND "source_id" = ${exercise.id}
        `
      );
      await tx.$executeRaw(
        Prisma.sql`
          DELETE FROM "knowledge_index_state"
          WHERE "source_type" = 'exercise'
            AND "source_id" = ${exercise.id}
        `
      );
      await tx.exercises.delete({ where: { id: exercise.id } });
    });
    purged += 1;
  }
  return purged;
}

async function purgeExpiredLessons(cutoff: Date): Promise<number> {
  const candidates = await prisma.lessons.findMany({
    where: { is_delete: 1, deleted_at: { lte: cutoff } },
    select: { id: true },
    take: 100,
  });
  let purged = 0;
  for (const lesson of candidates) {
    if (await lessonHasLearningRecords(lesson.id)) continue;
    await prisma.$transaction(async (tx) => {
      await deleteKnowledgeForLessons(tx, [lesson.id]);
      await tx.lessons.delete({ where: { id: lesson.id } });
    });
    purged += 1;
  }
  return purged;
}

async function hierarchyHasLearningRecords(
  lessonIds: string[],
  courseId?: string
): Promise<boolean> {
  if (lessonIds.length === 0) {
    return courseId
      ? (await prisma.courses_progress.count({
          where: { course_id: courseId },
        })) > 0
      : false;
  }
  const [courseProgress, lessonProgress, sessions, answers, submissions] =
    await Promise.all([
      courseId
        ? prisma.courses_progress.count({
            where: { course_id: courseId },
          })
        : Promise.resolve(0),
      prisma.lessons_progress.count({
        where: { lesson_id: { in: lessonIds } },
      }),
      prisma.ai_chat_sessions.count({
        where: { lesson_id: { in: lessonIds } },
      }),
      prisma.answer.count({
        where: { exercises: { lesson_id: { in: lessonIds } } },
      }),
      prisma.code_submissions.count({
        where: { exercise: { lesson_id: { in: lessonIds } } },
      }),
    ]);
  return (
    courseProgress +
      lessonProgress +
      sessions +
      answers +
      submissions >
    0
  );
}

async function purgeExpiredChapters(cutoff: Date): Promise<number> {
  const candidates = await prisma.chapters.findMany({
    where: { is_delete: 1, deleted_at: { lte: cutoff } },
    select: {
      id: true,
      lessons: { select: { id: true } },
    },
    take: 100,
  });
  let purged = 0;
  for (const chapter of candidates) {
    const lessonIds = chapter.lessons.map((lesson) => lesson.id);
    if (await hierarchyHasLearningRecords(lessonIds)) continue;
    await prisma.$transaction(async (tx) => {
      await deleteKnowledgeForLessons(tx, lessonIds);
      await tx.chapters.delete({ where: { id: chapter.id } });
    });
    purged += 1;
  }
  return purged;
}

async function purgeExpiredCourses(cutoff: Date): Promise<number> {
  const candidates = await prisma.courses.findMany({
    where: { is_delete: 1, deleted_at: { lte: cutoff } },
    select: {
      id: true,
      cover_url: true,
      chapters: {
        select: { lessons: { select: { id: true } } },
      },
    },
    take: 100,
  });
  let purged = 0;
  for (const course of candidates) {
    const lessonIds = course.chapters.flatMap((chapter) =>
      chapter.lessons.map((lesson) => lesson.id)
    );
    if (await hierarchyHasLearningRecords(lessonIds, course.id)) {
      continue;
    }
    const ossKey = course.cover_url
      ? extractOSSKey(course.cover_url)
      : null;
    if (ossKey) await deleteFromOSS(ossKey);
    await prisma.$transaction(async (tx) => {
      await deleteKnowledgeForLessons(tx, lessonIds);
      await tx.courses.delete({ where: { id: course.id } });
    });
    purged += 1;
  }
  return purged;
}

export async function cleanupExpiredContent(
  now = new Date()
): Promise<{
  exercises: number;
  lessons: number;
  chapters: number;
  courses: number;
}> {
  const locks = await prisma.$queryRaw<Array<{ locked: boolean }>>(
    Prisma.sql`
      SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS "locked"
    `
  );
  if (!locks[0]?.locked) {
    return { exercises: 0, lessons: 0, chapters: 0, courses: 0 };
  }
  try {
    const cutoff = getCutoff(now);
    return {
      exercises: await purgeExpiredExercises(cutoff),
      lessons: await purgeExpiredLessons(cutoff),
      chapters: await purgeExpiredChapters(cutoff),
      courses: await purgeExpiredCourses(cutoff),
    };
  } finally {
    await prisma.$queryRaw(
      Prisma.sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`
    );
  }
}

async function runScheduledCleanup(): Promise<void> {
  if (process.env.CONTENT_PURGE_ENABLED !== 'true') return;
  try {
    const result = await cleanupExpiredContent();
    const total = Object.values(result).reduce(
      (sum, count) => sum + count,
      0
    );
    if (total > 0) {
      console.info('过期内容清理完成:', result);
    }
  } catch (error) {
    console.error('清理过期课程内容失败:', error);
  }
}

export function startContentCleanupScheduler(): NodeJS.Timeout {
  void runScheduledCleanup();
  const timer = setInterval(() => {
    void runScheduledCleanup();
  }, CLEANUP_INTERVAL_MS);
  timer.unref();
  return timer;
}
