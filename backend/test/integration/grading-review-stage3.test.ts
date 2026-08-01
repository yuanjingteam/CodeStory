import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';
import { submitExercise } from '../../src/services/courses/exercise.service';
import { recordHintLevel } from '../../src/services/courses/exercise-hint.service';
import {
  createGradingReviewInTransaction,
  GradingReviewConflictError,
  reviewGradingReview,
} from '../../src/services/courses/grading-review.service';
import { issueAccessToken } from '../../src/utils/auth-token';
import { uuidToShortId } from '../../src/utils/idTransform';

vi.mock('../../src/services/ai/evaluate/code-grading-chain', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/ai/evaluate/code-grading-chain')
  >();
  return {
    ...actual,
    reviewCodeWithAI: vi.fn(async ({ staticGrade }) => ({
      review: {
        isLikelyCorrect: staticGrade.correct,
        functionalScore: staticGrade.correct ? 70 : 0,
        qualityScore: staticGrade.correct ? 30 : 0,
        confidence: 1,
        feedback: '测试 AI 评阅结果',
        strengths: [],
        issues: [],
        suggestions: [],
        needsManualReview: false,
      },
      model: 'test-model',
      rubricVersion: 'test-v1',
      rawContent: '{}',
    })),
  };
});

function assertSafeTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  expect(databaseUrl).toBeDefined();
  expect(new URL(databaseUrl!).pathname.slice(1)).toMatch(/(^|[_-])test($|[_-])/i);
}

const marker = `grading_stage3_${Date.now()}`;
let courseId = '';
let chapterId = '';
let lessonId = '';
let choiceExerciseId = '';
let codeExerciseId = '';
let userId = '';
let otherUserId = '';
let boundaryUserId = '';
let concurrentUserId = '';
let adminId = '';
let userToken = '';
let otherUserToken = '';
let adminToken = '';

beforeAll(async () => {
  assertSafeTestDatabase();
  const [user, otherUser, boundaryUser, concurrentUser, admin] = await Promise.all([
    prisma.users.create({ data: { email: `${marker}_user@example.com`, password: 'test' } }),
    prisma.users.create({ data: { email: `${marker}_other@example.com`, password: 'test' } }),
    prisma.users.create({ data: { email: `${marker}_boundary@example.com`, password: 'test' } }),
    prisma.users.create({ data: { email: `${marker}_concurrent@example.com`, password: 'test' } }),
    prisma.users.create({ data: { email: `${marker}_admin@example.com`, password: 'test', role: 1 } }),
  ]);
  userId = user.id;
  otherUserId = otherUser.id;
  boundaryUserId = boundaryUser.id;
  concurrentUserId = concurrentUser.id;
  adminId = admin.id;
  userToken = issueAccessToken({ userId, email: user.email, role: 0, sessionId: randomUUID() }).token;
  otherUserToken = issueAccessToken({ userId: otherUserId, email: otherUser.email, role: 0, sessionId: randomUUID() }).token;
  adminToken = issueAccessToken({ userId: adminId, email: admin.email, role: 1, sessionId: randomUUID() }).token;

  const course = await prisma.courses.create({ data: { title: `${marker}_course` } });
  courseId = course.id;
  const chapter = await prisma.chapters.create({
    data: { course_id: course.id, title: `${marker}_chapter`, order: 1 },
  });
  chapterId = chapter.id;
  const lesson = await prisma.lessons.create({
    data: { chapter_id: chapter.id, title: `${marker}_lesson`, order: 1 },
  });
  lessonId = lesson.id;
  const [choice, code] = await Promise.all([
    prisma.exercises.create({
      data: {
        lesson_id: lesson.id,
        type: 'single_choice',
        content: '请选择 A',
        answer: 'A. 正确',
        metadata: { options: ['A. 正确', 'B. 错误'] },
        order: 1,
      },
    }),
    prisma.exercises.create({
      data: {
        lesson_id: lesson.id,
        type: 'code',
        content: '输出 1',
        answer: 'print(1)',
        metadata: { language: 'python' },
        order: 2,
      },
    }),
  ]);
  choiceExerciseId = choice.id;
  codeExerciseId = code.id;
});

afterAll(async () => {
  if (courseId) await prisma.courses.deleteMany({ where: { id: courseId } });
  await prisma.users.deleteMany({
    where: {
      id: {
        in: [
          userId,
          otherUserId,
          boundaryUserId,
          concurrentUserId,
          adminId,
        ].filter(Boolean),
      },
    },
  });
  await prisma.$disconnect();
});

describe('阶段 3 · 提交版本、服务端提示与最佳分', () => {
  it('每次成功提交 version +1，选择题只升掌握度且最佳分不下降', async () => {
    await prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: choiceExerciseId,
        hint_level_used: 2,
        score: 0,
        version: 0,
      },
    });
    const correct = await submitExercise(uuidToShortId(choiceExerciseId), 'A', userId);
    expect(correct).toMatchObject({ correct: true, score: 80 });
    expect(await prisma.answer.findUniqueOrThrow({
      where: { user_id_exercise_id: { user_id: userId, exercise_id: choiceExerciseId } },
    })).toMatchObject({ score: 80, hint_level_used: 2, version: 1, submission_count: 1 });

    const progressAfterCorrect = await prisma.lessons_progress.findUniqueOrThrow({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    });
    expect(progressAfterCorrect.mastery_level).toBe(40);

    const wrong = await submitExercise(uuidToShortId(choiceExerciseId), 'B', userId);
    expect(wrong).toMatchObject({ correct: false, score: 0 });
    const saved = await prisma.answer.findUniqueOrThrow({
      where: { user_id_exercise_id: { user_id: userId, exercise_id: choiceExerciseId } },
    });
    expect(saved).toMatchObject({ score: 80, version: 2, submission_count: 2 });
    expect((await prisma.lessons_progress.findUniqueOrThrow({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    })).mastery_level).toBe(40);
  });

  it('并发提示写入始终保留服务端最高等级', async () => {
    await Promise.all([
      recordHintLevel(choiceExerciseId, otherUserId, 1),
      recordHintLevel(choiceExerciseId, otherUserId, 3),
      recordHintLevel(choiceExerciseId, otherUserId, 2),
    ]);
    expect(await prisma.answer.findUniqueOrThrow({
      where: {
        user_id_exercise_id: {
          user_id: otherUserId,
          exercise_id: choiceExerciseId,
        },
      },
      select: { hint_level_used: true },
    })).toEqual({ hint_level_used: 3 });
  });
});

describe('阶段 3 · 复核幂等与旧版本保护', () => {
  let currentReviewId = '';
  let staleReviewId = '';
  let siblingReviewId = '';

  it('同一 fingerprint + trigger 只创建一张复核单', async () => {
    await prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: codeExerciseId,
        answer: 'print(2)',
        score: 20,
        submission_count: 1,
        version: 1,
      },
    });
    const candidate = {
      userId,
      exerciseId: codeExerciseId,
      submissionType: 'code',
      submittedAnswer: 'print(2)',
      answerVersion: 1,
      hintLevelUsed: 0,
      exerciseSnapshot: { content: '输出 1', answer: 'print(1)' },
      triggerReason: 'rule_ai_conflict' as const,
      aiScore: 20,
      ruleScore: 0,
    };
    const [first, second] = await prisma.$transaction(async (tx) => {
      const one = await createGradingReviewInTransaction(tx, candidate);
      const two = await createGradingReviewInTransaction(tx, candidate);
      return [one, two];
    });
    currentReviewId = first.id;
    expect(second.id).toBe(first.id);

    const appealed = await prisma.$transaction((tx) =>
      createGradingReviewInTransaction(tx, {
        ...candidate,
        triggerReason: 'user_appeal',
        appealReason: '请求人工复核同一提交',
      })
    );
    expect(appealed.id).toBe(first.id);
    expect(appealed.appeal_reason).toBe('请求人工复核同一提交');

    const sibling = await prisma.$transaction((tx) =>
      createGradingReviewInTransaction(tx, {
        ...candidate,
        triggerReason: 'structured_output_failure',
      })
    );
    siblingReviewId = sibling.id;
    expect(sibling.id).not.toBe(first.id);
  });

  it('当前版本人工未掌握可下调掌握度，重复审核不重复生效', async () => {
    await prisma.lessons_progress.update({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      data: { mastery_level: 90 },
    });
    await reviewGradingReview({
      reviewId: currentReviewId,
      reviewerId: adminId,
      result: 'not_mastered',
      note: '当前提交未达到掌握标准',
    });
    expect((await prisma.lessons_progress.findUniqueOrThrow({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    })).mastery_level).toBe(40);
    expect(await prisma.ai_grading_reviews.findUniqueOrThrow({
      where: { id: siblingReviewId },
      select: { status: true },
    })).toEqual({ status: 'stale' });
    await expect(reviewGradingReview({
      reviewId: currentReviewId,
      reviewerId: adminId,
      result: 'mastered',
    })).rejects.toBeInstanceOf(GradingReviewConflictError);
  });

  it('提交 B 后处理提交 A，A 标 stale 且不覆盖当前掌握度', async () => {
    const review = await prisma.$transaction((tx) => createGradingReviewInTransaction(tx, {
      userId,
      exerciseId: codeExerciseId,
      submissionType: 'code',
      submittedAnswer: 'print(2)',
      answerVersion: 1,
      hintLevelUsed: 0,
      exerciseSnapshot: { content: '输出 1', answer: 'print(1)' },
      triggerReason: 'low_confidence',
      aiScore: 30,
      ruleScore: 0,
    }));
    staleReviewId = review.id;
    await prisma.answer.update({
      where: { user_id_exercise_id: { user_id: userId, exercise_id: codeExerciseId } },
      data: { version: { increment: 1 }, answer: 'print(1)', score: 100 },
    });
    const before = (await prisma.lessons_progress.findUniqueOrThrow({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    })).mastery_level;
    await expect(reviewGradingReview({
      reviewId: staleReviewId,
      reviewerId: adminId,
      result: 'not_mastered',
    })).rejects.toMatchObject({ reason: 'stale' });
    expect(await prisma.ai_grading_reviews.findUniqueOrThrow({ where: { id: staleReviewId } }))
      .toMatchObject({ status: 'stale', reviewed_result: 'not_mastered' });
    expect((await prisma.lessons_progress.findUniqueOrThrow({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    })).mastery_level).toBe(before);
  });
});

describe('阶段 3 · 申诉归属与管理员权限', () => {
  it('课程、章节或课时软删除后，提交和申诉均按题目不存在拒绝', async () => {
    const parents = [
      {
        name: '课程',
        remove: () => prisma.courses.update({
          where: { id: courseId },
          data: { is_delete: 1, deleted_at: new Date() },
        }),
        restore: () => prisma.courses.update({
          where: { id: courseId },
          data: { is_delete: 0, deleted_at: null },
        }),
      },
      {
        name: '章节',
        remove: () => prisma.chapters.update({
          where: { id: chapterId },
          data: { is_delete: 1, deleted_at: new Date() },
        }),
        restore: () => prisma.chapters.update({
          where: { id: chapterId },
          data: { is_delete: 0, deleted_at: null },
        }),
      },
      {
        name: '课时',
        remove: () => prisma.lessons.update({
          where: { id: lessonId },
          data: { is_delete: 1, deleted_at: new Date() },
        }),
        restore: () => prisma.lessons.update({
          where: { id: lessonId },
          data: { is_delete: 0, deleted_at: null },
        }),
      },
    ];

    for (const parent of parents) {
      await parent.remove();
      try {
        const submit = await request(app)
          .post('/api/v1/exercises/submit')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ exercise_id: uuidToShortId(choiceExerciseId), answer: 'A' });
        const appeal = await request(app)
          .post('/api/v1/exercises/grading-reviews/appeal')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            exercise_id: uuidToShortId(codeExerciseId),
            reason: `${parent.name}已删除，不应继续受理申诉。`,
          });
        expect(submit.status, `${parent.name}软删除后的提交 HTTP 状态`).toBe(200);
        expect(submit.body.code, `${parent.name}软删除后的提交业务状态`).toBe(404);
        expect(appeal.status, `${parent.name}软删除后的申诉状态`).toBe(404);
      } finally {
        await parent.restore();
      }
    }
  });

  it('申诉只读取当前用户当前版本，重复调用返回同一复核单', async () => {
    const path = '/api/v1/exercises/grading-reviews/appeal';
    const body = { exercise_id: uuidToShortId(codeExerciseId), reason: 'AI 忽略了等价实现，请复核。' };
    const first = await request(app).post(path).set('Authorization', `Bearer ${userToken}`).send(body);
    const second = await request(app).post(path).set('Authorization', `Bearer ${userToken}`).send(body);
    expect(first.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);

    const foreign = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send(body);
    expect(foreign.status).toBe(404);
  });

  it('管理员队列未登录 401、普通用户 403、管理员 200', async () => {
    const path = '/api/v1/admin/grading-reviews?status=pending&page=1&size=10';
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set('Authorization', `Bearer ${userToken}`)).status).toBe(403);
    const admin = await request(app).get(path).set('Authorization', `Bearer ${adminToken}`);
    expect(admin.status).toBe(200);
    expect(admin.body.data.pagination).toMatchObject({ page: 1, size: 10 });
  });
});

describe('阶段 3 · 人工复核边界与并发', () => {
  it('人工掌握可提升、人工未掌握可下调，维持原判也释放掌握度结论', async () => {
    await prisma.answer.create({
      data: {
        user_id: boundaryUserId,
        exercise_id: codeExerciseId,
        answer: 'print(1)',
        score: 0,
        submission_count: 1,
        version: 1,
      },
    });
    await prisma.lessons_progress.create({
      data: {
        user_id: boundaryUserId,
        lesson_id: lessonId,
        status: 1,
        mastery_level: 0,
      },
    });
    const masteredReview = await prisma.$transaction((tx) =>
      createGradingReviewInTransaction(tx, {
        userId: boundaryUserId,
        exerciseId: codeExerciseId,
        submissionType: 'code',
        submittedAnswer: 'print(1)',
        answerVersion: 1,
        hintLevelUsed: 0,
        exerciseSnapshot: { grading: { currentPassed: true } },
        triggerReason: 'ai_requested',
        aiScore: 0,
        ruleScore: 0,
      })
    );
    await reviewGradingReview({
      reviewId: masteredReview.id,
      reviewerId: adminId,
      result: 'mastered',
    });
    const [masteredAnswer, masteredUser, masteredProgress] = await Promise.all([
      prisma.answer.findUniqueOrThrow({
        where: {
          user_id_exercise_id: {
            user_id: boundaryUserId,
            exercise_id: codeExerciseId,
          },
        },
      }),
      prisma.users.findUniqueOrThrow({ where: { id: boundaryUserId } }),
      prisma.lessons_progress.findUniqueOrThrow({
        where: {
          user_id_lesson_id: {
            user_id: boundaryUserId,
            lesson_id: lessonId,
          },
        },
      }),
    ]);
    expect(masteredAnswer.score).toBe(100);
    expect(masteredUser.score).toBe(100);
    expect(masteredProgress.mastery_level).toBeGreaterThan(0);

    await Promise.all([
      prisma.answer.update({
        where: {
          user_id_exercise_id: {
            user_id: boundaryUserId,
            exercise_id: codeExerciseId,
          },
        },
        data: { answer: 'print(0)', score: 100, version: 2 },
      }),
      prisma.lessons_progress.update({
        where: {
          user_id_lesson_id: {
            user_id: boundaryUserId,
            lesson_id: lessonId,
          },
        },
        data: { mastery_level: 100 },
      }),
    ]);
    const notMasteredReview = await prisma.$transaction((tx) =>
      createGradingReviewInTransaction(tx, {
        userId: boundaryUserId,
        exerciseId: codeExerciseId,
        submissionType: 'code',
        submittedAnswer: 'print(0)',
        answerVersion: 2,
        hintLevelUsed: 0,
        exerciseSnapshot: { grading: { currentPassed: false } },
        triggerReason: 'low_confidence',
        aiScore: 0,
        ruleScore: 0,
      })
    );
    await reviewGradingReview({
      reviewId: notMasteredReview.id,
      reviewerId: adminId,
      result: 'not_mastered',
    });
    const [notMasteredAnswer, notMasteredUser, notMasteredProgress] = await Promise.all([
      prisma.answer.findUniqueOrThrow({
        where: {
          user_id_exercise_id: {
            user_id: boundaryUserId,
            exercise_id: codeExerciseId,
          },
        },
      }),
      prisma.users.findUniqueOrThrow({ where: { id: boundaryUserId } }),
      prisma.lessons_progress.findUniqueOrThrow({
        where: {
          user_id_lesson_id: {
            user_id: boundaryUserId,
            lesson_id: lessonId,
          },
        },
      }),
    ]);
    expect(notMasteredAnswer.score).toBe(0);
    expect(notMasteredUser.score).toBe(0);
    expect(notMasteredProgress.mastery_level).toBeLessThan(100);

    await Promise.all([
      prisma.answer.update({
        where: {
          user_id_exercise_id: {
            user_id: boundaryUserId,
            exercise_id: codeExerciseId,
          },
        },
        data: { answer: 'print(37)', score: 37, version: 3 },
      }),
      prisma.lessons_progress.update({
        where: {
          user_id_lesson_id: {
            user_id: boundaryUserId,
            lesson_id: lessonId,
          },
        },
        data: { mastery_level: 27 },
      }),
    ]);
    const maintainedReview = await prisma.$transaction((tx) =>
      createGradingReviewInTransaction(tx, {
        userId: boundaryUserId,
        exerciseId: codeExerciseId,
        submissionType: 'code',
        submittedAnswer: 'print(37)',
        answerVersion: 3,
        hintLevelUsed: 0,
        exerciseSnapshot: { grading: { currentPassed: false } },
        triggerReason: 'user_appeal',
        aiScore: 100,
        ruleScore: 0,
      })
    );
    await reviewGradingReview({
      reviewId: maintainedReview.id,
      reviewerId: adminId,
      result: 'maintained',
    });
    const [maintainedAnswer, maintainedUser, maintainedProgress] = await Promise.all([
      prisma.answer.findUniqueOrThrow({
        where: {
          user_id_exercise_id: {
            user_id: boundaryUserId,
            exercise_id: codeExerciseId,
          },
        },
      }),
      prisma.users.findUniqueOrThrow({ where: { id: boundaryUserId } }),
      prisma.lessons_progress.findUniqueOrThrow({
        where: {
          user_id_lesson_id: {
            user_id: boundaryUserId,
            lesson_id: lessonId,
          },
        },
      }),
    ]);
    expect(maintainedAnswer.score).toBe(37);
    expect(maintainedUser.score).toBe(37);
    expect(maintainedProgress.mastery_level).toBeLessThan(27);

    await Promise.all([
      prisma.answer.update({
        where: {
          user_id_exercise_id: {
            user_id: boundaryUserId,
            exercise_id: codeExerciseId,
          },
        },
        data: { answer: 'print(1)', score: 80, version: 4 },
      }),
      prisma.lessons_progress.update({
        where: {
          user_id_lesson_id: {
            user_id: boundaryUserId,
            lesson_id: lessonId,
          },
        },
        data: { mastery_level: 0 },
      }),
    ]);
    const maintainedPass = await prisma.$transaction((tx) =>
      createGradingReviewInTransaction(tx, {
        userId: boundaryUserId,
        exerciseId: codeExerciseId,
        submissionType: 'code',
        submittedAnswer: 'print(1)',
        answerVersion: 4,
        hintLevelUsed: 0,
        exerciseSnapshot: { grading: { currentPassed: true } },
        triggerReason: 'low_confidence',
        aiScore: 80,
        ruleScore: 100,
      })
    );
    await reviewGradingReview({
      reviewId: maintainedPass.id,
      reviewerId: adminId,
      result: 'maintained',
    });
    expect((await prisma.lessons_progress.findUniqueOrThrow({
      where: {
        user_id_lesson_id: {
          user_id: boundaryUserId,
          lesson_id: lessonId,
        },
      },
    })).mastery_level).toBeGreaterThan(0);
  });

  it('两个管理员请求并发审核时仅一个成功，另一个返回 409', async () => {
    const currentAnswer = await prisma.answer.findUniqueOrThrow({
      where: {
        user_id_exercise_id: {
          user_id: boundaryUserId,
          exercise_id: codeExerciseId,
        },
      },
    });
    const review = await prisma.$transaction((tx) =>
      createGradingReviewInTransaction(tx, {
        userId: boundaryUserId,
        exerciseId: codeExerciseId,
        submissionType: 'code',
        submittedAnswer: currentAnswer.answer || '',
        answerVersion: currentAnswer.version,
        hintLevelUsed: 0,
        exerciseSnapshot: { grading: { currentPassed: false } },
        triggerReason: 'structured_output_failure',
        ruleScore: 0,
      })
    );
    const path = `/api/v1/admin/grading-reviews/${review.id}/review`;
    const responses = await Promise.all([
      request(app)
        .post(path)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ result: 'not_mastered' }),
      request(app)
        .post(path)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ result: 'not_mastered' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  });
});

describe('阶段 3 · 代码提交原子性', () => {
  it('并发提交的成功次数与答案版本、code_submission 数量一致', async () => {
    const results = await Promise.allSettled([
      submitExercise(uuidToShortId(codeExerciseId), 'print(1)', concurrentUserId),
      submitExercise(uuidToShortId(codeExerciseId), 'print(1)', concurrentUserId),
    ]);
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    const fulfilledCount = results.filter((result) => result.status === 'fulfilled').length;
    expect(fulfilledCount).toBe(2);

    const [savedAnswer, submissionCount] = await Promise.all([
      prisma.answer.findUniqueOrThrow({
        where: {
          user_id_exercise_id: {
            user_id: concurrentUserId,
            exercise_id: codeExerciseId,
          },
        },
      }),
      prisma.code_submissions.count({
        where: { user_id: concurrentUserId, exercise_id: codeExerciseId },
      }),
    ]);
    expect(savedAnswer.submission_count).toBe(fulfilledCount);
    expect(savedAnswer.version).toBe(fulfilledCount);
    expect(submissionCount).toBe(fulfilledCount);
  });

  it('答案事务失败时不留下孤立 code_submission', async () => {
    const code = 'print(999)';
    const transactionSpy = vi.spyOn(prisma, '$transaction');
    transactionSpy.mockRejectedValueOnce(new Error('forced answer transaction failure'));
    try {
      await expect(submitExercise(
        uuidToShortId(codeExerciseId),
        code,
        concurrentUserId
      )).rejects.toThrow('forced answer transaction failure');
    } finally {
      transactionSpy.mockRestore();
    }
    expect(await prisma.code_submissions.count({
      where: {
        user_id: concurrentUserId,
        exercise_id: codeExerciseId,
        code,
      },
    })).toBe(0);
  });
});
