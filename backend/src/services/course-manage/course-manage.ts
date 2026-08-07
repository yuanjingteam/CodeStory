import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { success, fail, badRequest, notFound } from '../../utils/response';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';
import { uploadToOSS, deleteFromOSS, extractOSSKey } from '@/middleware/upload';
import { CONTENT_RETENTION_DAYS } from './content-retention.service';
import {
  aggregateKnowledgeIndexSummaries,
  completeKnowledgeIndexes,
  getLessonIndexSummary,
  invalidateLessonsKnowledge,
  queueLessonsKnowledge,
} from '../rag';

function getPurgeAt(deletedAt: Date | null): string | null {
  return deletedAt
    ? new Date(
        deletedAt.getTime() +
          CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000
      ).toISOString()
    : null;
}

export const getCourseManageList = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      keyword,
      level,
      status = 'active',
      page = 1,
      size = 10,
    } = req.query;
    const where: Record<string, unknown> = {
      is_delete: status === 'deleted' ? 1 : 0,
    };
    if (keyword) {
      where.OR = [
        { title: { contains: String(keyword) } },
        { description: { contains: String(keyword) } },
      ];
    }
    if (level !== undefined && level !== '') {
      where.level = Number(level);
    }
    const [total, courses] = await Promise.all([
      prisma.courses.count({ where }),
      prisma.courses.findMany({
        where,
        orderBy: { created_at: 'asc' },
        skip: (Number(page) - 1) * Number(size),
        take: Number(size),
      }),
    ]);
    return success(res, {
      total,
      records: courses.map((course) => ({
        id: uuidToShortId(course.id),
        title: course.title,
        description: course.description || '',
        level: course.level,
        cover_url: course.cover_url,
        deletedAt: course.deleted_at?.toISOString() || null,
        purgeAt: getPurgeAt(course.deleted_at),
      })),
    });
  } catch (error) {
    console.error('获取课程管理列表失败:', error);
    return fail(res, '获取课程管理列表失败');
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, level } = req.body;

    if (!title || !title.trim()) return badRequest(res, '课程名称不能为空');
    if (!description || !description.trim()) return badRequest(res, '课程描述不能为空');

    let coverUrl = '';
    if ((req as any).file) {
      coverUrl = await uploadToOSS((req as any).file, 'courses');
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
      if (existing.cover_url) {
        const oldKey = extractOSSKey(existing.cover_url);
        if (oldKey) {
          await deleteFromOSS(oldKey);
        }
      }
      updateData.cover_url = await uploadToOSS((req as any).file, 'courses');
    }

    const titleChanged =
      typeof updateData.title === 'string' &&
      updateData.title !== existing.title;
    const { course, lessonIds, indexTickets } =
      await prisma.$transaction(async (tx) => {
        const course = await tx.courses.update({
          where: { id: resolvedId },
          data: updateData,
        });
        const lessonIds = titleChanged
          ? (
              await tx.lessons.findMany({
                where: {
                  is_delete: 0,
                  chapters: {
                    course_id: resolvedId,
                    is_delete: 0,
                  },
                },
                select: { id: true },
              })
            ).map((lesson) => lesson.id)
          : [];
        const indexTickets = titleChanged
          ? await queueLessonsKnowledge(tx, lessonIds)
          : [];
        return { course, lessonIds, indexTickets };
      });
    const indexing = titleChanged
      ? await completeKnowledgeIndexes(indexTickets)
      : null;
    const indexSummary = titleChanged
      ? aggregateKnowledgeIndexSummaries(
          await Promise.all(
            lessonIds.map((lessonId) =>
              getLessonIndexSummary(lessonId)
            )
          )
        )
      : undefined;

    return success(res, {
      id: uuidToShortId(course.id),
      title: course.title,
      description: course.description,
      level: course.level,
      cover_url: course.cover_url,
      indexStatus: indexing ? indexSummary?.status : undefined,
      indexSummary,
    });
  } catch (error) {
    console.error('更新课程失败:', error);
    return fail(res, '更新课程失败');
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resolvedId = await resolveShortId('courses', id);
    if (!resolvedId) return notFound(res, '课程不存在');

    const existing = await prisma.courses.findUnique({
      where: { id: resolvedId, is_delete: 0 },
    });
    if (!existing) return notFound(res, '课程不存在');

    await prisma.$transaction(async (tx) => {
      const lessonIds = (
        await tx.lessons.findMany({
          where: {
            is_delete: 0,
            chapters: { course_id: resolvedId },
          },
          select: { id: true },
        })
      ).map((lesson) => lesson.id);
      await tx.courses.update({
        where: { id: resolvedId },
        data: { is_delete: 1, deleted_at: new Date() },
      });
      await invalidateLessonsKnowledge(tx, lessonIds);
    });

    return success(res, null);
  } catch (error) {
    console.error('删除课程失败:', error);
    return fail(res, '删除课程失败');
  }
};

export const restoreCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const courseId = await resolveShortId('courses', id, {
      includeDeleted: true,
    });
    if (!courseId) return notFound(res, '课程不存在');
    const course = await prisma.courses.findUnique({
      where: { id: courseId },
    });
    if (!course || course.is_delete !== 1) {
      return notFound(res, '已删除课程不存在');
    }

    const lessonIds = (
      await prisma.lessons.findMany({
        where: {
          is_delete: 0,
          chapters: {
            course_id: courseId,
            is_delete: 0,
          },
        },
        select: { id: true },
      })
    ).map((lesson) => lesson.id);
    const tickets = await prisma.$transaction(async (tx) => {
      await tx.courses.update({
        where: { id: courseId },
        data: { is_delete: 0, deleted_at: null },
      });
      return queueLessonsKnowledge(tx, lessonIds);
    });
    await completeKnowledgeIndexes(tickets);
    return success(res, {
      id: uuidToShortId(courseId),
      restoredLessons: lessonIds.length,
    });
  } catch (error) {
    console.error('恢复课程失败:', error);
    return fail(res, '恢复课程失败');
  }
};
