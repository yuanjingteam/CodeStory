import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { success, fail, badRequest, notFound } from '../../utils/response';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, level } = req.body;

    if (!title || !title.trim()) return badRequest(res, '课程名称不能为空');
    if (!description || !description.trim()) return badRequest(res, '课程描述不能为空');

    let coverUrl = '';
    if ((req as any).file) {
      coverUrl = `${req.protocol || 'http'}://${req.get('host')}/uploads/courses/${(req as any).file.filename}`;
    }

    const course = await prisma.courses.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        level: parseInt(level) || 0,
        cover_url: coverUrl || null,
      },
    });

    return success(res, {
      id: uuidToShortId(course.id),
      title: course.title,
      description: course.description,
      level: course.level,
      cover_url: course.cover_url,
    });
  } catch (error) {
    console.error('创建课程失败:', error);
    return fail(res, '创建课程失败');
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resolvedId = await resolveShortId('courses', id);
    if (!resolvedId) return notFound(res, '课程不存在');

    const existing = await prisma.courses.findUnique({
      where: { id: resolvedId, is_delete: 0 },
    });
    if (!existing) return notFound(res, '课程不存在');

    const { title, description, level } = req.body;
    const updateData: Record<string, any> = {};

    if (title !== undefined && title !== '') updateData.title = title.trim();
    if (description !== undefined && description !== '') updateData.description = description.trim();
    if (level !== undefined) updateData.level = parseInt(level);

    if ((req as any).file) {
      updateData.cover_url = `${req.protocol || 'http'}://${req.get('host')}/uploads/courses/${(req as any).file.filename}`;
    }

    const course = await prisma.courses.update({
      where: { id: resolvedId },
      data: updateData,
    });

    return success(res, {
      id: uuidToShortId(course.id),
      title: course.title,
      description: course.description,
      level: course.level,
      cover_url: course.cover_url,
    });
  } catch (error) {
    console.error('更新课程失败:', error);
    return fail(res, '更新课程失败');
  }
};
