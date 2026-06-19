import prisma from '../../config/prisma';

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
