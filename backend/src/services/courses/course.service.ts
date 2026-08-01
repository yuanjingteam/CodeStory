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

  const allCourses = await prisma.courses.findMany({
    where,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      cover_url: true,
      level: true,
      created_at: true,
    },
  });

  const allCourseIds = allCourses.map(c => c.id);

  const studentCountGroup = await prisma.courses_progress.groupBy({
    by: ['course_id'],
    where: { course_id: { in: allCourseIds }, is_delete: 0 },
    _count: { user_id: true },
  });

  const studentCountMap = new Map(
    studentCountGroup.map(g => [g.course_id, g._count.user_id])
  );

  let filteredCourseIds = allCourseIds;

  if (params.minStudentCount !== undefined || params.maxStudentCount !== undefined) {
    filteredCourseIds = allCourseIds.filter(courseId => {
      const count = studentCountMap.get(courseId) || 0;
      if (params.minStudentCount !== undefined && count < params.minStudentCount) return false;
      if (params.maxStudentCount !== undefined && count > params.maxStudentCount) return false;
      return true;
    });
  }

  const progressMap = new Map();
  if (userId) {
    const progressRecords = await prisma.courses_progress.findMany({
      where: { user_id: userId, course_id: { in: filteredCourseIds }, is_delete: 0 },
    });
    progressRecords.forEach(r => progressMap.set(r.course_id, r));
  }

  if (params.learnStatus !== undefined) {
    filteredCourseIds = filteredCourseIds.filter(courseId => {
      const p = progressMap.get(courseId);
      if (!p) return params.learnStatus === 0;
      return p.status === params.learnStatus;
    });
  }

  const total = filteredCourseIds.length;
  const skipIndex = (page - 1) * size;
  const pagedCourseIds = filteredCourseIds.slice(skipIndex, skipIndex + size);

  const courseMap = new Map(allCourses.map(c => [c.id, c]));
  const pagedCourses = pagedCourseIds.map(id => courseMap.get(id)).filter(Boolean);

  const records = pagedCourses.map(course => {
    const p = progressMap.get(course!.id);
    let percent = 0;

    if (p && p.total_lessons > 0) {
      percent = Math.round((p.completed_lessons / p.total_lessons) * 100);
    }

    return {
      id: uuidToShortId(course!.id),
      uuid: course!.id,
      title: course!.title,
      description: course!.description,
      cover_url: course!.cover_url,
      level: course!.level,
      studentCount: studentCountMap.get(course!.id) || 0,
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
