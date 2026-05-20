import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { success, fail, badRequest, notFound } from '../../utils/response';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';

export const getLessonList = async (req: Request, res: Response) => {
  try {
    const { chapterId, courseId, keyword, difficulty, page = 1, size = 10 } = req.query;

    const where: Record<string, any> = {
      is_delete: 0,
      lessons: { is_delete: 0 }
    };

    if (chapterId && chapterId !== '') {
      const resolvedChapterId = await resolveShortId('chapters', String(chapterId));
      if (!resolvedChapterId) return badRequest(res, '章节不存在');
      where.lesson_id = undefined;
      where.lessons = { ...where.lessons, chapter_id: resolvedChapterId };
    }

    if (courseId && courseId !== '') {
      const resolvedCourseId = await resolveShortId('courses', String(courseId));
      if (!resolvedCourseId) return badRequest(res, '课程不存在');

      const chapters = await prisma.chapters.findMany({
        where: { course_id: resolvedCourseId, is_delete: 0 },
        select: { id: true }
      });

      const lessonsInChapters = await prisma.lessons.findMany({
        where: {
          chapter_id: { in: chapters.map(c => c.id) },
          is_delete: 0
        },
        select: { id: true }
      });

      where.lesson_id = { in: lessonsInChapters.map(l => l.id) };
    }

    if (keyword && keyword !== '') {
      where.OR = [
        { content: { contains: String(keyword) } },
        { knowledge: { contains: String(keyword) } },
        { lessons: { title: { contains: String(keyword) } } }
      ];
    }

    if (difficulty !== undefined && difficulty !== '') {
      where.difficulty = Number(difficulty);
    }

    const total = await prisma.exercises.count({ where });

    const exercises = await prisma.exercises.findMany({
      where,
      orderBy: { created_at: 'asc' },
      skip: (Number(page) - 1) * Number(size),
      take: Number(size),
      include: {
        lessons: {
          include: {
            chapters: {
              include: {
                courses: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const data = exercises.map(exercise => ({
      id: uuidToShortId(exercise.id),
      lessonId: uuidToShortId(exercise.lesson_id),
      lessonName: exercise.lessons?.title || '',
      courseId: uuidToShortId(exercise.lessons?.chapters?.courses?.id || ''),
      courseName: exercise.lessons?.chapters?.courses?.title || '',
      chapterId: uuidToShortId(exercise.lessons?.chapter_id || ''),
      chapterName: exercise.lessons?.chapters?.title || '',
      type: exercise.type,
      content: exercise.content,
      knowledge: exercise.knowledge || '',
      answer: exercise.answer,
      analysis: exercise.analysis || '',
      difficulty: exercise.difficulty,
      source: exercise.source || '',
      sortOrder: exercise.lessons?.order || 0,
      createdAt: exercise.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: exercise.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    }));

    return success(res, { total, data });
  } catch (error) {
    console.error('获取小节列表失败:', error);
    return fail(res, '获取小节列表失败');
  }
};

export const createLesson = async (req: Request, res: Response) => {
  try {
    const { chapterId, lessonName, content, type, difficulty, sortOrder, answer } = req.body;
    if (!chapterId || chapterId === '') return badRequest(res, '章节ID不能为空');
    if (!lessonName || !lessonName.trim()) return badRequest(res, '小节名称不能为空');

    const resolvedChapterId = await resolveShortId('chapters', chapterId);
    if (!resolvedChapterId) return notFound(res, '章节不存在');

    const chapterExists = await prisma.chapters.findUnique({
      where: { id: resolvedChapterId, is_delete: 0 }
    });
    if (!chapterExists) return notFound(res, '章节不存在');

    const maxOrder = await prisma.lessons.aggregate({
      where: { chapter_id: resolvedChapterId, is_delete: 0 },
      _max: { order: true }
    });

    let finalOrder: number;
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
      finalOrder = Number(sortOrder);
      console.log('创建小节 - 使用指定的排序:', finalOrder);
      
      const existingOrder = await prisma.lessons.findFirst({
        where: {
          chapter_id: resolvedChapterId,
          order: finalOrder,
          is_delete: 0
        }
      });
      
      if (existingOrder) {
        finalOrder = (maxOrder._max.order || 0) + 1;
      }
    } else {
      finalOrder = (maxOrder._max.order || 0) + 1;
    }

    const lesson = await prisma.lessons.create({
      data: {
        chapter_id: resolvedChapterId,
        title: lessonName.trim(),
        content: content || '',
        difficulty: Number(difficulty) || 0,
        order: finalOrder
      }
    });

    let exerciseType = '';
    let exerciseContent = '';
    let exerciseAnswer = '';

    if (type || content || answer) {
      try {
        const exercise = await prisma.exercises.create({
          data: {
            lesson_id: lesson.id,
            type: String(type || ''),
            content: String(content || ''),
            answer: String(answer || ''),
            difficulty: Number(difficulty) || 0
          }
        });
        exerciseType = exercise.type;
        exerciseContent = exercise.content;
        exerciseAnswer = exercise.answer;

      } catch (exerciseError) {
        console.error('创建小节失败:', exerciseError);
        // 即使exercise创建失败，也返回lesson数据
      }
    }

    return success(res, {
      id: uuidToShortId(lesson.id),
      courseId: uuidToShortId(chapterExists.course_id),
      courseName: '',
      chapterId: uuidToShortId(lesson.chapter_id),
      chapterName: chapterExists.title,
      lessonName: lesson.title,
      content: exerciseContent || lesson.content || '',
      type: exerciseType,
      answer: exerciseAnswer || '',
      difficulty: lesson.difficulty,
      sortOrder: lesson.order,
      exerciseCount: type || content || answer ? 1 : 0,
      createdAt: lesson.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: lesson.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    });
  } catch (error) {
    return fail(res, '创建小节失败');
  }
};

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resolvedId = await resolveShortId('lessons', id);
    if (!resolvedId) return notFound(res, '小节不存在');

    const existing = await prisma.lessons.findUnique({
      where: { id: resolvedId, is_delete: 0 }
    });
    if (!existing) return notFound(res, '小节不存在');

    const { lessonName, content, type, difficulty, sortOrder, answer } = req.body;
    const updateData: Record<string, any> = {};

    if (lessonName !== undefined && lessonName !== '') {
      updateData.title = lessonName.trim();
    }
    if (content !== undefined) {
      updateData.content = content;
    }
    if (difficulty !== undefined) {
      updateData.difficulty = parseInt(difficulty);
    }
    if (sortOrder !== undefined) {
      updateData.order = parseInt(sortOrder);
    }

    const lesson = await prisma.lessons.update({
      where: { id: resolvedId },
      data: updateData
    });

    let exerciseType = '';
    let exerciseContent = '';
    let exerciseAnswer = '';

    if (type !== undefined || content !== undefined || answer !== undefined) {
      const existingExercise = await prisma.exercises.findFirst({
        where: { lesson_id: resolvedId, is_delete: 0 },
        orderBy: { created_at: 'asc' }
      });

      if (existingExercise) {
        const exerciseUpdateData: Record<string, any> = {};
        if (type !== undefined) {
          exerciseUpdateData.type = type;
        }
        if (content !== undefined) {
          exerciseUpdateData.content = content;
        }
        if (answer !== undefined) {
          exerciseUpdateData.answer = answer;
        }

        const updatedExercise = await prisma.exercises.update({
          where: { id: existingExercise.id },
          data: exerciseUpdateData
        });
        exerciseType = updatedExercise.type || '';
        exerciseContent = updatedExercise.content || '';
        exerciseAnswer = updatedExercise.answer || '';
      } else if (type || content || answer) {
        const newExercise = await prisma.exercises.create({
          data: {
            lesson_id: resolvedId,
            type: type || '',
            content: content || '',
            answer: answer || '',
            difficulty: lesson.difficulty
          }
        });
        exerciseType = newExercise.type;
        exerciseContent = newExercise.content;
        exerciseAnswer = newExercise.answer;
      }
    } else {
      const firstExercise = await prisma.exercises.findFirst({
        where: { lesson_id: resolvedId, is_delete: 0 },
        orderBy: { created_at: 'asc' }
      });
      if (firstExercise) {
        exerciseType = firstExercise.type || '';
        exerciseContent = firstExercise.content || '';
        exerciseAnswer = firstExercise.answer || '';
      }
    }

    const exerciseCount = await prisma.exercises.count({
      where: { lesson_id: resolvedId, is_delete: 0 }
    });

    const chapterInfo = await prisma.chapters.findUnique({
      where: { id: lesson.chapter_id },
      include: {
        courses: {
          select: { title: true }
        }
      }
    });

    return success(res, {
      id: uuidToShortId(lesson.id),
      courseId: uuidToShortId(chapterInfo?.course_id || ''),
      courseName: chapterInfo?.courses?.title || '',
      chapterId: uuidToShortId(lesson.chapter_id),
      chapterName: chapterInfo?.title || '',
      lessonName: lesson.title,
      content: exerciseContent || lesson.content || '',
      type: exerciseType,
      answer: exerciseAnswer || '',
      difficulty: lesson.difficulty,
      sortOrder: lesson.order,
      exerciseCount,
      createdAt: lesson.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: lesson.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    });
  } catch (error) {
    console.error('更新小节失败:', error);
    return fail(res, '更新小节失败');
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resolvedId = await resolveShortId('lessons', id);
    if (!resolvedId) return notFound(res, '小节不存在');

    const existing = await prisma.lessons.findUnique({
      where: { id: resolvedId, is_delete: 0 }
    });
    if (!existing) return notFound(res, '小节不存在');

    await prisma.lessons.update({
      where: { id: resolvedId },
      data: { is_delete: 1 }
    });

    return success(res, null);
  } catch (error) {
    console.error('删除小节失败:', error);
    return fail(res, '删除小节失败');
  }
};
