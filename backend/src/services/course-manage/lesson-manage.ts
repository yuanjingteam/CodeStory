import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { success, fail, badRequest, notFound } from '../../utils/response';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';

export const getLessonList = async (req: Request, res: Response) => {
  try {
    const { chapterId, courseId, keyword, difficulty, page = 1, size = 10 } = req.query;

    const where: Record<string, any> = {
      is_delete: 0
    };

    if (chapterId && chapterId !== '') {
      const resolvedChapterId = await resolveShortId('chapters', String(chapterId));
      if (!resolvedChapterId) return badRequest(res, '章节不存在');
      where.chapter_id = resolvedChapterId;
    }

    if (courseId && courseId !== '') {
      const resolvedCourseId = await resolveShortId('courses', String(courseId));
      if (!resolvedCourseId) return badRequest(res, '课程不存在');

      const chapters = await prisma.chapters.findMany({
        where: { course_id: resolvedCourseId, is_delete: 0 },
        select: { id: true }
      });

      where.chapter_id = { in: chapters.map(c => c.id) };
    }

    if (keyword && keyword !== '') {
      where.OR = [
        { title: { contains: String(keyword) } },
        { content: { contains: String(keyword) } }
      ];
    }

    if (difficulty !== undefined && difficulty !== '') {
      where.difficulty = Number(difficulty);
    }

    const total = await prisma.lessons.count({ where });

    const lessons = await prisma.lessons.findMany({
      where,
      orderBy: { order: 'asc' },
      skip: (Number(page) - 1) * Number(size),
      take: Number(size),
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
        },
        exercises: {
          where: { is_delete: 0 },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            type: true,
            content: true,
            answer: true,
            metadata: true,
            hints: true,
            order: true
          }
        }
      }
    });

    const data = lessons.map(lesson => ({
      id: uuidToShortId(lesson.id),
      lessonId: uuidToShortId(lesson.id),
      lessonName: lesson.title,
      courseId: uuidToShortId(lesson.chapters?.courses?.id || ''),
      courseName: lesson.chapters?.courses?.title || '',
      chapterId: uuidToShortId(lesson.chapter_id || ''),
      chapterName: lesson.chapters?.title || '',
      content: lesson.content || '',
      difficulty: lesson.difficulty,
      sortOrder: lesson.order,
      estimatedTime: lesson.estimated_time || 0,
      exercises: lesson.exercises.map((ex: any) => ({
        id: uuidToShortId(ex.id),
        type: ex.type,
        exerciseContent: ex.content,
        answer: ex.answer,
        metadata: ex.metadata,
        hints: ex.hints,
        order: ex.order
      })),
      exerciseCount: lesson.exercises.length,
      createdAt: lesson.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: lesson.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    }));

    return success(res, { total, data });
  } catch (error) {
    console.error('获取小节列表失败:', error);
    return fail(res, '获取小节列表失败');
  }
};

export const createLesson = async (req: Request, res: Response) => {
  try {
    const { chapterId, lessonName, content, difficulty, sortOrder, estimatedTime, exercises } = req.body;
    if (!chapterId || chapterId === '') return badRequest(res, '章节ID不能为空');
    if (!lessonName || !lessonName.trim()) return badRequest(res, '小节名称不能为空');

    const resolvedChapterId = await resolveShortId('chapters', chapterId);
    if (!resolvedChapterId) return notFound(res, '章节不存在');

    const chapterExists = await prisma.chapters.findUnique({
      where: { id: resolvedChapterId, is_delete: 0 }
    });
    if (!chapterExists) return notFound(res, '章节不存在');

    let finalOrder;
    if (sortOrder !== undefined && sortOrder !== '') {
      finalOrder = parseInt(sortOrder);
    } else {
      const maxOrder = await prisma.lessons.aggregate({
        where: { chapter_id: resolvedChapterId, is_delete: 0 },
        _max: { order: true }
      });
      finalOrder = (maxOrder._max.order || 0) + 1;
    }

    let lesson;
    let retryCount = 0;
    const MAX_RETRY = 10;

    while (retryCount < MAX_RETRY) {
      try {
        lesson = await prisma.lessons.create({
          data: {
            chapter_id: resolvedChapterId,
            title: lessonName.trim(),
            content: content || '',
            difficulty: Number(difficulty) || 0,
            order: finalOrder,
            estimated_time: Number(estimatedTime) || 0
          }
        });
        break;
      } catch (createError) {
        if ((createError as any)?.code === 'P2002' && retryCount < MAX_RETRY - 1) {
          retryCount++;
          finalOrder++;
          continue;
        }
        throw createError;
      }
    }

    if (!lesson) {
      return fail(res, '创建小节失败');
    }

    const courseId = chapterExists.course_id;

    await updateCourseProgressForNewLesson(courseId);

    const createdExercises: any[] = [];

    if (exercises && Array.isArray(exercises) && exercises.length > 0) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (!ex.type && !ex.exerciseContent && !ex.answer) continue;
        
        try {
          const exercise = await prisma.exercises.create({
            data: {
              lesson_id: lesson.id,
              type: String(ex.type || ''),
              content: String(ex.exerciseContent || ''),
              answer: String(ex.answer || ''),
              difficulty: Number(difficulty) || 0,
              metadata: ex.metadata || null,
              hints: ex.hints || null,
              order: i + 1
            }
          });
          createdExercises.push({
            id: uuidToShortId(exercise.id),
            type: exercise.type,
            content: exercise.content,
            answer: exercise.answer,
            metadata: exercise.metadata,
            hints: exercise.hints,
            order: exercise.order
          });
        } catch (exerciseError) {
          console.error(`创建题目 ${i + 1} 失败:`, exerciseError);
        }
      }
    }

    return success(res, {
      id: uuidToShortId(lesson.id),
      courseId: uuidToShortId(chapterExists.course_id),
      courseName: '',
      chapterId: uuidToShortId(lesson.chapter_id),
      chapterName: chapterExists.title,
      lessonName: lesson.title,
      content: lesson.content || '',
      exercises: createdExercises,
      difficulty: lesson.difficulty,
      sortOrder: lesson.order,
      exerciseCount: createdExercises.length,
      createdAt: lesson.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: lesson.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    });
  } catch (error) {
    console.error('创建小节失败:', error);

    if ((error as any)?.code === 'P2002') {
      return fail(res, '数据重复：该记录已存在');
    }
    if ((error as any)?.code === 'P2025') {
      return fail(res, '关联数据不存在');
    }

    return fail(res, `创建小节失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    let resolvedLessonId: string | null = null;

    const resolvedExerciseId = await resolveShortId('exercises', id);
    if (resolvedExerciseId) {
      const exercise = await prisma.exercises.findUnique({
        where: { id: resolvedExerciseId, is_delete: 0 },
        select: { lesson_id: true }
      });
      if (exercise) {
        resolvedLessonId = exercise.lesson_id;
      }
    }

    if (!resolvedLessonId) {
      resolvedLessonId = await resolveShortId('lessons', id);
    }

    if (!resolvedLessonId) return notFound(res, '小节不存在');

    const existing = await prisma.lessons.findUnique({
      where: { id: resolvedLessonId, is_delete: 0 }
    });
    if (!existing) return notFound(res, '小节不存在');

    const { lessonName, content, difficulty, sortOrder, estimatedTime, exercises } = req.body;
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
      where: { id: resolvedLessonId },
      data: updateData
    });

    const updatedExercises: any[] = [];

    if (exercises && Array.isArray(exercises)) {
      await prisma.exercises.updateMany({
        where: { lesson_id: resolvedLessonId, is_delete: 0 },
        data: { is_delete: 1 }
      });

      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (!ex.type && !ex.exerciseContent && !ex.answer) continue;
        
        try {
          const exercise = await prisma.exercises.create({
            data: {
              lesson_id: resolvedLessonId,
              type: String(ex.type || ''),
              content: String(ex.exerciseContent || ''),
              answer: String(ex.answer || ''),
              difficulty: lesson.difficulty,
              metadata: ex.metadata || null,
              hints: ex.hints || null,
              order: i + 1
            }
          });
          updatedExercises.push({
            id: uuidToShortId(exercise.id),
            type: exercise.type,
            content: exercise.content,
            answer: exercise.answer,
            metadata: exercise.metadata,
            hints: exercise.hints,
            order: exercise.order
          });
        } catch (exerciseError) {
          console.error(`更新题目 ${i + 1} 失败:`, exerciseError);
        }
      }
    } else {
      const existingExercises = await prisma.exercises.findMany({
        where: { lesson_id: resolvedLessonId, is_delete: 0 },
        orderBy: { order: 'asc' }
      });
      for (const ex of existingExercises) {
        updatedExercises.push({
          id: uuidToShortId(ex.id),
          type: ex.type,
          content: ex.content,
          answer: ex.answer,
          metadata: ex.metadata,
          hints: ex.hints,
          order: ex.order
        });
      }
    }

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
      content: lesson.content || '',
      exercises: updatedExercises,
      difficulty: lesson.difficulty,
      sortOrder: lesson.order,
      exerciseCount: updatedExercises.length,
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

    let resolvedLessonId: string | null = null;

    const resolvedExerciseId = await resolveShortId('exercises', id);
    if (resolvedExerciseId) {
      const exercise = await prisma.exercises.findUnique({
        where: { id: resolvedExerciseId, is_delete: 0 },
        select: { lesson_id: true }
      });
      if (exercise) {
        resolvedLessonId = exercise.lesson_id;
      }
    }

    if (!resolvedLessonId) {
      resolvedLessonId = await resolveShortId('lessons', id);
    }

    if (!resolvedLessonId) return notFound(res, '小节不存在');

    const existing = await prisma.lessons.findUnique({
      where: { id: resolvedLessonId, is_delete: 0 }
    });
    if (!existing) return notFound(res, '小节不存在');

    await prisma.lessons.update({
      where: { id: resolvedLessonId },
      data: { is_delete: 1 }
    });

    await prisma.exercises.updateMany({
      where: { lesson_id: resolvedLessonId },
      data: { is_delete: 1 }
    });

    return success(res, null);
  } catch (error) {
    console.error('删除小节失败:', error);
    return fail(res, '删除小节失败');
  }
};

async function updateCourseProgressForNewLesson(courseId: string): Promise<void> {
  const chapterIds = (await prisma.chapters.findMany({
    where: { course_id: courseId, is_delete: 0 },
    select: { id: true },
  })).map(ch => ch.id);

  const totalLessons = await prisma.lessons.count({
    where: {
      chapter_id: { in: chapterIds },
      is_delete: 0,
    },
  });

  const progressRecords = await prisma.courses_progress.findMany({
    where: {
      course_id: courseId,
      is_delete: 0,
    },
  });

  for (const record of progressRecords) {
    const newStatus = record.status === 2 ? 1 : record.status;

    await prisma.courses_progress.update({
      where: { id: record.id },
      data: {
        total_lessons: totalLessons,
        status: newStatus,
        updated_at: new Date(),
      },
    });
  }
}
