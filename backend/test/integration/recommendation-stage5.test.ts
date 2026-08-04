import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';
import { issueAccessToken } from '../../src/utils/auth-token';

const marker = `stage5_recommendation_${Date.now()}`;
let courseId = '';
let chapterId = '';
let currentLessonId = '';
let nextLessonId = '';
let weakExerciseId = '';
let userId = '';
let otherUserId = '';
let userToken = '';
let otherUserToken = '';

beforeAll(async () => {
  const [user, otherUser] = await Promise.all([
    prisma.users.create({
      data: {
        email: `${marker}_user@example.com`,
        password: 'test-only',
        role: 0,
      },
    }),
    prisma.users.create({
      data: {
        email: `${marker}_other@example.com`,
        password: 'test-only',
        role: 0,
      },
    }),
  ]);
  userId = user.id;
  otherUserId = otherUser.id;
  userToken = issueAccessToken({
    userId,
    email: user.email,
    role: 0,
    sessionId: randomUUID(),
  }).token;
  otherUserToken = issueAccessToken({
    userId: otherUserId,
    email: otherUser.email,
    role: 0,
    sessionId: randomUUID(),
  }).token;

  const course = await prisma.courses.create({
    data: { title: `${marker}_course`, level: 0 },
  });
  courseId = course.id;
  const chapter = await prisma.chapters.create({
    data: {
      course_id: courseId,
      title: `${marker}_chapter`,
      order: 1,
    },
  });
  chapterId = chapter.id;
  const [currentLesson, nextLesson, foundationLesson] = await Promise.all([
    prisma.lessons.create({
      data: {
        chapter_id: chapterId,
        title: `${marker}_current`,
        content: '<p>SQL WHERE 用于筛选记录。</p>',
        order: 1,
        difficulty: 1,
        knowledge_index_policy: 'exclude',
      },
    }),
    prisma.lessons.create({
      data: {
        chapter_id: chapterId,
        title: `${marker}_next`,
        content: '<p>SQL ORDER BY 用于排序。</p>',
        order: 2,
        difficulty: 1,
        knowledge_index_policy: 'exclude',
      },
    }),
    prisma.lessons.create({
      data: {
        chapter_id: chapterId,
        title: `${marker}_foundation`,
        content: '<p>SQL SELECT 用于查询。</p>',
        order: 3,
        difficulty: 0,
        knowledge_index_policy: 'exclude',
      },
    }),
  ]);
  currentLessonId = currentLesson.id;
  nextLessonId = nextLesson.id;

  const weakExercise = await prisma.exercises.create({
    data: {
      lesson_id: currentLessonId,
      type: 'single_choice',
      content: `${marker}_weak_exercise`,
      answer: 'A',
      metadata: { options: ['A', 'B'] },
      review_status: 'approved',
      order: 1,
      knowledge_index_policy: 'exclude',
    },
  });
  weakExerciseId = weakExercise.id;
  await Promise.all([
    prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: weakExerciseId,
        answer: 'B',
        score: 20,
        submission_count: 1,
      },
    }),
    prisma.lessons_progress.create({
      data: {
        user_id: userId,
        lesson_id: nextLessonId,
        mastery_level: 30,
      },
    }),
    prisma.courses_progress.create({
      data: {
        user_id: userId,
        course_id: courseId,
        last_learned_at: new Date(),
      },
    }),
  ]);
});

afterAll(async () => {
  if (courseId) {
    await prisma.courses.deleteMany({ where: { id: courseId } });
  }
  await prisma.users.deleteMany({
    where: { id: { in: [userId, otherUserId].filter(Boolean) } },
  });
  await prisma.$disconnect();
});

describe('阶段 5 · 推荐、冷启动与学习数据隔离', () => {
  it('优先返回当前用户的错题和薄弱小节', async () => {
    const response = await request(app)
      .get(`/api/v1/recommendations/review?courseId=${courseId}&limit=5`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.mode).toBe('personalized');
    expect(response.body.data.items[0]).toMatchObject({
      type: 'exercise',
      exerciseId: weakExerciseId,
      source: 'learning_progress',
    });
    expect(
      response.body.data.items.some(
        (item: { lessonId: string; source: string }) =>
          item.lessonId === nextLessonId && item.source === 'mastery'
      )
    ).toBe(true);
  });

  it('不会把其他用户的错题或掌握度暴露给冷启动用户', async () => {
    const response = await request(app)
      .get(`/api/v1/recommendations/review?courseId=${courseId}&limit=5`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.mode).toBe('cold_start');
    expect(
      response.body.data.items.some(
        (item: { exerciseId?: string }) => item.exerciseId === weakExerciseId
      )
    ).toBe(false);
    expect(
      response.body.data.items.every(
        (item: { source: string }) => item.source === 'course_order'
      )
    ).toBe(true);
  });

  it('RAG 不可用时回退到同课程顺序且不推荐当前小节', async () => {
    const response = await request(app)
      .get(
        `/api/v1/recommendations/lessons/${currentLessonId}?courseId=${courseId}&limit=5`
      )
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.mode).toBe('fallback');
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(
      response.body.data.items.some(
        (item: { lessonId: string }) => item.lessonId === currentLessonId
      )
    ).toBe(false);
    expect(
      response.body.data.items.every(
        (item: { courseId: string }) => item.courseId === courseId
      )
    ).toBe(true);
  });
});

describe('阶段 5 · 推荐埋点', () => {
  it('同一 feed 的重复曝光幂等，并拒绝跨用户复用 token', async () => {
    const feedResponse = await request(app)
      .get(`/api/v1/recommendations/review?courseId=${courseId}&limit=1`)
      .set('Authorization', `Bearer ${userToken}`);
    const trackingToken = feedResponse.body.data.items[0].trackingToken;

    const first = await request(app)
      .post('/api/v1/recommendations/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ trackingToken, eventType: 'impression' });
    const duplicate = await request(app)
      .post('/api/v1/recommendations/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ trackingToken, eventType: 'impression' });
    const otherUser = await request(app)
      .post('/api/v1/recommendations/events')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ trackingToken, eventType: 'clicked' });

    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ received: 1, recorded: 1 });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data).toEqual({ received: 1, recorded: 0 });
    expect(otherUser.status).toBe(400);
  });

  it('批量事件先校验参数，非法事件不会写入', async () => {
    const feedResponse = await request(app)
      .get(`/api/v1/recommendations/review?courseId=${courseId}&limit=1`)
      .set('Authorization', `Bearer ${userToken}`);
    const trackingToken = feedResponse.body.data.items[0].trackingToken;
    const response = await request(app)
      .post('/api/v1/recommendations/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        events: [
          { trackingToken, eventType: 'clicked' },
          { trackingToken, eventType: 'unsupported' },
        ],
      });

    expect(response.status).toBe(400);
    const count = await prisma.ai_feedback_events.count({
      where: {
        user_id: userId,
        trace_id: feedResponse.body.data.feedId,
      },
    });
    expect(count).toBe(0);
  });
});

describe('阶段 5 · 参数与资源错误', () => {
  it('区分无效参数和不存在的资源', async () => {
    const invalid = await request(app)
      .get(`/api/v1/recommendations/review?courseId=${courseId}&limit=1.5`)
      .set('Authorization', `Bearer ${userToken}`);
    const missing = await request(app)
      .get(
        `/api/v1/recommendations/lessons/${randomUUID()}?courseId=${courseId}&limit=5`
      )
      .set('Authorization', `Bearer ${userToken}`);

    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('小节不存在');
  });
});
