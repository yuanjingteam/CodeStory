import { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import {
  completeKnowledgeIndexes,
  invalidateKnowledgeSource,
  queueKnowledgeSource,
  type KnowledgeIndexTicket,
} from '../rag';
import {
  createExerciseContentFingerprint,
  lockLessonExerciseWrites,
} from '../courses/exercise-write-guards';
import {
  findChoiceExerciseWriteIssue,
  type ChoiceExerciseIssue,
} from '../courses/choice-exercise-integrity';
import { recordAiFeedbackEvent } from '../ai/ai-feedback.service';

export type ExerciseReviewStatus = 'draft' | 'approved' | 'rejected';
export type ExerciseType = 'single_choice' | 'code';

export interface ExerciseManageWriteInput {
  lessonId?: string;
  type: ExerciseType;
  content: string;
  answer: string;
  analysis: string;
  knowledge: string;
  difficulty: number;
  source: string;
  metadata: unknown;
}

export interface ExerciseManageListQuery {
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
  type?: ExerciseType;
  difficulty?: number;
  source?: string;
  reviewStatus?: ExerciseReviewStatus;
  keyword?: string;
  queue?: boolean;
  page: number;
  size: number;
}

export class ExerciseManageError extends Error {
  constructor(
    public readonly code: string,
    public readonly publicMessage: string,
    public readonly status: 400 | 404 | 409 = 400
  ) {
    super(code);
  }
}

function normalizeText(value: unknown, field: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new ExerciseManageError(
      'EXERCISE_FIELD_REQUIRED',
      `${field}不能为空。`
    );
  }
  return normalized;
}

// 规则统一由 choice-exercise-integrity 提供，这里只负责映射回既有错误码。
function throwChoiceIssue(issue: ChoiceExerciseIssue): never {
  if (issue === 'OPTIONS_MISSING') {
    throw new ExerciseManageError(
      'EXERCISE_OPTIONS_REQUIRED',
      '选择题至少需要两个选项。'
    );
  }
  if (issue === 'ANSWER_BLANK' || issue === 'ANSWER_NOT_IN_OPTIONS') {
    throw new ExerciseManageError(
      'EXERCISE_ANSWER_INVALID',
      '选择题答案必须与一个选项完全一致。'
    );
  }
  throw new ExerciseManageError(
    'EXERCISE_OPTIONS_INVALID',
    '选择题至少需要两个非空且不重复的选项。'
  );
}

export function assertChoiceExerciseWritable(row: {
  answer: string | null;
  metadata: unknown;
}): void {
  const issue = findChoiceExerciseWriteIssue(row);
  if (issue) throwChoiceIssue(issue);
}

export function validateExerciseManageInput(
  input: ExerciseManageWriteInput,
  options: { requireLessonId: boolean }
): ExerciseManageWriteInput {
  const lessonId = String(input.lessonId ?? '').trim();
  if (options.requireLessonId && !lessonId) {
    throw new ExerciseManageError(
      'EXERCISE_LESSON_REQUIRED',
      '请选择所属小节。'
    );
  }
  if (input.type !== 'single_choice' && input.type !== 'code') {
    throw new ExerciseManageError(
      'EXERCISE_TYPE_UNSUPPORTED',
      '题型仅支持选择题和编程题。'
    );
  }
  const difficulty = Number(input.difficulty);
  if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > 2) {
    throw new ExerciseManageError(
      'EXERCISE_DIFFICULTY_INVALID',
      '难度必须是 0、1 或 2。'
    );
  }
  const source = normalizeText(input.source, '来源').slice(0, 20);
  if (source === 'ai' && options.requireLessonId) {
    throw new ExerciseManageError(
      'EXERCISE_AI_SOURCE_RESERVED',
      '手工录入不能伪装为 AI 生成题。'
    );
  }

  const metadata =
    input.metadata && typeof input.metadata === 'object'
      ? input.metadata
      : {};
  const answer = normalizeText(input.answer, '答案');
  if (input.type === 'single_choice') {
    const optionsValue = (metadata as { options?: unknown }).options;
    if (!Array.isArray(optionsValue)) {
      throw new ExerciseManageError(
        'EXERCISE_OPTIONS_REQUIRED',
        '选择题至少需要两个选项。'
      );
    }
    // 先 trim 再判定：存进去的就是 trim 后的值，与读取侧的不 trim 语义一致。
    const optionsList = optionsValue.map((option) =>
      String(option).trim()
    );
    assertChoiceExerciseWritable({ answer, metadata: { options: optionsList } });
  }

  return {
    lessonId,
    type: input.type,
    content: normalizeText(input.content, '题目描述'),
    answer,
    analysis: normalizeText(input.analysis, '题目解析'),
    knowledge: normalizeText(input.knowledge, '知识点'),
    difficulty,
    source,
    metadata,
  };
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getWriteData(input: ExerciseManageWriteInput) {
  return {
    type: input.type,
    content: input.content,
    answer: input.answer,
    analysis: input.analysis,
    knowledge: input.knowledge,
    difficulty: input.difficulty,
    source: input.source,
    metadata: toJsonInput(input.metadata),
  };
}

type ExerciseWithHierarchy = Prisma.exercisesGetPayload<{
  include: {
    lessons: {
      include: {
        chapters: { include: { courses: true } };
      };
    };
  };
}>;

function serializeExercise(exercise: ExerciseWithHierarchy) {
  const createdAt = exercise.created_at;
  return {
    id: exercise.id,
    lessonId: exercise.lesson_id,
    lessonName: exercise.lessons.title,
    chapterId: exercise.lessons.chapter_id,
    chapterName: exercise.lessons.chapters.title,
    courseId: exercise.lessons.chapters.course_id,
    courseName: exercise.lessons.chapters.courses.title,
    type: exercise.type,
    content: exercise.content,
    answer: exercise.answer,
    analysis: exercise.analysis || '',
    knowledge: exercise.knowledge || '',
    difficulty: exercise.difficulty,
    source: exercise.source || 'static',
    reviewStatus: exercise.review_status as ExerciseReviewStatus,
    metadata: exercise.metadata,
    genMetadata: exercise.gen_metadata,
    order: exercise.order,
    waitSeconds:
      exercise.review_status === 'draft'
        ? Math.max(
            0,
            Math.floor((Date.now() - createdAt.getTime()) / 1_000)
          )
        : 0,
    createdAt: createdAt.toISOString(),
    updatedAt: exercise.updated_at.toISOString(),
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new ExerciseManageError(
      'EXERCISE_UUID_INVALID',
      `${label} ID 无效，请刷新页面后重试。`,
      404
    );
  }
  return value;
}

const hierarchyInclude = {
  lessons: {
    include: {
      chapters: { include: { courses: true } },
    },
  },
} satisfies Prisma.exercisesInclude;

async function resolveOptionalScope(
  table: 'courses' | 'chapters' | 'lessons',
  value: string | undefined,
  label: string
): Promise<string | undefined> {
  if (!value) return undefined;
  const resolved = requireUuid(value, label);
  const exists =
    table === 'courses'
      ? await prisma.courses.findFirst({
          where: { id: resolved, is_delete: 0 },
          select: { id: true },
        })
      : table === 'chapters'
        ? await prisma.chapters.findFirst({
            where: { id: resolved, is_delete: 0 },
            select: { id: true },
          })
        : await prisma.lessons.findFirst({
            where: { id: resolved, is_delete: 0 },
            select: { id: true },
          });
  if (!exists) {
    throw new ExerciseManageError(
      'EXERCISE_SCOPE_INVALID',
      `${label}不存在或已删除。`
    );
  }
  return resolved;
}

export async function listManagedExercises(
  query: ExerciseManageListQuery
) {
  const [courseId, chapterId, lessonId] = await Promise.all([
    resolveOptionalScope('courses', query.courseId, '课程'),
    resolveOptionalScope('chapters', query.chapterId, '章节'),
    resolveOptionalScope('lessons', query.lessonId, '小节'),
  ]);
  const where: Prisma.exercisesWhereInput = {
    is_delete: 0,
    lessons: {
      is_delete: 0,
      ...(lessonId ? { id: lessonId } : {}),
      chapters: {
        is_delete: 0,
        ...(chapterId ? { id: chapterId } : {}),
        ...(courseId ? { course_id: courseId } : {}),
        courses: { is_delete: 0 },
      },
    },
  };
  if (query.type) where.type = query.type;
  if (query.difficulty !== undefined) {
    where.difficulty = query.difficulty;
  }
  if (query.source) where.source = query.source;
  if (query.queue) {
    where.review_status = 'draft';
  } else if (query.reviewStatus) {
    where.review_status = query.reviewStatus;
  }
  if (query.keyword) {
    where.OR = [
      { content: { contains: query.keyword } },
      { knowledge: { contains: query.keyword } },
      { analysis: { contains: query.keyword } },
    ];
  }

  const [total, exercises] = await Promise.all([
    prisma.exercises.count({ where }),
    prisma.exercises.findMany({
      where,
      include: hierarchyInclude,
      orderBy: query.queue
        ? [{ created_at: 'asc' }]
        : [{ created_at: 'desc' }],
      skip: (query.page - 1) * query.size,
      take: query.size,
    }),
  ]);
  return {
    total,
    data: exercises.map(serializeExercise),
    pendingCount: await prisma.exercises.count({
      where: {
        is_delete: 0,
        review_status: 'draft',
        lessons: {
          is_delete: 0,
          chapters: { is_delete: 0, courses: { is_delete: 0 } },
        },
      },
    }),
    oldestPendingCreatedAt: await prisma.exercises
      .findFirst({
        where: {
          is_delete: 0,
          review_status: 'draft',
          lessons: {
            is_delete: 0,
            chapters: { is_delete: 0, courses: { is_delete: 0 } },
          },
        },
        orderBy: { created_at: 'asc' },
        select: { created_at: true },
      })
      .then((item) => item?.created_at.toISOString() || null),
  };
}

export async function getManagedExercise(id: string) {
  const exerciseId = requireUuid(id, '题目');
  const exercise = await prisma.exercises.findFirst({
    where: {
      id: exerciseId,
      is_delete: 0,
      lessons: {
        is_delete: 0,
        chapters: { is_delete: 0, courses: { is_delete: 0 } },
      },
    },
    include: hierarchyInclude,
  });
  return exercise ? serializeExercise(exercise) : null;
}

async function assertActiveLesson(lessonIdInput: string) {
  const lessonId = requireUuid(lessonIdInput, '小节');
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
  if (!lesson) {
    throw new ExerciseManageError(
      'EXERCISE_LESSON_NOT_FOUND',
      '所属小节不存在或已删除。',
      404
    );
  }
  return lesson.id;
}

export async function createManagedExercise(
  rawInput: ExerciseManageWriteInput
) {
  const input = validateExerciseManageInput(rawInput, {
    requireLessonId: true,
  });
  const lessonId = await assertActiveLesson(input.lessonId!);
  const { exercise, ticket } = await prisma.$transaction(
    async (tx) => {
      await lockLessonExerciseWrites(tx, lessonId);
      const maxOrder = await tx.exercises.aggregate({
        where: { lesson_id: lessonId, is_delete: 0 },
        _max: { order: true },
      });
      const exercise = await tx.exercises.create({
        data: {
          lesson_id: lessonId,
          ...getWriteData(input),
          review_status: 'approved',
          gen_metadata: Prisma.JsonNull,
          hints: Prisma.JsonNull,
          order: (maxOrder._max.order || 0) + 1,
        },
      });
      const ticket = await queueKnowledgeSource(
        tx,
        'exercise',
        exercise.id,
        exercise.updated_at
      );
      return { exercise, ticket };
    }
  );
  const indexing = await completeKnowledgeIndexes([ticket]);
  return {
    exercise: await getManagedExercise(exercise.id),
    indexStatus: indexing.status,
  };
}

export async function updateManagedExercise(
  id: string,
  rawInput: ExerciseManageWriteInput,
  actorUserId?: string
) {
  const exerciseId = requireUuid(id, '题目');
  const existing = await prisma.exercises.findFirst({
    where: { id: exerciseId, is_delete: 0 },
  });
  if (!existing) {
    throw new ExerciseManageError(
      'EXERCISE_NOT_FOUND',
      '题目不存在或已删除。',
      404
    );
  }
  const input = validateExerciseManageInput(
    {
      ...rawInput,
      lessonId: rawInput.lessonId || existing.lesson_id,
      source: existing.source === 'ai' ? 'ai' : rawInput.source,
    },
    { requireLessonId: false }
  );
  const targetLessonId = await assertActiveLesson(input.lessonId!);
  let ticket: KnowledgeIndexTicket | null = null;
  await prisma.$transaction(async (tx) => {
    await lockLessonExerciseWrites(tx, targetLessonId);
    const updated = await tx.exercises.update({
      where: { id: exerciseId },
      data: {
        lesson_id: targetLessonId,
        ...getWriteData(input),
        generation_fingerprint: existing.source === 'ai'
          ? createExerciseContentFingerprint(input.content)
          : null,
        source: existing.source === 'ai' ? 'ai' : input.source,
      },
    });
    if (updated.review_status === 'approved') {
      ticket = await queueKnowledgeSource(
        tx,
        'exercise',
        updated.id,
        updated.updated_at
      );
    } else {
      await invalidateKnowledgeSource(tx, 'exercise', updated.id);
    }
    if (actorUserId && existing.source === 'ai') {
      await recordAiFeedbackEvent({
        userId: actorUserId,
        scene: 'exercise-review',
        eventType: 'exercise_edited',
        targetType: 'exercise',
        targetId: exerciseId,
        metadata: { source: 'ai' },
        client: tx,
      });
    }
  });
  const indexing = ticket
    ? await completeKnowledgeIndexes([ticket])
    : { status: 'not_indexed' as const };
  return {
    exercise: await getManagedExercise(exerciseId),
    indexStatus: indexing.status,
  };
}

export async function reviewManagedExercise(
  id: string,
  action: 'approve' | 'reject',
  rawInput?: ExerciseManageWriteInput,
  actorUserId?: string
) {
  const exerciseId = requireUuid(id, '题目');
  let ticket: KnowledgeIndexTicket | null = null;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.exercises.findFirst({
      where: {
        id: exerciseId,
        is_delete: 0,
        lessons: {
          is_delete: 0,
          chapters: { is_delete: 0, courses: { is_delete: 0 } },
        },
      },
    });
    if (!existing) {
      throw new ExerciseManageError(
        'EXERCISE_NOT_FOUND',
        '题目不存在或已删除。',
        404
      );
    }

    let editData: ReturnType<typeof getWriteData> | undefined;
    let lessonId = existing.lesson_id;
    if (rawInput) {
      const input = validateExerciseManageInput(
        {
          ...rawInput,
          lessonId: rawInput.lessonId || existing.lesson_id,
          source: 'ai',
        },
        { requireLessonId: false }
      );
      lessonId = await assertActiveLesson(input.lessonId!);
      editData = getWriteData(input);
    } else if (
      action === 'approve' &&
      existing.type === 'single_choice'
    ) {
      // 「直接采用」不带编辑负载，此前 draft → approved 零校验。这里只复校
      // 选项与答案：不整套重跑 validateExerciseManageInput，它还要求
      // analysis/knowledge/source 非空，会因与「能不能答」无关的理由拒掉草稿。
      // reject 保持不校验——必须永远能拒垃圾。
      assertChoiceExerciseWritable(existing);
    }

    const updated = await tx.exercises.updateMany({
      where: {
        id: exerciseId,
        is_delete: 0,
        review_status: 'draft',
      },
      data: {
        ...(editData || {}),
        lesson_id: lessonId,
        source: 'ai',
        review_status: action === 'approve' ? 'approved' : 'rejected',
      },
    });
    if (updated.count !== 1) {
      throw new ExerciseManageError(
        'EXERCISE_REVIEW_CONFLICT',
        '该题目的审核结论已更新，请刷新列表后重试。',
        409
      );
    }
    const current = await tx.exercises.findUniqueOrThrow({
      where: { id: exerciseId },
    });
    if (action === 'approve') {
      ticket = await queueKnowledgeSource(
        tx,
        'exercise',
        current.id,
        current.updated_at
      );
    } else {
      await invalidateKnowledgeSource(tx, 'exercise', current.id);
    }
    if (actorUserId) {
      await recordAiFeedbackEvent({
        userId: actorUserId,
        scene: 'exercise-review',
        eventType: action === 'reject'
          ? 'exercise_rejected'
          : rawInput
            ? 'exercise_edited_and_approved'
            : 'exercise_approved',
        targetType: 'exercise',
        targetId: exerciseId,
        metadata: { action, edited: Boolean(rawInput) },
        client: tx,
      });
    }
  });

  const indexing = ticket
    ? await completeKnowledgeIndexes([ticket])
    : { status: 'not_indexed' as const };
  return {
    exercise: await getManagedExercise(exerciseId),
    indexStatus: indexing.status,
  };
}

export async function deleteManagedExercise(id: string) {
  const exerciseId = requireUuid(id, '题目');
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.exercises.updateMany({
      where: { id: exerciseId, is_delete: 0 },
      data: { is_delete: 1, deleted_at: new Date() },
    });
    if (result.count === 1) {
      await invalidateKnowledgeSource(tx, 'exercise', exerciseId);
    }
    return result.count;
  });
  if (updated !== 1) {
    throw new ExerciseManageError(
      'EXERCISE_NOT_FOUND',
      '题目不存在或已删除。',
      404
    );
  }
}
