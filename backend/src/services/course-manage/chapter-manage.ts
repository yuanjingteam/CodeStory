import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { success, fail, badRequest, notFound } from '../../utils/response';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';

export const getChapterList = async (req: Request, res: Response) => {
  try {
    const { courseId, keyword, page = 1, size = 10 } = req.query;

    const where: Record<string, any> = { is_delete: 0 };

    if (courseId && courseId !== '') {
      const resolvedCourseId = await resolveShortId('courses', String(courseId));
      if (!resolvedCourseId) return badRequest(res, '课程不存在');
      where.course_id = resolvedCourseId;
    }

    if (keyword && keyword !== '') {
      where.title = { contains: String(keyword) };
    }

    const chapters = await prisma.chapters.findMany({
      where,
      orderBy: { order: 'asc' },
      skip: (Number(page) - 1) * Number(size),
      take: Number(size),
      include: {
        courses: {
          select: {
            title: true
          }
        },
        _count: {
          select: { lessons: true }
        }
      }
    });

    const data = chapters.map(chapter => ({
      id: uuidToShortId(chapter.id),
      courseId: uuidToShortId(chapter.course_id),
      courseName: chapter.courses.title,
      chapterName: chapter.title,
      sectionCount: chapter._count.lessons,
      sortOrder: chapter.order,
      createdAt: chapter.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: chapter.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    }));

    return success(res, data);
  } catch (error) {
    console.error('获取章节列表失败:', error);
    return fail(res, '获取章节列表失败');
  }
};

export const createChapter = async (req: Request, res: Response) => {
  try {
    const { courseId, chapterName, sortOrder } = req.body;

    if (!courseId || courseId === '') return badRequest(res, '课程ID不能为空');
    if (!chapterName || !chapterName.trim()) return badRequest(res, '章节名称不能为空');

    const resolvedCourseId = await resolveShortId('courses', courseId);
    if (!resolvedCourseId) return notFound(res, '课程不存在');

    const courseExists = await prisma.courses.findUnique({
      where: { id: resolvedCourseId, is_delete: 0 }
    });
    if (!courseExists) return notFound(res, '课程不存在');

    const maxOrder = await prisma.chapters.aggregate({
      where: { course_id: resolvedCourseId, is_delete: 0 },
      _max: { order: true }
    });

    const chapter = await prisma.chapters.create({
      data: {
        course_id: resolvedCourseId,
        title: chapterName.trim(),
        order: sortOrder || (maxOrder._max.order || 0) + 1
      }
    });

    return success(res, {
      id: uuidToShortId(chapter.id),
      courseId: uuidToShortId(chapter.course_id),
      chapterName: chapter.title,
      sectionCount: 0,
      sortOrder: chapter.order,
      createdAt: chapter.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: chapter.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    });
  } catch (error) {
    console.error('创建章节失败:', error);
    return fail(res, '创建章节失败');
  }
};

export const updateChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resolvedId = await resolveShortId('chapters', id);
    if (!resolvedId) return notFound(res, '章节不存在');

    const existing = await prisma.chapters.findUnique({
      where: { id: resolvedId, is_delete: 0 }
    });
    if (!existing) return notFound(res, '章节不存在');

    const { chapterName, sortOrder } = req.body;
    const updateData: Record<string, any> = {};

    if (chapterName !== undefined && chapterName !== '') {
      updateData.title = chapterName.trim();
    }
    if (sortOrder !== undefined) {
      updateData.order = parseInt(sortOrder);
    }

    const chapter = await prisma.chapters.update({
      where: { id: resolvedId },
      data: updateData
    });

    const lessonCount = await prisma.lessons.count({
      where: { chapter_id: resolvedId, is_delete: 0 }
    });

    return success(res, {
      id: uuidToShortId(chapter.id),
      courseId: uuidToShortId(chapter.course_id),
      chapterName: chapter.title,
      sectionCount: lessonCount,
      sortOrder: chapter.order,
      createdAt: chapter.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: chapter.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    });
  } catch (error) {
    console.error('更新章节失败:', error);
    return fail(res, '更新章节失败');
  }
};

export const deleteChapter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resolvedId = await resolveShortId('chapters', id);
    if (!resolvedId) return notFound(res, '章节不存在');

    const existing = await prisma.chapters.findUnique({
      where: { id: resolvedId, is_delete: 0 }
    });
    if (!existing) return notFound(res, '章节不存在');

    await prisma.chapters.update({
      where: { id: resolvedId },
      data: { is_delete: 1 }
    });

    return success(res, null);
  } catch (error) {
    console.error('删除章节失败:', error);
    return fail(res, '删除章节失败');
  }
};
