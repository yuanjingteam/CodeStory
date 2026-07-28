import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import { success, fail, badRequest, notFound } from '../../utils/response';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';

type TransactionClient = Prisma.TransactionClient;

interface ManageExerciseInput {
  id?: string;
  type?: unknown;
  exerciseContent?: unknown;
  answer?: unknown;
  knowledge?: unknown;
  analysis?: unknown;
  source?: unknown;
  metadata?: Prisma.InputJsonValue | null;
  hints?: Prisma.InputJsonValue | null;
}

class LessonInputError extends Error {}

const CLIENT_EXERCISE_ID_PREFIX = 'exercise_';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getExerciseWriteData(exercise: ManageExerciseInput, difficulty: number) {
  return {
    type: String(exercise.type || ''),
    content: String(exercise.exerciseContent || ''),
    answer: String(exercise.answer || ''),
    knowledge: String(exercise.knowledge ?? ''),
    analysis: String(exercise.analysis ?? ''),
    difficulty,
    metadata: exercise.metadata ?? Prisma.JsonNull,
    hints: exercise.hints ?? Prisma.JsonNull,
  };
}

function validateExercises(exercises: ManageExerciseInput[]): void {
  const requestIds = new Set<string>();

  exercises.forEach((exercise, index) => {
    const label = `题目 ${index + 1}`;
    if (!String(exercise.type || '').trim()) {
      throw new LessonInputError(`${label}缺少题型`);
    }
    if (!String(exercise.exerciseContent || '').trim()) {
      throw new LessonInputError(`${label}缺少题目描述`);
    }
    if (!String(exercise.answer || '').trim()) {
      throw new LessonInputError(`${label}缺少答案`);
    }

    if (exercise.id) {
      if (requestIds.has(exercise.id)) {
        throw new LessonInputError(`${label}的题目 ID 重复`);
      }
      requestIds.add(exercise.id);
    }
  });
}

function replaceExerciseReferences(content: string, idMap: Map<string, string>): string {
  let nextContent = content;

  idMap.forEach((serverId, requestId) => {
    nextContent = nextContent
      .split(`data-exercise-id="${requestId}"`)
      .join(`data-exercise-id="${serverId}"`)
      .split(`data-exercise-id='${requestId}'`)
      .join(`data-exercise-id='${serverId}'`);
  });

  return nextContent;
}

function serializeManageExercise(exercise: {
  id: string;
  type: string;
  content: string;
  answer: string;
  knowledge: string | null;
  analysis: string | null;
  source: string | null;
  metadata: Prisma.JsonValue | null;
  hints: Prisma.JsonValue | null;
  order: number;
}) {
  return {
    id: exercise.id,
    type: exercise.type,
    exerciseContent: exercise.content,
    answer: exercise.answer,
    knowledge: exercise.knowledge || '',
    analysis: exercise.analysis || '',
    source: exercise.source || 'static',
    metadata: exercise.metadata,
    hints: exercise.hints,
    order: exercise.order,
  };
}

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
            knowledge: true,
            analysis: true,
            source: true,
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
      exercises: lesson.exercises.map(serializeManageExercise),
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

    const exerciseInputs: ManageExerciseInput[] = Array.isArray(exercises) ? exercises : [];
    validateExercises(exerciseInputs);

    const resolvedChapterId = await resolveShortId('chapters', chapterId);
    if (!resolvedChapterId) return notFound(res, '章节不存在');

    const chapterExists = await prisma.chapters.findUnique({
      where: { id: resolvedChapterId, is_delete: 0 }
    });
    if (!chapterExists) return notFound(res, '章节不存在');

    let finalOrder: number;
    if (sortOrder !== undefined && sortOrder !== '') {
      finalOrder = parseInt(sortOrder);
    } else {
      const maxOrder = await prisma.lessons.aggregate({
        where: { chapter_id: resolvedChapterId, is_delete: 0 },
        _max: { order: true }
      });
      finalOrder = (maxOrder._max.order || 0) + 1;
    }

    let result: {
      lesson: Awaited<ReturnType<TransactionClient['lessons']['create']>>;
      exercises: Awaited<ReturnType<TransactionClient['exercises']['create']>>[];
    } | null = null;
    let retryCount = 0;
    const MAX_RETRY = 10;

    while (retryCount < MAX_RETRY) {
      try {
        result = await prisma.$transaction(async (tx) => {
          let lesson = await tx.lessons.create({
            data: {
              chapter_id: resolvedChapterId,
              title: lessonName.trim(),
              content: content || '',
              difficulty: Number(difficulty) || 0,
              order: finalOrder,
              estimated_time: Number(estimatedTime) || 0
            }
          });

          const createdExercises = [];
          const exerciseIdMap = new Map<string, string>();

          for (let index = 0; index < exerciseInputs.length; index += 1) {
            const input = exerciseInputs[index];
            const exercise = await tx.exercises.create({
              data: {
                lesson_id: lesson.id,
                ...getExerciseWriteData(input, lesson.difficulty),
                source: 'static',
                order: index + 1,
              }
            });
            createdExercises.push(exercise);

            if (input.id) {
              exerciseIdMap.set(input.id, exercise.id);
            }
          }

          const rewrittenContent = replaceExerciseReferences(lesson.content || '', exerciseIdMap);
          if (rewrittenContent !== lesson.content) {
            lesson = await tx.lessons.update({
              where: { id: lesson.id },
              data: { content: rewrittenContent },
            });
          }

          await updateCourseProgressForNewLesson(tx, chapterExists.course_id);

          return { lesson, exercises: createdExercises };
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

    if (!result) {
      return fail(res, '创建小节失败');
    }

    const { lesson, exercises: createdExercises } = result;

    return success(res, {
      id: uuidToShortId(lesson.id),
      courseId: uuidToShortId(chapterExists.course_id),
      courseName: '',
      chapterId: uuidToShortId(lesson.chapter_id),
      chapterName: chapterExists.title,
      lessonName: lesson.title,
      content: lesson.content || '',
      exercises: createdExercises.map(serializeManageExercise),
      difficulty: lesson.difficulty,
      sortOrder: lesson.order,
      estimatedTime: lesson.estimated_time,
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
    if (error instanceof LessonInputError) {
      return badRequest(res, error.message);
    }

    return fail(res, `创建小节失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resolvedLessonId = await resolveShortId('lessons', id);
    if (!resolvedLessonId) return notFound(res, '小节不存在');

    const existing = await prisma.lessons.findUnique({
      where: { id: resolvedLessonId, is_delete: 0 }
    });
    if (!existing) return notFound(res, '小节不存在');

    const { lessonName, content, difficulty, sortOrder, estimatedTime, exercises } = req.body;
    const exerciseInputs: ManageExerciseInput[] | null = Array.isArray(exercises)
      ? exercises
      : null;
    if (exerciseInputs) {
      validateExercises(exerciseInputs);
    }

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
    if (estimatedTime !== undefined) {
      updateData.estimated_time = Number(estimatedTime) || 0;
    }

    const { lesson, exercises: updatedExercises } = await prisma.$transaction(async (tx) => {
      let lesson = await tx.lessons.update({
        where: { id: resolvedLessonId },
        data: updateData
      });

      if (!exerciseInputs) {
        const currentExercises = await tx.exercises.findMany({
          where: { lesson_id: resolvedLessonId, is_delete: 0 },
          orderBy: { order: 'asc' }
        });
        return { lesson, exercises: currentExercises };
      }

      const currentExercises = await tx.exercises.findMany({
        where: { lesson_id: resolvedLessonId, is_delete: 0 },
        orderBy: { order: 'asc' }
      });
      const currentById = new Map(currentExercises.map((exercise) => [exercise.id, exercise]));
      const retainedIds = new Set<string>();
      const exerciseReferenceMap = new Map<string, string>();
      const shortIdCounts = new Map<string, number>();

      currentExercises.forEach((exercise) => {
        const shortId = uuidToShortId(exercise.id);
        shortIdCounts.set(shortId, (shortIdCounts.get(shortId) || 0) + 1);
      });
      currentExercises.forEach((exercise) => {
        const shortId = uuidToShortId(exercise.id);
        if (shortIdCounts.get(shortId) === 1) {
          exerciseReferenceMap.set(shortId, exercise.id);
        }
      });

      const savedExercises = [];
      for (let index = 0; index < exerciseInputs.length; index += 1) {
        const input = exerciseInputs[index];
        const requestId = input.id || '';
        const currentExercise = requestId ? currentById.get(requestId) : undefined;

        if (currentExercise) {
          const exercise = await tx.exercises.update({
            where: { id: currentExercise.id },
            data: {
              ...getExerciseWriteData(input, lesson.difficulty),
              source: currentExercise.source || 'static',
              order: index + 1,
            }
          });
          retainedIds.add(exercise.id);
          savedExercises.push(exercise);
          continue;
        }

        if (requestId && !requestId.startsWith(CLIENT_EXERCISE_ID_PREFIX)) {
          if (!UUID_PATTERN.test(requestId)) {
            throw new LessonInputError(`题目 ${index + 1} 的 ID 无效，请刷新页面后重试`);
          }

          const referencedExercise = await tx.exercises.findUnique({
            where: { id: requestId },
            select: { lesson_id: true, is_delete: true }
          });
          if (referencedExercise?.lesson_id !== resolvedLessonId) {
            throw new LessonInputError(`题目 ${index + 1} 不属于当前小节`);
          }
          throw new LessonInputError(`题目 ${index + 1} 已失效，请刷新页面后重试`);
        }

        const exercise = await tx.exercises.create({
          data: {
            lesson_id: resolvedLessonId,
            ...getExerciseWriteData(input, lesson.difficulty),
            source: 'static',
            order: index + 1,
          }
        });
        retainedIds.add(exercise.id);
        savedExercises.push(exercise);

        if (requestId) {
          exerciseReferenceMap.set(requestId, exercise.id);
        }
      }

      await tx.exercises.updateMany({
        where: {
          lesson_id: resolvedLessonId,
          is_delete: 0,
          id: { notIn: [...retainedIds] }
        },
        data: { is_delete: 1 }
      });

      const rewrittenContent = replaceExerciseReferences(lesson.content || '', exerciseReferenceMap);
      if (rewrittenContent !== lesson.content) {
        lesson = await tx.lessons.update({
          where: { id: resolvedLessonId },
          data: { content: rewrittenContent }
        });
      }

      return { lesson, exercises: savedExercises };
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
      content: lesson.content || '',
      exercises: updatedExercises.map(serializeManageExercise),
      difficulty: lesson.difficulty,
      sortOrder: lesson.order,
      estimatedTime: lesson.estimated_time,
      exerciseCount: updatedExercises.length,
      createdAt: lesson.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: lesson.updated_at.toISOString().replace('T', ' ').slice(0, 19)
    });
  } catch (error) {
    console.error('更新小节失败:', error);
    if (error instanceof LessonInputError) {
      return badRequest(res, error.message);
    }
    if ((error as any)?.code === 'P2002') {
      return fail(res, '数据重复：当前章节中已存在相同排序');
    }
    return fail(res, `更新小节失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resolvedLessonId = await resolveShortId('lessons', id);
    if (!resolvedLessonId) return notFound(res, '小节不存在');

    const existing = await prisma.lessons.findUnique({
      where: { id: resolvedLessonId, is_delete: 0 }
    });
    if (!existing) return notFound(res, '小节不存在');

    await prisma.$transaction(async (tx) => {
      await tx.lessons.update({
        where: { id: resolvedLessonId },
        data: { is_delete: 1 }
      });

      await tx.exercises.updateMany({
        where: { lesson_id: resolvedLessonId },
        data: { is_delete: 1 }
      });
    });

    return success(res, null);
  } catch (error) {
    console.error('删除小节失败:', error);
    return fail(res, '删除小节失败');
  }
};

async function updateCourseProgressForNewLesson(
  tx: TransactionClient,
  courseId: string
): Promise<void> {
  const chapterIds = (await tx.chapters.findMany({
    where: { course_id: courseId, is_delete: 0 },
    select: { id: true },
  })).map(ch => ch.id);

  const totalLessons = await tx.lessons.count({
    where: {
      chapter_id: { in: chapterIds },
      is_delete: 0,
    },
  });

  const progressRecords = await tx.courses_progress.findMany({
    where: {
      course_id: courseId,
      is_delete: 0,
    },
  });

  for (const record of progressRecords) {
    const newStatus = record.status === 2 ? 1 : record.status;

    await tx.courses_progress.update({
      where: { id: record.id },
      data: {
        total_lessons: totalLessons,
        status: newStatus,
        updated_at: new Date(),
      },
    });
  }
}
