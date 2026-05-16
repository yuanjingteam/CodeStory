import { Router } from 'express';
import prisma from '../config/prisma';
import { success, fail, notFound } from '../utils/response';
import { uuidToShortId, resolveShortId } from '../utils/idTransform';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 1. 课程列表
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const size = Math.min(100, parseInt(req.query.size as string) || 10);
    const keyword = req.query.keyword as string;
    const level = req.query.level ? parseInt(req.query.level as string) : undefined;
    const userId = req.user!.id;

    const where: any = { is_delete: 0 };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    if (level !== undefined) {
      where.level = level;
    }

    // 查总数 + 列表
    const [total, courses] = await Promise.all([
      prisma.courses.count({ where }),
      prisma.courses.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
    ]);

    // 查进度
    const courseIds = courses.map(c => c.id);
    const progressRecords = await prisma.courses_progress.findMany({
      where: { user_id: userId, course_id: { in: courseIds }, is_delete: 0 },
    });

    const progressMap = new Map(progressRecords.map(r => [r.course_id, r]));

    // 整理返回
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

    return success(res, { records, total, page, size });

  } catch (error) {
    console.error('课程列表失败:', error);
    return fail(res);
  }
});

// 2. 课程详情
router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    // 短 ID 反查完整 UUID
    const resolvedId = await resolveShortId('courses', courseId);
    if (!resolvedId) return notFound(res, '课程不存在');

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

    if (!course) return notFound(res, '课程不存在');

    const chapters = course.chapters.map(ch => ({
      id: uuidToShortId(ch.id),
      title: ch.title,
      order: ch.order,
      lessonCount: ch.lessons.length,
      lessons: ch.lessons.map(l => ({
        id: uuidToShortId(l.id),
        title: l.title,
        difficulty: l.difficulty,
        estimated_time: l.estimated_time,
      })),
    }));

    // 统计
    const lessonCount = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

    const estimatedTotalTime = chapters.reduce(
      (sum, ch) => sum + ch.lessons.reduce((s, l) => s + l.estimated_time, 0),
      0
    );

    return success(res, {
      id: uuidToShortId(course.id),
      title: course.title,
      description: course.description,
      cover_url: course.cover_url,
      level: course.level,
      chapterCount: chapters.length,
      lessonCount,
      estimatedTotalTime,
      chapters,
    });

  } catch (error) {
    console.error('课程详情失败:', error);
    return fail(res);
  }
});

export default router;