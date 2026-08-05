import { randomUUID } from 'node:crypto';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';
import { createGuidedLearningGraph } from '../../src/services/ai/learning-graph/graph';
import {
  advanceGuidedLearning,
  closeGuidedLearningRuntime,
  resumeGuidedLearning,
  startGuidedLearning,
} from '../../src/services/ai/learning-graph/service';
import {
  GuidedLearningConflictError,
  GuidedLearningNotFoundError,
  GuidedLearningRestartRequiredError,
} from '../../src/services/ai/learning-graph/types';
import {
  GUIDED_PHASE_CODE,
  GUIDED_LEARNING_PHASES,
} from '../../src/services/ai/learning-graph/types';
import { uuidToShortId } from '../../src/utils/idTransform';

vi.mock(
  '../../src/services/ai/exercise-hint.service',
  () => ({
    generateExerciseHint: vi.fn(
      async ({ hintLevel }: { hintLevel: number }) =>
        `测试提示 ${hintLevel}`
    ),
  })
);

describe('阶段 4 · 功能开关关闭路径', () => {
  it('默认不注册引导式学习路由', async () => {
    expect(process.env.AI_GRAPH_ENABLED).not.toBe('true');

    const response = await request(app)
      .post('/api/v1/ai/guided/start')
      .send({ lessonId: '00000000-0000-4000-8000-000000000001' });

    expect(response.status).toBe(404);
  });
});

describe('阶段 4 · 状态投影编码', () => {
  it('每个公开状态都有唯一投影值', () => {
    expect(Object.keys(GUIDED_PHASE_CODE)).toEqual([
      ...GUIDED_LEARNING_PHASES,
    ]);
    expect(
      new Set(Object.values(GUIDED_PHASE_CODE)).size
    ).toBe(GUIDED_LEARNING_PHASES.length);
  });
});

describe('阶段 4 · PostgreSQL checkpoint 恢复', () => {
  const marker = `stage4_graph_${Date.now()}`;
  const runId = randomUUID();
  let userId = '';
  let courseId = '';
  let lessonId = '';
  let lessonShortId = '';
  let exerciseId = '';

  beforeAll(async () => {
    const user = await prisma.users.create({
      data: {
        email: `${marker}@example.com`,
        password: 'test-only',
      },
    });
    userId = user.id;
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
    const lesson = await prisma.lessons.create({
      data: {
        chapter_id: chapter.id,
        title: `${marker}_lesson`,
        content: '<p>测试正文</p>',
        order: 1,
      },
    });
    lessonId = lesson.id;
    lessonShortId = uuidToShortId(lesson.id);
    const exercise = await prisma.exercises.create({
      data: {
        lesson_id: lesson.id,
        type: 'single_choice',
        content: '请选择正确答案',
        answer: 'A. 正确',
        metadata: { options: ['A. 正确', 'B. 错误'] },
        hints: {
          level_1: '提示一',
          level_2: '提示二',
          level_3: '提示三',
          _meta: { max_level: 3 },
        },
        review_status: 'approved',
        order: 1,
      },
    });
    exerciseId = exercise.id;
    const saver = PostgresSaver.fromConnString(
      process.env.DATABASE_URL!
    );
    await saver.setup();
    await saver.end();
  });

  afterAll(async () => {
    await closeGuidedLearningRuntime();
    if (courseId) {
      await prisma.courses.deleteMany({
        where: { id: courseId },
      });
    }
    if (userId) {
      await prisma.users.deleteMany({ where: { id: userId } });
    }
  });

  it('重建图实例后仍恢复 WAIT_ANSWER、题目和提示等级', async () => {
    const databaseUrl = process.env.DATABASE_URL;
    expect(databaseUrl).toBeTruthy();
    const firstSaver = PostgresSaver.fromConnString(databaseUrl!);
    await firstSaver.setup();
    const firstGraph = createGuidedLearningGraph(firstSaver);
    const config = {
      configurable: { thread_id: runId },
      durability: 'sync' as const,
    };

    await firstGraph.invoke(
      {
        runId,
        graphVersion: 'guided-learning-v1',
        userId,
        lessonId,
        phase: 'INIT',
        explanation: null,
        exerciseId: null,
        exerciseContent: null,
        exerciseType: null,
        hintLevel: 0,
        hint: null,
        answer: null,
        feedback: null,
        score: null,
        correct: null,
        requiresHumanReview: false,
      },
      config
    );
    const firstState = await firstGraph.getState(config);
    expect(firstState.next).toContain('wait_answer');
    expect(firstState.values).toMatchObject({
      exerciseId,
      hintLevel: 0,
    });
    await firstSaver.end();

    const resumedSaver =
      PostgresSaver.fromConnString(databaseUrl!);
    const resumedGraph = createGuidedLearningGraph(resumedSaver);
    const resumedState = await resumedGraph.getState(config);
    expect(resumedState.next).toContain('wait_answer');
    expect(resumedState.values).toMatchObject({
      runId,
      exerciseId,
      hintLevel: 0,
    });
    await resumedSaver.deleteThread(runId);
    await resumedSaver.end();
  });

  it('CAS 只允许一个请求推进，effect 防止答案与提示重复', async () => {
    process.env.AI_GRAPH_ENABLED = 'true';
    process.env.AI_GRAPH_VERSION = 'guided-learning-v1';
    const started = await startGuidedLearning(userId, lessonId);
    expect(started).toMatchObject({
      phase: 'WAIT_ANSWER',
      stateVersion: 1,
      exerciseId,
    });

    const attempts = await Promise.allSettled([
      advanceGuidedLearning({
        userId,
        lessonId: lessonShortId,
        runId: started.runId,
        expectedStateVersion: started.stateVersion,
        answer: 'B',
      }),
      advanceGuidedLearning({
        userId,
        lessonId,
        runId: started.runId,
        expectedStateVersion: started.stateVersion,
        answer: 'B',
      }),
    ]);
    expect(
      attempts.filter((item) => item.status === 'fulfilled')
    ).toHaveLength(1);
    const rejected = attempts.find(
      (item) => item.status === 'rejected'
    );
    expect(
      rejected &&
        rejected.status === 'rejected' &&
        rejected.reason instanceof GuidedLearningConflictError
    ).toBe(true);

    const current = await resumeGuidedLearning(
      userId,
      lessonShortId,
      started.runId
    );
    expect(current).toMatchObject({
      phase: 'WAIT_ANSWER',
      stateVersion: 2,
      hintLevel: 1,
    });
    const [answer, effects] = await Promise.all([
      prisma.answer.findUnique({
        where: {
          user_id_exercise_id: {
            user_id: userId,
            exercise_id: exerciseId,
          },
        },
      }),
      prisma.learning_run_effects.findMany({
        where: { run_id: started.runId },
      }),
    ]);
    expect(answer).toMatchObject({
      submission_count: 1,
      hint_level_used: 1,
    });
    expect(
      effects.map((effect) => effect.effect_key).sort()
    ).toEqual([
      `${started.runId}:evaluate:0`,
      `${started.runId}:hint:1`,
    ]);
  });

  it('故障注入：图与副作用完成但响应失败后可补偿且不重复写入', async () => {
    process.env.AI_GRAPH_ENABLED = 'true';
    process.env.AI_GRAPH_VERSION = 'guided-learning-v1';
    const answerBefore = await prisma.answer.findUnique({
      where: {
        user_id_exercise_id: {
          user_id: userId,
          exercise_id: exerciseId,
        },
      },
      select: { submission_count: true },
    });
    const started = await startGuidedLearning(userId, lessonId);
    const injectedError = new Error('stage4_response_failure');

    await expect(
      advanceGuidedLearning(
        {
          userId,
          lessonId,
          runId: started.runId,
          expectedStateVersion: started.stateVersion,
          answer: 'B',
        },
        {
          afterGraphInvoke: () => {
            throw injectedError;
          },
        }
      )
    ).rejects.toBe(injectedError);

    const session = await prisma.ai_chat_sessions.findUniqueOrThrow({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
    });
    const recovered = await resumeGuidedLearning(
      userId,
      lessonId,
      started.runId
    );
    expect(recovered).toMatchObject({
      phase: 'WAIT_ANSWER',
      stateVersion: session.state_version,
      hintLevel: 1,
    });

    await expect(
      advanceGuidedLearning({
        userId,
        lessonId,
        runId: started.runId,
        expectedStateVersion: started.stateVersion,
        answer: 'B',
      })
    ).rejects.toBeInstanceOf(GuidedLearningConflictError);

    const [answer, effects] = await Promise.all([
      prisma.answer.findUniqueOrThrow({
        where: {
          user_id_exercise_id: {
            user_id: userId,
            exercise_id: exerciseId,
          },
        },
      }),
      prisma.learning_run_effects.findMany({
        where: { run_id: started.runId },
        orderBy: { effect_key: 'asc' },
      }),
    ]);
    expect(answer).toMatchObject({
      submission_count: (answerBefore?.submission_count || 0) + 1,
      hint_level_used: 1,
    });
    expect(effects.map((effect) => effect.effect_key)).toEqual([
      `${started.runId}:evaluate:0`,
      `${started.runId}:hint:1`,
    ]);
  });

  it('三级提示后进入人工复核，重学换发 run ID，旧 run 被拒绝', async () => {
    const firstSession = await prisma.ai_chat_sessions.findUniqueOrThrow({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
    });
    let state = await resumeGuidedLearning(
      userId,
      lessonId,
      firstSession.current_run_id!
    );
    for (let index = 0; index < 3; index += 1) {
      state = await advanceGuidedLearning({
        userId,
        lessonId,
        runId: state.runId,
        expectedStateVersion: state.stateVersion,
        answer: 'B',
      });
    }
    expect(state).toMatchObject({
      phase: 'REVIEW',
      hintLevel: 3,
      requiresHumanReview: true,
    });
    const review = await prisma.ai_grading_reviews.findFirst({
      where: {
        user_id: userId,
        exercise_id: exerciseId,
        trigger_reason: 'guided_review_pending',
      },
    });
    expect(review?.status).toBe('pending');

    const restarted = await startGuidedLearning(userId, lessonId);
    expect(restarted.runId).not.toBe(state.runId);
    await expect(
      resumeGuidedLearning(userId, lessonId, state.runId)
    ).rejects.toBeInstanceOf(GuidedLearningNotFoundError);

    process.env.AI_GRAPH_VERSION = 'guided-learning-v2';
    await expect(
      resumeGuidedLearning(
        userId,
        lessonId,
        restarted.runId
      )
    ).rejects.toBeInstanceOf(
      GuidedLearningRestartRequiredError
    );
    process.env.AI_GRAPH_VERSION = 'guided-learning-v1';
  });
});
