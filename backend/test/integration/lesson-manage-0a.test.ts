// 阶段 0A 收尾 · 集成测试 ①：题目增量更新与事务回滚
// 迁移自 scripts/check-lesson-manage-0a.ts（check:0a-db）
// 文档 5.2 集成测试 ① 验收归属：前置项 A / 阶段 0A
// 覆盖失败模式：半成品小节、题目 ID 漂移、跨小节串改
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Request, Response } from 'express';
import prisma from '../../src/config/prisma';
import {
  createLesson,
  updateLesson,
} from '../../src/services/course-manage/lesson-manage';
import { uuidToShortId } from '../../src/utils/idTransform';

interface ApiResult<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// 直接调用 (req, res) => Promise 形式的 handler，绕过 HTTP 层
// 这测的是 service 层的事务行为，符合集成测试 ① 的目标
async function invoke<T = unknown>(
  handler: (req: Request, res: Response) => Promise<unknown>,
  input: { params?: Record<string, string>; body?: Record<string, unknown> }
): Promise<ApiResult<T>> {
  let result: ApiResult<T> | null = null;
  const response = {
    json(payload: ApiResult<T>) {
      result = payload;
      return payload;
    },
  } as unknown as Response;

  await handler(
    {
      params: input.params || {},
      body: input.body || {},
      query: {},
    } as Request,
    response
  );

  if (!result) throw new Error('接口没有返回结果');
  return result;
}

// 安全护栏：拒绝在非测试库运行（与原 assertSafeTestDatabase 一致）
function assertSafeTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;
  expect(databaseUrl, '缺少 DATABASE_URL').toBeDefined();
  const databaseName = new URL(databaseUrl as string).pathname.slice(1);
  expect(
    databaseName,
    `拒绝在非测试库 "${databaseName}" 上运行`
  ).toMatch(/(^|[_-])test($|[_-])/i);
}

// 构造一个 UUID，使其前 2 位 + 后 3 位与给定的短 ID 一致（用于碰撞场景）
function createShortIdCollisionUuid(shortId: string): string {
  const prefix = shortId.slice(0, 2);
  const suffix = shortId.slice(-3);
  return `${prefix}000000-0000-4000-8000-000000000${suffix}`;
}

const MARKER = `0a_${Date.now()}`;
let courseId: string | null = null;
let userId: string | null = null;

beforeAll(() => {
  assertSafeTestDatabase();
});

afterAll(async () => {
  if (courseId) {
    await prisma.courses.deleteMany({ where: { id: courseId } });
  }
  if (userId) {
    await prisma.users.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe('集成测试 ① · 前置项 A · 题目稳定 ID 与事务化', () => {
  let lessonId: { id: string; content: string };
  let originalExerciseIds: string[];

  it('A1/A2 · createLesson 返回完整 UUID 且富文本中的客户端题目引用被替换', async () => {
    const course = await prisma.courses.create({
      data: { title: `${MARKER}_course` },
    });
    courseId = course.id;

    const [chapter] = await Promise.all([
      prisma.chapters.create({
        data: { course_id: course.id, title: `${MARKER}_chapter`, order: 1 },
      }),
      prisma.chapters.create({
        data: { course_id: course.id, title: `${MARKER}_collision`, order: 2 },
      }),
    ]);

    const createResult = await invoke<{
      exercises: { id: string }[];
    }>(createLesson, {
      body: {
        chapterId: chapter.id,
        lessonName: `${MARKER}_lesson`,
        content:
          '<div data-type="exercise-button" data-exercise-id="exercise_temp_a"></div>',
        difficulty: 1,
        estimatedTime: 15,
        exercises: [
          {
            id: 'exercise_temp_a',
            type: 'code',
            exerciseContent: '输出 hello',
            answer: 'print("hello")',
            knowledge: '标准输出',
            analysis: '调用 print',
            source: 'static',
            metadata: { template: '' },
            hints: null,
          },
          {
            id: 'exercise_temp_b',
            type: 'single_choice',
            exerciseContent: '请选择 A',
            answer: 'A',
            knowledge: '选择题',
            analysis: 'A 为正确选项',
            source: 'static',
            metadata: { options: ['A', 'B'] },
            hints: null,
          },
        ],
      },
    });

    expect(createResult.code).toBe(200);
    expect(createResult.data.exercises).toHaveLength(2);

    lessonId = await prisma.lessons.findFirstOrThrow({
      where: { title: `${MARKER}_lesson` },
      select: { id: true, content: true },
    });
    originalExerciseIds = createResult.data.exercises.map((e) => e.id);
    // 验证返回的是完整 UUID（A2：管理接口内部用完整 UUID）
    for (const id of originalExerciseIds) {
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    }
    // 验证富文本中客户端临时 ID 已被替换为服务端 UUID
    expect(lessonId.content).toContain(originalExerciseIds[0]);
    expect(lessonId.content).not.toContain('exercise_temp_a');
  });

  it('C · 创建的题目 knowledge/analysis/source 已落库', async () => {
    const persisted = await prisma.exercises.findUniqueOrThrow({
      where: { id: originalExerciseIds[0] },
    });
    expect(persisted.knowledge).toBe('标准输出');
    expect(persisted.analysis).toBe('调用 print');
    expect(persisted.source).toBe('static');
  });

  it('A1 · 关联数据（answer/code_submission）随题目 ID 稳定', async () => {
    const user = await prisma.users.create({
      data: { email: `${MARKER}@example.com`, password: 'test-only' },
    });
    userId = user.id;
    const answer = await prisma.answer.create({
      data: {
        user_id: user.id,
        exercise_id: originalExerciseIds[0],
        answer: 'print("hello")',
        submission_count: 1,
        score: 100,
      },
    });
    const submission = await prisma.code_submissions.create({
      data: {
        user_id: user.id,
        exercise_id: originalExerciseIds[0],
        code: 'print("hello")',
        language: 'python',
        submission_no: 1,
      },
    });

    // 在另一个小节下造一个碰撞短 ID 的题目（用于验证 A2 不被短 ID 解析误导）
    const collisionChapter = await prisma.chapters.findFirstOrThrow({
      where: { title: `${MARKER}_collision` },
    });
    const collisionLesson = await prisma.lessons.create({
      data: {
        chapter_id: collisionChapter.id,
        title: `${MARKER}_collision_lesson`,
        order: 1,
      },
    });
    await prisma.exercises.create({
      data: {
        id: createShortIdCollisionUuid(uuidToShortId(lessonId.id)),
        lesson_id: collisionLesson.id,
        type: 'code',
        content: 'collision',
        answer: 'collision',
      },
    });

    // 用原 exercises 数组更新（A1：增量 diff，ID 应保持不变）
    const updateResult = await invoke<{
      exercises: { id: string }[];
      estimatedTime: number;
    }>(updateLesson, {
      params: { id: uuidToShortId(lessonId.id) },
      body: {
        lessonName: `${MARKER}_lesson_updated`,
        content: lessonId.content,
        difficulty: 2,
        estimatedTime: 25,
        exercises: originalExerciseIds.map((id, idx) => ({
          id,
          type: idx === 0 ? 'code' : 'single_choice',
          exerciseContent: idx === 0 ? '输出 hello' : '请选择 A',
          answer: idx === 0 ? 'print("hello")' : 'A',
          knowledge: idx === 0 ? '标准输出' : '选择题',
          analysis: idx === 0 ? '调用 print' : 'A 为正确选项',
          source: 'static',
          metadata: idx === 0 ? { template: '' } : { options: ['A', 'B'] },
          hints: null,
        })),
      },
    });

    expect(updateResult.code).toBe(200);
    expect(
      updateResult.data.exercises.map((e) => e.id)
    ).toEqual(originalExerciseIds);
    expect(updateResult.data.estimatedTime).toBe(25);

    // answer / code_submission 仍关联到原 exercise ID（A1：ID 稳定不漂移）
    expect(
      (await prisma.answer.findUniqueOrThrow({ where: { id: answer.id } }))
        .exercise_id
    ).toBe(originalExerciseIds[0]);
    expect(
      (
        await prisma.code_submissions.findUniqueOrThrow({
          where: { id: submission.id },
        })
      ).exercise_id
    ).toBe(originalExerciseIds[0]);
  });

  it('A2/A3 · 提交属于别的小节的题目 ID 时报错且不串改', async () => {
    const beforeFailedUpdate = await prisma.lessons.findUniqueOrThrow({
      where: { id: lessonId.id },
      select: { title: true, updated_at: true },
    });

    const foreignUpdate = await invoke(updateLesson, {
      params: { id: uuidToShortId(lessonId.id) },
      body: {
        lessonName: `${MARKER}_must_rollback`,
        exercises: [
          {
            ...{
              id: originalExerciseIds[0],
              type: 'code',
              exerciseContent: '输出 hello',
              answer: 'print("hello")',
              knowledge: '标准输出',
              analysis: '调用 print',
              source: 'static',
              metadata: { template: '' },
              hints: null,
            },
            // 替换为属于别的小节的碰撞 ID
            id: createShortIdCollisionUuid(uuidToShortId(lessonId.id)),
          },
        ],
      },
    });

    expect(foreignUpdate.code).toBe(400);
    const afterFailedUpdate = await prisma.lessons.findUniqueOrThrow({
      where: { id: lessonId.id },
      select: { title: true, updated_at: true },
    });
    // 失败时小节保持原状（事务回滚）
    expect(afterFailedUpdate).toEqual(beforeFailedUpdate);
  });

  it('A4 · createLesson 某题写入失败时整个小节不落库', async () => {
    const invalidCreate = await invoke(createLesson, {
      body: {
        chapterId: (await prisma.chapters.findFirstOrThrow({
          where: { title: `${MARKER}_chapter` },
        })).id,
        lessonName: `${MARKER}_invalid`,
        exercises: [
          {
            id: 'exercise_invalid',
            type: 'x'.repeat(21), // 题型字段超长触发 DB 约束错误
            exerciseContent: 'invalid',
            answer: 'invalid',
          },
        ],
      },
    });

    expect(invalidCreate.code).toBe(500);
    expect(
      await prisma.lessons.count({ where: { title: `${MARKER}_invalid` } })
    ).toBe(0);
  });

  it('A5 · createLesson 拒绝答案与选项对不上的选择题，且不落库', async () => {
    const chapterId = (
      await prisma.chapters.findFirstOrThrow({
        where: { title: `${MARKER}_chapter` },
      })
    ).id;

    const mismatched = await invoke(createLesson, {
      body: {
        chapterId,
        lessonName: `${MARKER}_mismatch`,
        exercises: [
          {
            id: 'exercise_mismatch',
            type: 'single_choice',
            exerciseContent: '答案不在选项内',
            answer: 'C',
            knowledge: '选择题',
            analysis: '答案应当是选项之一',
            source: 'static',
            metadata: { options: ['A', 'B'] },
          },
        ],
      },
    });
    expect(mismatched.code).toBe(400);

    const duplicated = await invoke(createLesson, {
      body: {
        chapterId,
        lessonName: `${MARKER}_duplicate`,
        exercises: [
          {
            id: 'exercise_duplicate',
            type: 'single_choice',
            exerciseContent: '选项重复',
            answer: 'A',
            knowledge: '选择题',
            analysis: '选项不应重复',
            source: 'static',
            metadata: { options: ['A', 'B', 'B'] },
          },
        ],
      },
    });
    expect(duplicated.code).toBe(400);

    expect(
      await prisma.lessons.count({
        where: {
          title: { in: [`${MARKER}_mismatch`, `${MARKER}_duplicate`] },
        },
      })
    ).toBe(0);
  });
});
