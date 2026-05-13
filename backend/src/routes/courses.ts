import { Router } from 'express';
import prisma from '../config/prisma';

const router = Router();

router.get('/list', async (req, res) => {
  try {
    // 获取分页参数
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    const keyword = req.query.keyword as string;
    const level = req.query.level ? parseInt(req.query.level as string) : undefined;
    const userId = req.headers['x-user-id'] as string || '550e8400-e29b-41d4-a716-446655440000';

    const where: any = {
      is_delete: 0, // 只查询未删除的课程
    };

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    // 难度筛选
    if (level !== undefined) {
      where.level = level;
    }

    // 查询总数
    const total = await prisma.courses.count({ where });

    // 查询课程列表
    const courses = await prisma.courses.findMany({
      where,
      orderBy: {
        created_at: 'desc', // 按创建时间倒序
      },
      skip: (page - 1) * size,
      take: size,
    });

    // 查询用户在这些课程中的进度
    const courseIds = courses.map(c => c.id);
    const progressRecords = await prisma.courses_progress.findMany({
      where: {
        user_id: userId,
        course_id: { in: courseIds },
        is_delete: 0,
      },
    });

    // 构建进度映射表
    const progressMap = new Map(
      progressRecords.map(record => [record.course_id, record])
    );

    // 返回数据
    res.json({
      code: 200,
      message: 'success',
      data: {
        records: courses.map((course) => {
          const progress = progressMap.get(course.id);
          
          // 计算进度百分比
          let progressPercent = 0;
          if (progress && progress.total_lessons > 0) {
            progressPercent = Math.round(
              (progress.completed_lessons / progress.total_lessons) * 100
            );
          }

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            cover_url: course.cover_url,
            level: course.level, // 直接返回数字：0-初级 1-中级 2-高级
            progress: progressPercent,
            progressText: `${progressPercent}%`,
            learnStatus: progress ? progress.status : 0, // 直接返回数字：0-未开始 1-进行中 2-已完成
          };
        }),
        total,
        page,
        size,
      },
    });
  } catch (error) {
    console.error('获取课程列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    });
  }
});

router.get('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.courses.findUnique({
      where: {
        id: courseId,
        is_delete: 0,
      },
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

    if (!course) {
      return res.status(404).json({
        code: 404,
        message: '课程不存在',
        data: null,
      });
    }

    const chapters = course.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      lessonCount: chapter.lessons.length,
      lessons: chapter.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        difficulty: lesson.difficulty,
        estimated_time: lesson.estimated_time,
      })),
    }));

    const lessonCount = chapters.reduce(
      (sum, ch) => sum + ch.lessons.length,
      0
    );

    const estimatedTotalTime = course.chapters.reduce((sum, ch) => {
      return (
        sum +
        ch.lessons.reduce((lSum, lesson) => lSum + lesson.estimated_time, 0)
      );
    }, 0);

    res.json({
      code: 200,
      message: 'success',
      data: {
        id: course.id,
        title: course.title,
        description: course.description,
        cover_url: course.cover_url,
        level: course.level,
        chapterCount: chapters.length,
        lessonCount,
        estimatedTotalTime,
        chapters,
      },
    });
  } catch (error) {
    console.error('获取课程详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误',
      data: null,
    });
  }
});


export default router;