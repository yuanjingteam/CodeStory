import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import { success, fail, badRequest, notFound } from '../../utils/response';
import { uuidToShortId, resolveShortId } from '../../utils/idTransform';
import { CONTENT_RETENTION_DAYS } from './content-retention.service';
import {
  aggregateKnowledgeIndexSummaries,
  completeKnowledgeIndexes,
  getLessonIndexSummaries,
  getLessonIndexSummary,
  invalidateLessonKnowledge,
  queueLessonKnowledge,
  queueLessonsKnowledge,
  type KnowledgeIndexTicket,
} from '../rag';
import {
  createExerciseContentFingerprint,
  lockLessonExerciseWrites,
} from '../courses/exercise-write-guards';
import { findChoiceExerciseWriteIssue } from '../courses/choice-exercise-integrity';

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
  knowledgeIndexPolicy?: unknown;
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
    knowledge_index_policy: normalizeKnowledgeIndexPolicy(
      exercise.knowledgeIndexPolicy
    ),
  };
}

function normalizeKnowledgeIndexPolicy(
  value: unknown
): 'auto' | 'include' | 'exclude' {
  return value === 'include' || value === 'exclude'
    ? value
    : 'auto';
}

function getPurgeAt(deletedAt: Date | null): string | null {
  if (!deletedAt) return null;
  return new Date(
    deletedAt.getTime() +
      CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000
  ).toISOString();
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
    // 这里此前只查答案非空，从不看 options，而三个写入点都不设 review_status
    // （schema 默认 approved），畸形选择题会直接进入学生可见状态。
    if (exercise.type === 'single_choice') {
      const issue = findChoiceExerciseWriteIssue({
        answer: String(exercise.answer || ''),
        metadata: exercise.metadata,
      });
      if (issue === 'OPTIONS_MISSING' || issue === 'OPTIONS_TOO_FEW') {
        throw new LessonInputError(`${label}至少需要两个选项`);
      }
      if (issue === 'OPTION_BLANK' || issue === 'DUPLICATE_DISTRACTOR') {
        throw new LessonInputError(`${label}的选项不能为空或重复`);
      }
      if (issue) {
        throw new LessonInputError(`${label}的答案必须与一个选项完全一致`);
      }
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
  knowledge_index_policy: string;
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
    knowledgeIndexPolicy: exercise.knowledge_index_policy,
  };
}

export const getLessonList = async (req: Request, res: Response) => {
  try {
    const {
      chapterId,
      courseId,
      keyword,
      difficulty,
      status = 'active',
      page = 1,
      size = 10,
    } = req.query;

    const where: Record<string, any> = {
      is_delete: status === 'deleted' ? 1 : 0,
    };

    if (chapterId && chapterId !== '') {
      const resolvedChapterId = await resolveShortId(
        'chapters',
        String(chapterId),
        { includeDeleted: status === 'deleted' }
      );
      if (!resolvedChapterId) return badRequest(res, '章节不存在');
      where.chapter_id = resolvedChapterId;
    }

    if (courseId && courseId !== '') {
      const resolvedCourseId = await resolveShortId(
        'courses',
        String(courseId),
        { includeDeleted: status === 'deleted' }
      );
      if (!resolvedCourseId) return badRequest(res, '课程不存在');

      const chapters = await prisma.chapters.findMany({
        where: {
          course_id: resolvedCourseId,
          ...(status === 'deleted' ? {} : { is_delete: 0 }),
        },
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
            order: true,
            knowledge_index_policy: true,
            is_delete: true,
            deleted_at: true
          }
        }
      }
    });
    const indexSummaries =
      status === 'deleted'
        ? new Map()
        : await getLessonIndexSummaries(
            lessons.map((lesson) => ({
              id: lesson.id,
        exercises: lesson.exercises
          .filter((exercise) => exercise.is_delete === 0)
          .map((exercise) => ({
            id: exercise.id,
            source: exercise.source,
          })),
            }))
          );

    const data = lessons.map(lesson => ({
      id: uuidToShortId(lesson.id),
      uuid: lesson.id,
      lessonId: uuidToShortId(lesson.id),
      lessonName: lesson.title,
      courseId: uuidToShortId(lesson.chapters?.courses?.id || ''),
      courseUuid: lesson.chapters?.courses?.id || '',
      courseName: lesson.chapters?.courses?.title || '',
      chapterId: uuidToShortId(lesson.chapter_id || ''),
      chapterUuid: lesson.chapter_id || '',
      chapterName: lesson.chapters?.title || '',
      content: lesson.content || '',
      difficulty: lesson.difficulty,
      sortOrder: lesson.order,
      estimatedTime: lesson.estimated_time || 0,
      knowledgeIndexPolicy: lesson.knowledge_index_policy,
      exercises: lesson.exercises
        .filter((exercise) => exercise.is_delete === 0)
        .map(serializeManageExercise),
      deletedExercises: lesson.exercises
        .filter((exercise) => exercise.is_delete === 1)
        .map((exercise) => ({
          ...serializeManageExercise(exercise),
          deletedAt: exercise.deleted_at?.toISOString() || null,
          purgeAt: getPurgeAt(exercise.deleted_at),
        })),
      exerciseCount: lesson.exercises.filter(
        (exercise) => exercise.is_delete === 0
      ).length,
      createdAt: lesson.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: lesson.updated_at.toISOString().replace('T', ' ').slice(0, 19),
      deletedAt: lesson.deleted_at?.toISOString() || null,
      purgeAt: getPurgeAt(lesson.deleted_at),
      indexSummary:
        indexSummaries.get(lesson.id) || {
          status: 'not_indexed',
          totalSources: 0,
          readySources: 0,
          pendingSources: 0,
          failedSources: 0,
          needsContentSources: 0,
          needsReviewSources: 0,
          excludedSources: 0,
          notIndexedSources: 0,
          updatedAt: null,
        },
      indexStatus: indexSummaries.get(lesson.id)?.status || 'not_indexed',
    }));

    return success(res, { total, data });
  } catch (error) {
    console.error('获取小节列表失败:', error);
    return fail(res, '获取小节列表失败');
  }
};

export const createLesson = async (req: Request, res: Response) => {
  try {
    const {
      chapterId,
      lessonName,
      content,
      difficulty,
      sortOrder,
      estimatedTime,
      knowledgeIndexPolicy,
      exercises,
    } = req.body;
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
      indexTickets: KnowledgeIndexTicket[];
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
              estimated_time: Number(estimatedTime) || 0,
              knowledge_index_policy:
                normalizeKnowledgeIndexPolicy(knowledgeIndexPolicy),
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
          const indexTickets = await queueLessonKnowledge(
            tx,
            lesson.id
          );

          return {
            lesson,
            exercises: createdExercises,
            indexTickets,
          };
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

    const {
      lesson,
      exercises: createdExercises,
      indexTickets,
    } = result;
    const indexing = await completeKnowledgeIndexes(indexTickets);
    const indexSummary = await getLessonIndexSummary(lesson.id);

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
      knowledgeIndexPolicy: lesson.knowledge_index_policy,
      exerciseCount: createdExercises.length,
      createdAt: lesson.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: lesson.updated_at.toISOString().replace('T', ' ').slice(0, 19),
      indexStatus: indexing.status,
      indexSummary,
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

    const {
      lessonName,
      content,
      difficulty,
      sortOrder,
      estimatedTime,
      knowledgeIndexPolicy,
      exercises,
    } = req.body;
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
    if (knowledgeIndexPolicy !== undefined) {
      updateData.knowledge_index_policy =
        normalizeKnowledgeIndexPolicy(knowledgeIndexPolicy);
    }

    const {
      lesson,
      exercises: updatedExercises,
      indexTickets,
    } = await prisma.$transaction(async (tx) => {
      await lockLessonExerciseWrites(tx, resolvedLessonId);
      let lesson = await tx.lessons.update({
        where: { id: resolvedLessonId },
        data: updateData
      });

      if (!exerciseInputs) {
        const currentExercises = await tx.exercises.findMany({
          where: { lesson_id: resolvedLessonId, is_delete: 0 },
          orderBy: { order: 'asc' }
        });
        const indexTickets = await queueLessonKnowledge(
          tx,
          resolvedLessonId
        );
        return {
          lesson,
          exercises: currentExercises,
          indexTickets,
        };
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
          const writeData = getExerciseWriteData(
            input,
            lesson.difficulty
          );
          if (input.knowledgeIndexPolicy === undefined) {
            writeData.knowledge_index_policy =
              normalizeKnowledgeIndexPolicy(
                currentExercise.knowledge_index_policy
              );
          }
          const exercise = await tx.exercises.update({
            where: { id: currentExercise.id },
            data: {
              ...writeData,
              source: currentExercise.source || 'static',
              generation_fingerprint: currentExercise.source === 'ai'
                ? createExerciseContentFingerprint(writeData.content)
                : null,
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
          id: { notIn: [...retainedIds] },
          OR: [{ source: null }, { source: { not: 'ai' } }],
        },
        data: { is_delete: 1, deleted_at: new Date() }
      });

      const rewrittenContent = replaceExerciseReferences(lesson.content || '', exerciseReferenceMap);
      if (rewrittenContent !== lesson.content) {
        lesson = await tx.lessons.update({
          where: { id: resolvedLessonId },
          data: { content: rewrittenContent }
        });
      }

      const indexTickets = await queueLessonKnowledge(
        tx,
        resolvedLessonId
      );
      return {
        lesson,
        exercises: savedExercises,
        indexTickets,
      };
    });
    const indexing = await completeKnowledgeIndexes(indexTickets);
    const indexSummary = await getLessonIndexSummary(lesson.id);

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
      knowledgeIndexPolicy: lesson.knowledge_index_policy,
      exerciseCount: updatedExercises.length,
      createdAt: lesson.created_at.toISOString().replace('T', ' ').slice(0, 19),
      updateAt: lesson.updated_at.toISOString().replace('T', ' ').slice(0, 19),
      indexStatus: indexing.status,
      indexSummary,
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

export const reindexLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const lessonId = await resolveShortId('lessons', id, {
      includeDeleted: true,
    });
    if (!lessonId) return notFound(res, '小节不存在');
    const lesson = await prisma.lessons.findFirst({
      where: {
        id: lessonId,
        is_delete: 0,
        chapters: {
          is_delete: 0,
          courses: { is_delete: 0 },
        },
      },
      select: { id: true },
    });
    if (!lesson) return notFound(res, '小节不存在');

    const tickets = await prisma.$transaction((tx) =>
      queueLessonKnowledge(tx, lesson.id)
    );
    const indexing = await completeKnowledgeIndexes(tickets);
    const indexSummary = await getLessonIndexSummary(lesson.id);
    return success(res, {
      lessonId: uuidToShortId(lesson.id),
      sourceCount: tickets.length,
      readyCount: indexing.results.filter(
        (result) => result.status === 'ready'
      ).length,
      failedCount: indexing.results.filter(
        (result) => result.status === 'failed'
      ).length,
      indexStatus: indexSummary.status,
      indexSummary,
    });
  } catch (error) {
    console.error('重新索引小节失败:', error);
    return fail(res, '重新索引小节失败');
  }
};

export const reindexLessonsBatch = async (
  req: Request,
  res: Response
) => {
  try {
    const { courseId, chapterId, keyword, difficulty } = req.body;
    if (!courseId && !chapterId) {
      return badRequest(res, '批量索引必须指定课程或章节范围');
    }

    let resolvedCourseId: string | undefined;
    let resolvedChapterId: string | undefined;
    if (courseId) {
      resolvedCourseId =
        (await resolveShortId('courses', String(courseId))) ||
        undefined;
      if (!resolvedCourseId) return badRequest(res, '课程不存在');
    }
    if (chapterId) {
      resolvedChapterId =
        (await resolveShortId('chapters', String(chapterId))) ||
        undefined;
      if (!resolvedChapterId) return badRequest(res, '章节不存在');
    }

    const chapterIds = resolvedChapterId
      ? [resolvedChapterId]
      : (
          await prisma.chapters.findMany({
            where: {
              course_id: resolvedCourseId!,
              is_delete: 0,
              courses: { is_delete: 0 },
            },
            select: { id: true },
          })
        ).map((chapter) => chapter.id);
    if (resolvedCourseId && resolvedChapterId) {
      const belongsToCourse = await prisma.chapters.findFirst({
        where: {
          id: resolvedChapterId,
          course_id: resolvedCourseId,
          is_delete: 0,
        },
        select: { id: true },
      });
      if (!belongsToCourse) {
        return badRequest(res, '章节不属于指定课程');
      }
    }

    const where: Prisma.lessonsWhereInput = {
      is_delete: 0,
      chapter_id: { in: chapterIds },
      chapters: {
        is_delete: 0,
        courses: { is_delete: 0 },
      },
    };
    const normalizedKeyword = String(keyword || '').trim();
    if (normalizedKeyword) {
      where.OR = [
        { title: { contains: normalizedKeyword } },
        { content: { contains: normalizedKeyword } },
      ];
    }
    if (
      difficulty !== undefined &&
      difficulty !== null &&
      difficulty !== ''
    ) {
      where.difficulty = Number(difficulty);
    }

    const lessons = await prisma.lessons.findMany({
      where,
      select: { id: true },
      orderBy: { created_at: 'asc' },
    });
    const tickets = await prisma.$transaction((tx) =>
      queueLessonsKnowledge(
        tx,
        lessons.map((lesson) => lesson.id)
      )
    );
    const indexing = await completeKnowledgeIndexes(tickets);
    const summaries = await Promise.all(
      lessons.map((lesson) => getLessonIndexSummary(lesson.id))
    );
    const indexSummary =
      aggregateKnowledgeIndexSummaries(summaries);
    const readyCount = indexing.results.filter(
      (result) => result.status === 'ready'
    ).length;
    const failedCount = indexing.results.filter(
      (result) => result.status === 'failed'
    ).length;

    return success(res, {
      lessonCount: lessons.length,
      sourceCount: tickets.length,
      readyCount,
      failedCount,
      indexStatus: indexSummary.status,
      indexSummary,
    });
  } catch (error) {
    console.error('批量重新索引小节失败:', error);
    return fail(res, '批量重新索引小节失败');
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
        data: { is_delete: 1, deleted_at: new Date() }
      });
      await invalidateLessonKnowledge(tx, resolvedLessonId);
    });

    return success(res, null);
  } catch (error) {
    console.error('删除小节失败:', error);
    return fail(res, '删除小节失败');
  }
};

export const restoreLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const lessonId = await resolveShortId('lessons', id, {
      includeDeleted: true,
    });
    if (!lessonId) return notFound(res, '小节不存在');
    const lesson = await prisma.lessons.findUnique({
      where: { id: lessonId },
      include: {
        chapters: { include: { courses: true } },
      },
    });
    if (!lesson || lesson.is_delete !== 1) {
      return notFound(res, '已删除小节不存在');
    }
    if (
      lesson.chapters.is_delete !== 0 ||
      lesson.chapters.courses.is_delete !== 0
    ) {
      return badRequest(res, '请先恢复所属课程和章节');
    }

    const tickets = await prisma.$transaction(async (tx) => {
      await tx.lessons.update({
        where: { id: lessonId },
        data: { is_delete: 0, deleted_at: null },
      });
      return queueLessonKnowledge(tx, lessonId);
    });
    await completeKnowledgeIndexes(tickets);
    return success(res, {
      lessonId: uuidToShortId(lessonId),
      indexSummary: await getLessonIndexSummary(lessonId),
    });
  } catch (error) {
    console.error('恢复小节失败:', error);
    return fail(res, '恢复小节失败');
  }
};

export const restoreExercise = async (
  req: Request,
  res: Response
) => {
  try {
    const { id, exerciseId } = req.params as {
      id: string;
      exerciseId: string;
    };
    const lessonId = await resolveShortId('lessons', id);
    if (!lessonId || !UUID_PATTERN.test(exerciseId)) {
      return notFound(res, '题目不存在');
    }
    const exercise = await prisma.exercises.findFirst({
      where: {
        id: exerciseId,
        lesson_id: lessonId,
        is_delete: 1,
        lessons: {
          is_delete: 0,
          chapters: {
            is_delete: 0,
            courses: { is_delete: 0 },
          },
        },
      },
    });
    if (!exercise) return notFound(res, '已删除题目不存在');

    const tickets = await prisma.$transaction(async (tx) => {
      await tx.exercises.update({
        where: { id: exercise.id },
        data: { is_delete: 0, deleted_at: null },
      });
      return queueLessonKnowledge(tx, lessonId);
    });
    await completeKnowledgeIndexes(tickets);
    return success(res, {
      exerciseId: exercise.id,
      indexSummary: await getLessonIndexSummary(lessonId),
    });
  } catch (error) {
    console.error('恢复题目失败:', error);
    return fail(res, '恢复题目失败');
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
