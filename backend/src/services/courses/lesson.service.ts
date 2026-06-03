import prisma from '../../config/prisma';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';
import type {
  LessonDetailData,
  CatalogChapter,
  CatalogLesson,
  LessonExercise,
} from '../../types/lesson';

export async function getLessonDetail(lessonId: string, userId: string): Promise<LessonDetailData | null> {
  const resolvedLessonId = await resolveShortId('lessons', lessonId);
  if (!resolvedLessonId) return null;

  const lesson = await prisma.lessons.findUnique({
    where: { id: resolvedLessonId, is_delete: 0 },
    include: {
      chapters: {
        include: {
          courses: true,
        },
      },
    },
  });

  if (!lesson) return null;

  const chapter = lesson.chapters;
  const course = chapter.courses;

  const courseProgress = await prisma.courses_progress.findUnique({
    where: {
      user_id_course_id: {
        user_id: userId,
        course_id: course.id,
      },
      is_delete: 0,
    },
  });

  let progressPercent = 0;
  if (courseProgress && courseProgress.total_lessons > 0) {
    progressPercent = Math.round(
      (courseProgress.completed_lessons / courseProgress.total_lessons) * 100
    );
  }

  const allChapters = await prisma.chapters.findMany({
    where: { course_id: course.id, is_delete: 0 },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        where: { is_delete: 0 },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const allLessonIds = allChapters.flatMap(ch => ch.lessons.map(l => l.id));
  const lessonProgressRecords = await prisma.lessons_progress.findMany({
    where: {
      user_id: userId,
      lesson_id: { in: allLessonIds },
      is_delete: 0,
    },
  });

  const lessonProgressMap = new Map(
    lessonProgressRecords.map(record => [record.lesson_id, record.status])
  );

  const catalog: CatalogChapter[] = allChapters.map(ch => ({
    id: uuidToShortId(ch.id),
    title: ch.title,
    lessons: ch.lessons.map(l => {
      const status = lessonProgressMap.get(l.id) ?? 0;
      return {
        id: uuidToShortId(l.id),
        title: l.title,
        status: status as 0 | 1 | 2,
      } as CatalogLesson;
    }),
  }));

  const exercises = await prisma.exercises.findMany({
    where: { lesson_id: resolvedLessonId, is_delete: 0 },
    orderBy: { order: 'asc' },
  });

  const exerciseIds = exercises.map(ex => ex.id);

  const userAnswers = await prisma.answer.findMany({
    where: {
      user_id: userId,
      exercise_id: { in: exerciseIds },
      is_delete: 0,
      submission_count: { gte: 1 },
    },
    select: { exercise_id: true },
  });
  const completedExerciseIds = new Set(userAnswers.map(a => a.exercise_id));

  const exerciseList: LessonExercise[] = exercises.map(ex => ({
    id: uuidToShortId(ex.id),
    type: ex.type as 'code' | 'choice' | 'fill',
    content: ex.content,
    analysis: ex.analysis || '',
    order: ex.order,
    isCompleted: completedExerciseIds.has(ex.id),
    metadata: ex.metadata as Record<string, any>,
  }));

  return {
    course: {
      id: uuidToShortId(course.id),
      title: course.title,
      progress: progressPercent,
    },
    currentLesson: {
      id: uuidToShortId(lesson.id),
      title: lesson.title,
      content: lesson.content || '',
      difficulty: lesson.difficulty,
      estimatedTime: lesson.estimated_time,
    },
    catalog,
    exercises: exerciseList,
    exerciseProgress: {
      completedCount: completedExerciseIds.size,
      totalCount: exercises.length,
    },
  };
}
