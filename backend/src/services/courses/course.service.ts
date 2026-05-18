import prisma from '../../config/prisma';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';
import type {
  CourseListParams,
  CourseListResult,
  CourseDetailData,
  ChapterInfo,
  LessonInfo,
} from '../../types/course';

export async function getCourseList(params: CourseListParams, userId: string): Promise<CourseListResult> {
  const page = Math.max(1, params.page || 1);
  const size = Math.min(100, params.size || 10);

  const where: Record<string, any> = { is_delete: 0 };

  if (params.keyword) {
    where.OR = [
      { title: { contains: params.keyword } },
      { description: { contains: params.keyword } },
    ];
  }

  if (params.level !== undefined) {
    where.level = params.level;
  }

  const [total, courses] = await Promise.all([
    prisma.courses.count({ where }),
    prisma.courses.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);

  const courseIds = courses.map(c => c.id);
  const progressRecords = await prisma.courses_progress.findMany({
    where: { user_id: userId, course_id: { in: courseIds }, is_delete: 0 },
  });

  const progressMap = new Map(progressRecords.map(r => [r.course_id, r]));

  const records = courses.map(course => {
    const p = progressMap.get(course.id);
    let percent = 0;

    if (p && p.total_lessons > 0) {
      percent = Math.round((p.completed_lessons / p.total_lessons) * 100);
    }

    return {
      id: uuidToShortId(course.id),
      title: course.title,
      description: course.description,
      cover_url: course.cover_url,
      level: course.level,
      progress: percent,
      progressText: `${percent}%`,
      learnStatus: p?.status || 0,
    };
  });

  return { records, total, page, size };
}

export async function getCourseDetail(courseId: string): Promise<CourseDetailData | null> {
  const resolvedId = await resolveShortId('courses', courseId);
  if (!resolvedId) return null;

  const course = await prisma.courses.findUnique({
    where: { id: resolvedId, is_delete: 0 },
    include: {
      chapters: {
        where: { is_delete: 0 },
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { is_delete: 0 },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              difficulty: true,
              estimated_time: true,
            },
          },
        },
      },
    },
  });

  if (!course) return null;

  const chapters: ChapterInfo[] = course.chapters.map(ch => ({
    id: uuidToShortId(ch.id),
    title: ch.title,
    order: ch.order,
    lessonCount: ch.lessons.length,
    lessons: ch.lessons.map(l => ({
      id: uuidToShortId(l.id),
      title: l.title,
      difficulty: l.difficulty,
      estimated_time: l.estimated_time,
    } as LessonInfo)),
  }));

  const lessonCount = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

  const estimatedTotalTime = chapters.reduce(
    (sum, ch) => sum + ch.lessons.reduce((s, l) => s + l.estimated_time, 0),
    0
  );

  return {
    id: uuidToShortId(course.id),
    title: course.title,
    description: course.description,
    cover_url: course.cover_url,
    level: course.level,
    chapterCount: chapters.length,
    lessonCount,
    estimatedTotalTime,
    chapters,
  };
}
