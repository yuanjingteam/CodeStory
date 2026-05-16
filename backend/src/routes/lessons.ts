import { Router } from 'express';
import prisma from '../config/prisma';
import { uuidToShortId, resolveShortId } from '../utils/idTransform';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/:lessonId', authMiddleware, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user!.id;

    // 短 ID 反查完整 UUID
    const resolvedLessonId = await resolveShortId('lessons', lessonId as string);
    if (!resolvedLessonId) {
      return res.status(404).json({
        code: 404,
        message: '小节不存在',
        data: null,
      });
    }

    // 1. 查询当前小节（含章节和课程信息）
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

    if (!lesson) {
      return res.status(404).json({
        code: 404,
        message: '小节不存在',
        data: null,
      });
    }

    const chapter = lesson.chapters;
    const course = chapter.courses;

    // 2. 查询课程进度
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

    // 3. 查询课程所有章节和小节（目录）
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

    // 4. 查询用户在这些小节中的学习状态
    const allLessonIds = allChapters.flatMap((ch) => ch.lessons.map((l) => l.id));
    const lessonProgressRecords = await prisma.lessons_progress.findMany({
      where: {
        user_id: userId,
        lesson_id: { in: allLessonIds },
        is_delete: 0,
      },
    });

    const lessonProgressMap = new Map(
      lessonProgressRecords.map((record) => [record.lesson_id, record.status])
    );

    // 构建目录数据（ID 转短 ID）
    const catalog = allChapters.map((ch) => ({
      id: uuidToShortId(ch.id),
      title: ch.title,
      lessons: ch.lessons.map((l) => {
        const status = lessonProgressMap.get(l.id);
        // 判断当前小节
        const isCurrent = l.id === resolvedLessonId;
        return {
          id: uuidToShortId(l.id),
          title: l.title,
          status: isCurrent ? 1 : (status ?? 0) as 0 | 1 | 2,
        };
      }),
    }));

    // 5. 查询当前小节的练习题
    const exercises = await prisma.exercises.findMany({
      where: { lesson_id: resolvedLessonId, is_delete: 0 },
      orderBy: { created_at: 'asc' },
      take: 1,
    });

    const exercise = exercises.length > 0 ? {
      id: uuidToShortId(exercises[0].id),
      type: exercises[0].type as 'code' | 'choice' | 'fill',
      content: exercises[0].content,
      analysis: exercises[0].analysis || '',
      metadata: exercises[0].metadata as any,
    } : {
      id: '',
      type: 'code' as const,
      content: '',
      analysis: '',
      metadata: { template: '' },
    };

    res.json({
      code: 200,
      message: 'success',
      data: {
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
        exercise,
      },
    });
  } catch (error) {
    console.error('获取小节详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    });
  }
});

export default router;
