import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';
import { issueAccessToken } from '../../src/utils/auth-token';
import { uuidToShortId } from '../../src/utils/idTransform';
import {
  getExerciseDetail,
  explainChoiceExercise,
  submitExercise,
} from '../../src/services/courses/exercise.service';
import {
  getExerciseHint,
  getExerciseHintProgress,
} from '../../src/services/courses/exercise-hint.service';
import { getLessonDetail } from '../../src/services/courses/lesson.service';
import {
  ExerciseManageError,
  getManagedExercise,
  reviewManagedExercise,
} from '../../src/services/course-manage/exercise-manage';
import {
  createExerciseContentFingerprint,
  lockLessonExerciseWrites,
} from '../../src/services/courses/exercise-write-guards';

const marker = `stage2_review_${Date.now()}`;
let userId = '';
let adminId = '';
let adminToken = '';
let normalToken = '';
let courseId = '';
let chapterId = '';
let lessonId = '';
let approvedExerciseId = '';
let draftExerciseId = '';

beforeAll(async () => {
  const [user, admin] = await Promise.all([
    prisma.users.create({
      data: {
        email: `${marker}_user@example.com`,
        password: 'test-only',
        role: 0,
      },
    }),
    prisma.users.create({
      data: {
        email: `${marker}_admin@example.com`,
        password: 'test-only',
        role: 1,
      },
    }),
  ]);
  userId = user.id;
  normalToken = issueAccessToken({
    userId: user.id,
    email: user.email,
    role: 0,
    sessionId: randomUUID(),
  }).token;
  adminId = admin.id;
  adminToken = issueAccessToken({
    userId: admin.id,
    email: admin.email,
    role: 1,
    sessionId: randomUUID(),
  }).token;

  const course = await prisma.courses.create({
    data: { title: `${marker}_course` },
  });
  courseId = course.id;
  const chapter = await prisma.chapters.create({
    data: {
      course_id: course.id,
      title: `${marker}_chapter`,
      order: 1,
    },
  });
  chapterId = chapter.id;
  const lesson = await prisma.lessons.create({
    data: {
      chapter_id: chapter.id,
      title: `${marker}_lesson`,
      content: '<p>SQL WHERE 用于筛选数据。</p>',
      order: 1,
      knowledge_index_policy: 'exclude',
    },
  });
  lessonId = lesson.id;
  const approved = await prisma.exercises.create({
    data: {
      lesson_id: lesson.id,
      type: 'single_choice',
      content: '已审核题目',
      answer: '筛选数据',
      analysis: 'WHERE 用于筛选数据。',
      knowledge: 'WHERE',
      source: 'static',
      review_status: 'approved',
      metadata: { options: ['筛选数据', '排序数据'] },
      knowledge_index_policy: 'exclude',
      order: 1,
    },
  });
  approvedExerciseId = approved.id;
  const draft = await prisma.exercises.create({
    data: {
      lesson_id: lesson.id,
      type: 'single_choice',
      content: 'AI 草稿题目',
      answer: 'WHERE',
      analysis: 'WHERE 是条件筛选子句。',
      knowledge: 'WHERE',
      source: 'ai',
      review_status: 'draft',
      gen_metadata: {
        traceId: `${marker}_trace`,
        model: 'test-model',
        promptVersion: 'exercise-gen-v1',
      },
      metadata: { options: ['WHERE', 'ORDER BY'] },
      knowledge_index_policy: 'exclude',
      order: 2,
    },
  });
  draftExerciseId = draft.id;
});

afterAll(async () => {
  if (courseId) {
    await prisma.courses.deleteMany({ where: { id: courseId } });
  }
  if (userId || adminId) {
    await prisma.users.deleteMany({
      where: { id: { in: [userId, adminId].filter(Boolean) } },
    });
  }
  await prisma.$disconnect();
});

describe('阶段 2 · 学习端审核态隔离', () => {
  it('AI 活动题内容指纹阻止并发重复草稿', async () => {
    const fingerprint = createExerciseContentFingerprint('并发重复题目');
    const createDraft = () => prisma.exercises.create({
      data: {
        lesson_id: lessonId,
        type: 'single_choice',
        content: '并发重复题目',
        answer: 'A',
        source: 'ai',
        review_status: 'draft',
        generation_fingerprint: fingerprint,
        metadata: { options: ['A', 'B'] },
        knowledge_index_policy: 'exclude',
        order: 500,
      },
    });
    const results = await Promise.allSettled([createDraft(), createDraft()]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  it('小节级事务锁使并发追加题目得到不同顺序', async () => {
    const append = (content: string) => prisma.$transaction(async (tx) => {
      await lockLessonExerciseWrites(tx, lessonId);
      const current = await tx.exercises.aggregate({
        where: { lesson_id: lessonId, is_delete: 0 },
        _max: { order: true },
      });
      return tx.exercises.create({
        data: {
          lesson_id: lessonId,
          type: 'single_choice',
          content,
          answer: 'A',
          source: 'static',
          review_status: 'approved',
          metadata: { options: ['A', 'B'] },
          knowledge_index_policy: 'exclude',
          order: (current._max.order || 0) + 1,
        },
      });
    });
    const created = await Promise.all([
      append('并发排序题 A'),
      append('并发排序题 B'),
    ]);
    try {
      expect(new Set(created.map((exercise) => exercise.order)).size).toBe(2);
    } finally {
      await prisma.exercises.updateMany({
        where: { id: { in: created.map((exercise) => exercise.id) } },
        data: { is_delete: 1, deleted_at: new Date() },
      });
    }
  });

  it('草稿在小节详情、题目详情、提交和提示入口均不可见', async () => {
    const lesson = await getLessonDetail(
      uuidToShortId(lessonId),
      userId
    );
    expect(lesson?.exercises).toHaveLength(1);
    expect(lesson?.exercises[0].id).toBe(
      uuidToShortId(approvedExerciseId)
    );

    const draftId = uuidToShortId(draftExerciseId);
    expect(await getExerciseDetail(draftId, userId)).toBeNull();
    expect(await submitExercise(draftId, 'A', userId)).toBeNull();
    expect(await getExerciseHintProgress(draftId, userId)).toBeNull();
  });

  it('采用后可见，重复审核不能覆盖已生效结论', async () => {
    const approved = await reviewManagedExercise(
      draftExerciseId,
      'approve'
    );
    expect(approved.exercise?.reviewStatus).toBe('approved');

    const lesson = await getLessonDetail(
      uuidToShortId(lessonId),
      userId
    );
    expect(lesson?.exercises.map((exercise) => exercise.id)).toContain(
      uuidToShortId(draftExerciseId)
    );

    await expect(
      reviewManagedExercise(draftExerciseId, 'reject')
    ).rejects.toMatchObject<Partial<ExerciseManageError>>({
      code: 'EXERCISE_REVIEW_CONFLICT',
      status: 409,
    });
    expect(
      (
        await prisma.exercises.findUniqueOrThrow({
          where: { id: draftExerciseId },
        })
      ).review_status
    ).toBe('approved');
  });

  it('直接采用不带编辑负载时仍复校选项，坏草稿被拒且保持 draft', async () => {
    const broken = await prisma.exercises.create({
      data: {
        lesson_id: lessonId,
        type: 'single_choice',
        content: '选项配置坏掉的草稿',
        answer: '',
        analysis: '',
        knowledge: '',
        source: 'ai',
        review_status: 'draft',
        metadata: { options: ['甲', '乙'], correctAnswer: '' },
        knowledge_index_policy: 'exclude',
        order: 9,
      },
    });

    await expect(
      reviewManagedExercise(broken.id, 'approve')
    ).rejects.toMatchObject<Partial<ExerciseManageError>>({
      code: 'EXERCISE_ANSWER_INVALID',
    });
    expect(
      (
        await prisma.exercises.findUniqueOrThrow({ where: { id: broken.id } })
      ).review_status
    ).toBe('draft');

    // 拒绝必须永远可用，否则垃圾草稿会卡死在队列里
    const rejected = await reviewManagedExercise(broken.id, 'reject');
    expect(rejected.exercise?.reviewStatus).toBe('rejected');
  });

  it('管理员编辑所属小节后审核态与 gen_metadata 保留', async () => {
    const response = await request(app)
      .put(`/api/v1/admin/lessons/${uuidToShortId(lessonId)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lessonName: `${marker}_lesson_updated`,
        content: '<p>更新后的 SQL WHERE 正文。</p>',
        exercises: [
          {
            id: approvedExerciseId,
            type: 'single_choice',
            exerciseContent: '已审核题目',
            answer: '筛选数据',
            analysis: 'WHERE 用于筛选数据。',
            knowledge: 'WHERE',
            metadata: { options: ['筛选数据', '排序数据'] },
          },
          {
            id: draftExerciseId,
            type: 'single_choice',
            exerciseContent: 'AI 草稿题目（已采用）',
            answer: 'WHERE',
            analysis: 'WHERE 是条件筛选子句。',
            knowledge: 'WHERE',
            metadata: { options: ['WHERE', 'ORDER BY'] },
          },
        ],
      });

    expect(response.status).toBe(200);
    const preserved = await prisma.exercises.findUniqueOrThrow({
      where: { id: draftExerciseId },
    });
    expect(preserved.review_status).toBe('approved');
    expect(preserved.gen_metadata).toMatchObject({
      traceId: `${marker}_trace`,
      promptVersion: 'exercise-gen-v1',
    });
  });

  it('旧小节快照遗漏新 AI 草稿时不会将其软删除', async () => {
    const concurrentDraft = await prisma.exercises.create({
      data: {
        lesson_id: lessonId,
        type: 'single_choice',
        content: '另一管理员刚生成的草稿',
        answer: '保留',
        analysis: '旧快照保存不能删除新草稿。',
        knowledge: '并发安全',
        source: 'ai',
        review_status: 'draft',
        metadata: { options: ['保留', '删除'] },
        knowledge_index_policy: 'exclude',
        order: 99,
      },
    });

    const response = await request(app)
      .put(`/api/v1/admin/lessons/${uuidToShortId(lessonId)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lessonName: `${marker}_stale_snapshot`,
        exercises: [
          {
            id: approvedExerciseId,
            type: 'single_choice',
            exerciseContent: '已审核题目',
            answer: '筛选数据',
            analysis: 'WHERE 用于筛选数据。',
            knowledge: 'WHERE',
            metadata: { options: ['筛选数据', '排序数据'] },
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(
      await prisma.exercises.findUniqueOrThrow({
        where: { id: concurrentDraft.id },
        select: { is_delete: true, review_status: true },
      })
    ).toEqual({ is_delete: 0, review_status: 'draft' });
  });

  it('管理 API 使用完整 UUID，短前缀碰撞也不会误寻址', async () => {
    const firstId = 'aa000000-0000-4000-8000-000000000123';
    const secondId = 'aa111111-1111-4111-8111-111111111123';
    expect(uuidToShortId(firstId)).toBe(uuidToShortId(secondId));
    await prisma.exercises.createMany({
      data: [
        {
          id: firstId,
          lesson_id: lessonId,
          type: 'single_choice',
          content: '碰撞题 A',
          answer: 'A',
          analysis: 'A',
          knowledge: 'UUID',
          source: 'static',
          review_status: 'approved',
          metadata: { options: ['A', 'B'] },
          order: 101,
        },
        {
          id: secondId,
          lesson_id: lessonId,
          type: 'single_choice',
          content: '碰撞题 B',
          answer: 'B',
          analysis: 'B',
          knowledge: 'UUID',
          source: 'static',
          review_status: 'approved',
          metadata: { options: ['A', 'B'] },
          order: 102,
        },
      ],
    });

    expect((await getManagedExercise(firstId))?.content).toBe('碰撞题 A');
    expect((await getManagedExercise(secondId))?.content).toBe('碰撞题 B');
    await expect(getManagedExercise(uuidToShortId(firstId))).rejects.toMatchObject({
      code: 'EXERCISE_UUID_INVALID',
      status: 404,
    });
  });

  it('父层级软删除后详情、提交、解释、提示和审核统一不可用', async () => {
    const hiddenDraft = await prisma.exercises.create({
      data: {
        lesson_id: lessonId,
        type: 'single_choice',
        content: '父层级隐藏审核题',
        answer: 'A',
        analysis: '测试父层级活动约束。',
        knowledge: '可见性',
        source: 'ai',
        review_status: 'draft',
        metadata: { options: ['A', 'B'] },
        order: 103,
      },
    });
    await prisma.exercises.update({
      where: { id: approvedExerciseId },
      data: { hints: { level_1: '先看 WHERE 条件。', _meta: { max_level: 1 } } },
    });
    await prisma.chapters.update({ where: { id: chapterId }, data: { is_delete: 1 } });
    try {
      const learningId = uuidToShortId(approvedExerciseId);
      expect(await getExerciseDetail(learningId, userId)).toBeNull();
      expect(await submitExercise(learningId, 'A', userId)).toBeNull();
      expect(await explainChoiceExercise(learningId, 'A', userId)).toBeNull();
      expect(await getExerciseHint(learningId, 1, userId)).toBeNull();
      expect(await getManagedExercise(approvedExerciseId)).toBeNull();
      await expect(reviewManagedExercise(hiddenDraft.id, 'approve')).rejects.toMatchObject({
        code: 'EXERCISE_NOT_FOUND',
        status: 404,
      });
    } finally {
      await prisma.chapters.update({ where: { id: chapterId }, data: { is_delete: 0 } });
    }
  });

  it('父章节软删除后小节详情不存在且不泄露已审核题目', async () => {
    await prisma.chapters.update({
      where: { id: chapterId },
      data: { is_delete: 1 },
    });
    try {
      const lesson = await getLessonDetail(uuidToShortId(lessonId), userId);
      expect(lesson).toBeNull();
    } finally {
      await prisma.chapters.update({
        where: { id: chapterId },
        data: { is_delete: 0 },
      });
    }
  });

  it('父课程软删除后小节详情不存在且不泄露已审核题目', async () => {
    await prisma.courses.update({
      where: { id: courseId },
      data: { is_delete: 1 },
    });
    try {
      const lesson = await getLessonDetail(uuidToShortId(lessonId), userId);
      expect(lesson).toBeNull();
    } finally {
      await prisma.courses.update({
        where: { id: courseId },
        data: { is_delete: 0 },
      });
    }
  });
});

describe('阶段 2 · 出题与审核接口权限三态', () => {
  it('出题接口未登录 401、普通用户 403、管理员进入参数校验', async () => {
    const path = '/api/v1/admin/exercises/generate';
    expect((await request(app).post(path).send({})).status).toBe(401);
    expect(
      (
        await request(app)
          .post(path)
          .set('Authorization', `Bearer ${normalToken}`)
          .send({})
      ).status
    ).toBe(403);
    const adminResponse = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(adminResponse.status).toBe(400);
    expect(adminResponse.body.code).toBe(
      'EXERCISE_GENERATION_INPUT_INVALID'
    );
  });

  it('审核接口未登录 401、普通用户 403、管理员成功', async () => {
    const draft = await prisma.exercises.create({
      data: {
        lesson_id: lessonId,
        type: 'single_choice',
        content: '权限三态审核题',
        answer: 'A',
        analysis: '权限测试解析',
        knowledge: '权限测试',
        source: 'ai',
        review_status: 'draft',
        metadata: { options: ['A', 'B'] },
        knowledge_index_policy: 'exclude',
        order: 3,
      },
    });
    const path = `/api/v1/admin/exercises/${draft.id}/review`;

    expect(
      (
        await request(app)
          .put(path)
          .send({ action: 'approve' })
      ).status
    ).toBe(401);
    expect(
      (
        await request(app)
          .put(path)
          .set('Authorization', `Bearer ${normalToken}`)
          .send({ action: 'approve' })
      ).status
    ).toBe(403);
    const adminResponse = await request(app)
      .put(path)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.data.exercise.reviewStatus).toBe(
      'approved'
    );
  });
});
