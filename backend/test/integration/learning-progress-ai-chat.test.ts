import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../../src/config/prisma';
import {
  markLessonStarted,
  updateLessonAndCourseProgress,
} from '../../src/services/courses/learning-progress.service';
import {
  appendLessonChatExchange,
  clearLessonChatMessages,
  getOrCreateLessonChatSession,
} from '../../src/services/ai/lesson-session.service';
import type { LessonAiContext } from '../../src/services/ai/lesson-context.service';
import {
  AI_CHAT_RETENTION_DAYS,
  deleteExpiredAiChatMessages,
} from '../../src/services/ai/chat-retention.service';

function assertSafeTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;
  expect(databaseUrl, '缺少 DATABASE_URL').toBeDefined();
  const databaseName = new URL(databaseUrl as string).pathname.slice(1);
  expect(databaseName, `拒绝在非测试库 "${databaseName}" 上运行`).toMatch(
    /(^|[_-])test($|[_-])/i
  );
}

const marker = `learning_${Date.now()}`;
let courseId = '';
let lessonIds: string[] = [];
let exerciseIds: string[] = [];
let userIds: string[] = [];

beforeAll(async () => {
  assertSafeTestDatabase();

  const [firstUser, secondUser] = await Promise.all([
    prisma.users.create({
      data: { email: `${marker}_1@example.com`, password: 'test-only' },
    }),
    prisma.users.create({
      data: { email: `${marker}_2@example.com`, password: 'test-only' },
    }),
  ]);
  userIds = [firstUser.id, secondUser.id];

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
  const lessons = await Promise.all([
    prisma.lessons.create({
      data: {
        chapter_id: chapter.id,
        title: `${marker}_lesson_1`,
        order: 1,
      },
    }),
    prisma.lessons.create({
      data: {
        chapter_id: chapter.id,
        title: `${marker}_lesson_2`,
        order: 2,
      },
    }),
  ]);
  lessonIds = lessons.map((lesson) => lesson.id);

  const exercises = await Promise.all([
    prisma.exercises.create({
      data: {
        lesson_id: lessonIds[0],
        type: 'single_choice',
        content: '题目 1',
        answer: 'A',
        order: 1,
      },
    }),
    prisma.exercises.create({
      data: {
        lesson_id: lessonIds[0],
        type: 'single_choice',
        content: '题目 2',
        answer: 'B',
        order: 2,
      },
    }),
    prisma.exercises.create({
      data: {
        lesson_id: lessonIds[1],
        type: 'single_choice',
        content: '题目 3',
        answer: 'C',
        order: 1,
      },
    }),
  ]);
  exerciseIds = exercises.map((exercise) => exercise.id);
});

afterAll(async () => {
  if (courseId) {
    await prisma.courses.deleteMany({ where: { id: courseId } });
  }
  if (userIds.length > 0) {
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

describe('小节开始与课程进度同步', () => {
  it('进入幂等、完成不降级，并在全部小节完成后标记课程完成', async () => {
    const userId = userIds[0];

    await markLessonStarted(lessonIds[0], userId);
    await markLessonStarted(lessonIds[0], userId);

    expect(
      await prisma.lessons_progress.count({
        where: { user_id: userId, lesson_id: lessonIds[0] },
      })
    ).toBe(1);
    expect(
      await prisma.lessons_progress.findUniqueOrThrow({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonIds[0],
          },
        },
      })
    ).toMatchObject({ status: 1 });
    expect(
      await prisma.courses_progress.findUniqueOrThrow({
        where: {
          user_id_course_id: {
            user_id: userId,
            course_id: courseId,
          },
        },
      })
    ).toMatchObject({
      status: 1,
      completed_lessons: 0,
      total_lessons: 2,
    });

    await prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: exerciseIds[0],
        answer: 'A',
        submission_count: 1,
        score: 100,
      },
    });
    await updateLessonAndCourseProgress(lessonIds[0], userId);

    expect(
      await prisma.courses_progress.findUniqueOrThrow({
        where: {
          user_id_course_id: {
            user_id: userId,
            course_id: courseId,
          },
        },
      })
    ).toMatchObject({ status: 1, completed_lessons: 0 });

    await prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: exerciseIds[1],
        answer: 'B',
        submission_count: 1,
        score: 100,
      },
    });
    await updateLessonAndCourseProgress(lessonIds[0], userId);
    await markLessonStarted(lessonIds[0], userId);

    expect(
      await prisma.lessons_progress.findUniqueOrThrow({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonIds[0],
          },
        },
      })
    ).toMatchObject({ status: 2 });
    expect(
      await prisma.courses_progress.findUniqueOrThrow({
        where: {
          user_id_course_id: {
            user_id: userId,
            course_id: courseId,
          },
        },
      })
    ).toMatchObject({ status: 1, completed_lessons: 1 });

    await markLessonStarted(lessonIds[1], userId);
    await prisma.answer.create({
      data: {
        user_id: userId,
        exercise_id: exerciseIds[2],
        answer: 'C',
        submission_count: 1,
        score: 100,
      },
    });
    await updateLessonAndCourseProgress(lessonIds[1], userId);

    expect(
      await prisma.courses_progress.findUniqueOrThrow({
        where: {
          user_id_course_id: {
            user_id: userId,
            course_id: courseId,
          },
        },
      })
    ).toMatchObject({
      status: 2,
      completed_lessons: 2,
      total_lessons: 2,
    });
  });
});

describe('AI 对话成对保存与清空隔离', () => {
  it('只保存完整问答，清空仅影响当前用户当前小节', async () => {
    const context: LessonAiContext = {
      lessonId: lessonIds[0],
      exerciseId: exerciseIds[0],
      courseTitle: `${marker}_course`,
      chapterTitle: `${marker}_chapter`,
      lessonTitle: `${marker}_lesson_1`,
      lessonContent: '测试内容',
      exercise: {
        type: 'single_choice',
        content: '题目 1',
        knowledge: '测试知识点',
      },
    };
    const firstSession = await getOrCreateLessonChatSession(userIds[0], context);
    const secondSession = await getOrCreateLessonChatSession(userIds[1], context);

    const firstExchange = await appendLessonChatExchange(
      firstSession.id,
      ' 用户问题 ',
      ' 助手回答 ',
      { exerciseId: exerciseIds[0] },
      { exerciseId: exerciseIds[0] }
    );
    await appendLessonChatExchange(secondSession.id, '另一个问题', '另一个回答');
    await appendLessonChatExchange(firstSession.id, '失败问题', '   ');

    expect(
      await prisma.ai_chat_messages.count({
        where: { session_id: firstSession.id, is_delete: 0 },
      })
    ).toBe(2);

    const deletedCount = await clearLessonChatMessages(
      userIds[0],
      lessonIds[0]
    );
    expect(deletedCount).toBe(2);
    expect(
      await prisma.ai_chat_messages.count({
        where: { session_id: firstSession.id, is_delete: 0 },
      })
    ).toBe(0);
    expect(
      await prisma.ai_chat_messages.count({
        where: {
          session_id: firstSession.id,
          is_delete: 1,
          deleted_at: { not: null },
        },
      })
    ).toBe(2);
    expect(
      await prisma.ai_chat_messages.count({
        where: { session_id: secondSession.id, is_delete: 0 },
      })
    ).toBe(2);
    expect(
      await prisma.answer.count({
        where: { user_id: userIds[0], exercise_id: exerciseIds[0] },
      })
    ).toBe(1);
    expect(
      await prisma.lessons_progress.findUniqueOrThrow({
        where: {
          user_id_lesson_id: {
            user_id: userIds[0],
            lesson_id: lessonIds[0],
          },
        },
      })
    ).toMatchObject({ status: 2 });

    expect(firstExchange).not.toBeNull();
    const cleanupNow = new Date('2026-07-28T12:00:00.000Z');
    await prisma.ai_chat_messages.update({
      where: { id: firstExchange!.userMessage.id },
      data: {
        deleted_at: new Date(
          cleanupNow.getTime() -
            (AI_CHAT_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1_000
        ),
      },
    });
    await prisma.ai_chat_messages.update({
      where: { id: firstExchange!.assistantMessage.id },
      data: {
        deleted_at: new Date(
          cleanupNow.getTime() -
            (AI_CHAT_RETENTION_DAYS - 1) * 24 * 60 * 60 * 1_000
        ),
      },
    });

    expect(await deleteExpiredAiChatMessages(cleanupNow)).toBe(1);
    expect(
      await prisma.ai_chat_messages.findUnique({
        where: { id: firstExchange!.userMessage.id },
      })
    ).toBeNull();
    expect(
      await prisma.ai_chat_messages.findUnique({
        where: { id: firstExchange!.assistantMessage.id },
      })
    ).not.toBeNull();
  });
});
