import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../../src/config/prisma';
import {
  AuthorizedKnowledgeRetriever,
  completeKnowledgeIndex,
  invalidateLessonsKnowledge,
  queueKnowledgeSource,
  type EmbeddingClient,
} from '../../src/services/rag';
import { getLessonAiContext } from '../../src/services/ai/lesson-context.service';
import { getLessonChatMessages } from '../../src/services/ai/lesson-session.service';

const closeVector = [
  1,
  ...Array.from({ length: 1023 }, () => 0),
];
const farVector = [
  0,
  1,
  ...Array.from({ length: 1022 }, () => 0),
];

const fakeEmbeddingClient: EmbeddingClient = {
  async embedDocuments(texts) {
    return texts.map((text) =>
      /WHERE|SELECT|SQL/i.test(text) ? closeVector : farVector
    );
  },
  async embedQuery() {
    return closeVector;
  },
};

describe('阶段 1 · 索引代次与授权检索', () => {
  const userId = randomUUID();
  const adminId = randomUUID();
  const courseId = randomUUID();
  const otherCourseId = randomUUID();
  const chapterId = randomUUID();
  const otherChapterId = randomUUID();
  const lessonId = randomUUID();
  const siblingLessonId = randomUUID();
  const otherLessonId = randomUUID();
  const exerciseId = randomUUID();
  const aiExerciseId = randomUUID();

  beforeAll(async () => {
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_EMBEDDING_MODEL =
      'Qwen/Qwen3-Embedding-4B';
    process.env.AI_EMBEDDING_DIMENSIONS = '1024';
    process.env.AI_RAG_ENABLED = 'true';

    await prisma.users.createMany({
      data: [
        {
          id: userId,
          email: `${userId}@example.com`,
          password: 'test',
          role: 0,
        },
        {
          id: adminId,
          email: `${adminId}@example.com`,
          password: 'test',
          role: 1,
        },
      ],
    });
    await prisma.courses.createMany({
      data: [
        { id: courseId, title: 'SQL 课程' },
        { id: otherCourseId, title: '其他课程' },
      ],
    });
    await prisma.chapters.createMany({
      data: [
        {
          id: chapterId,
          course_id: courseId,
          title: '查询',
          order: 1,
        },
        {
          id: otherChapterId,
          course_id: otherCourseId,
          title: '其他章节',
          order: 1,
        },
      ],
    });
    await prisma.lessons.createMany({
      data: [
        {
          id: lessonId,
          chapter_id: chapterId,
          title: 'WHERE',
          content:
            '<p>SELECT 查询可以使用 WHERE 子句过滤记录。WHERE 后面填写布尔条件，例如 status = 1；还可以通过 AND 与 OR 组合多个条件，并在执行前确认字段类型和索引是否适合当前查询。</p>',
          order: 1,
        },
        {
          id: siblingLessonId,
          chapter_id: chapterId,
          title: '同课程其他小节',
          content:
            '<p>SELECT 也可以使用 ORDER BY 排序，但这不是当前 WHERE 小节的内容。</p>',
          order: 2,
        },
        {
          id: otherLessonId,
          chapter_id: otherChapterId,
          title: '无关内容',
          content: '<p>这是另一个课程。</p>',
          order: 1,
        },
      ],
    });
    await prisma.exercises.createMany({
      data: [
        {
          id: exerciseId,
          lesson_id: lessonId,
          type: 'choice',
          content:
            '在 SQL SELECT 查询中，需要按照指定条件过滤数据行时，应使用哪个子句？',
          answer: 'WHERE',
          knowledge: 'SQL WHERE',
          source: 'static',
          order: 1,
        },
        {
          id: aiExerciseId,
          lesson_id: lessonId,
          type: 'choice',
          content: 'AI 生成题不能索引',
          answer: 'A',
          source: 'ai',
          order: 2,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('只提交当前代次，并拒绝过期 worker 覆盖', async () => {
    const original = await prisma.lessons.findUniqueOrThrow({
      where: { id: lessonId },
      select: { updated_at: true },
    });
    const staleTicket = await prisma.$transaction((tx) =>
      queueKnowledgeSource(
        tx,
        'lesson',
        lessonId,
        original.updated_at
      )
    );
    const nextUpdatedAt = new Date(
      original.updated_at.getTime() + 1_000
    );
    await prisma.lessons.update({
      where: { id: lessonId },
      data: {
        content:
          '<p>SELECT 查询使用 WHERE 子句过滤记录，多个条件可以用 AND 或 OR 连接。实际编写时应使用参数化查询传入值，避免字符串拼接带来的 SQL 注入风险，并根据查询频率评估是否需要建立索引。</p>',
        updated_at: nextUpdatedAt,
      },
    });
    const currentTicket = await prisma.$transaction((tx) =>
      queueKnowledgeSource(
        tx,
        'lesson',
        lessonId,
        nextUpdatedAt
      )
    );

    expect(
      (
        await completeKnowledgeIndex(staleTicket, {
          embeddingClient: fakeEmbeddingClient,
        })
      ).status
    ).toBe('stale');
    expect(
      (
        await completeKnowledgeIndex(currentTicket, {
          embeddingClient: fakeEmbeddingClient,
        })
      ).status
    ).toBe('ready');

    const generations = await prisma.knowledge_index_state.findUniqueOrThrow({
      where: {
        source_type_source_id: {
          source_type: 'lesson',
          source_id: lessonId,
        },
      },
      select: { index_generation: true, status: true },
    });
    expect(generations.index_generation).toBe(
      currentTicket.generation
    );
    expect(generations.status).toBe('ready');
  });

  it('Embedding 失败时保留上一代完整块并标记失败', async () => {
    const before = await prisma.knowledge_chunks.findMany({
      where: { source_type: 'lesson', source_id: lessonId },
      select: { content_hash: true },
    });
    const lesson = await prisma.lessons.findUniqueOrThrow({
      where: { id: lessonId },
      select: { updated_at: true },
    });
    const ticket = await prisma.$transaction((tx) =>
      queueKnowledgeSource(
        tx,
        'lesson',
        lessonId,
        lesson.updated_at
      )
    );
    const failingClient: EmbeddingClient = {
      async embedDocuments() {
        throw new Error('EMBEDDING_TEST_FAILURE');
      },
      async embedQuery() {
        throw new Error('EMBEDDING_TEST_FAILURE');
      },
    };

    const result = await completeKnowledgeIndex(ticket, {
      embeddingClient: failingClient,
    });
    const after = await prisma.knowledge_chunks.findMany({
      where: { source_type: 'lesson', source_id: lessonId },
      select: { content_hash: true },
    });
    const state = await prisma.knowledge_index_state.findUniqueOrThrow({
      where: {
        source_type_source_id: {
          source_type: 'lesson',
          source_id: lessonId,
        },
      },
      select: { status: true },
    });

    expect(result.status).toBe('failed');
    expect(after).toEqual(before);
    expect(state.status).toBe('failed');
  });

  it('换代事务失败时回滚删除并保持 pending 供修复', async () => {
    const before = await prisma.knowledge_chunks.findMany({
      where: { source_type: 'lesson', source_id: lessonId },
      select: { content_hash: true },
    });
    const lesson = await prisma.lessons.findUniqueOrThrow({
      where: { id: lessonId },
      select: { updated_at: true },
    });
    const ticket = await prisma.$transaction((tx) =>
      queueKnowledgeSource(
        tx,
        'lesson',
        lessonId,
        lesson.updated_at
      )
    );
    const result = await completeKnowledgeIndex(ticket, {
      embeddingClient: fakeEmbeddingClient,
      async beforeSwapCommit() {
        throw new Error('SWAP_TEST_FAILURE');
      },
    });
    const after = await prisma.knowledge_chunks.findMany({
      where: { source_type: 'lesson', source_id: lessonId },
      select: { content_hash: true },
    });
    const state = await prisma.knowledge_index_state.findUniqueOrThrow({
      where: {
        source_type_source_id: {
          source_type: 'lesson',
          source_id: lessonId,
        },
      },
      select: { status: true },
    });

    expect(result.status).toBe('failed');
    expect(after).toEqual(before);
    expect(state.status).toBe('pending');
  });

  it('按课程和来源边界检索，静态题可用但 AI 题不可用', async () => {
    for (const source of [
      { type: 'lesson' as const, id: lessonId },
      { type: 'lesson' as const, id: siblingLessonId },
      { type: 'exercise' as const, id: exerciseId },
      { type: 'exercise' as const, id: aiExerciseId },
    ]) {
      const record =
        source.type === 'lesson'
          ? await prisma.lessons.findUniqueOrThrow({
              where: { id: source.id },
              select: { updated_at: true },
            })
          : await prisma.exercises.findUniqueOrThrow({
              where: { id: source.id },
              select: { updated_at: true },
            });
      const ticket = await prisma.$transaction((tx) =>
        queueKnowledgeSource(
          tx,
          source.type,
          source.id,
          record.updated_at
        )
      );
      await completeKnowledgeIndex(ticket, {
        embeddingClient: fakeEmbeddingClient,
      });
    }

    const retriever = new AuthorizedKnowledgeRetriever(
      fakeEmbeddingClient
    );
    const results = await retriever.retrieve('WHERE 怎么用？', {
      userId,
      courseId,
      lessonId,
      purpose: 'student_chat',
      topK: 10,
    });

    expect(results.some((item) => item.sourceId === lessonId)).toBe(
      true
    );
    expect(
      results.some((item) => item.sourceId === exerciseId)
    ).toBe(true);
    expect(
      results.some((item) => item.sourceId === aiExerciseId)
    ).toBe(false);

    const scopedResults = await retriever.retrieve('SELECT 怎么用？', {
      userId,
      courseId,
      lessonId,
      purpose: 'student_chat',
      topK: 10,
      strictLessonScope: true,
    });
    expect(
      scopedResults.every(
        (item) => item.lessonId === lessonId
      )
    ).toBe(true);
    expect(
      scopedResults.some(
        (item) => item.sourceId === siblingLessonId
      )
    ).toBe(false);
    await expect(
      retriever.retrieve('WHERE', {
        userId,
        courseId: otherCourseId,
        lessonId,
        purpose: 'student_chat',
      })
    ).rejects.toThrow('RAG_LESSON_SCOPE_INVALID');
    await expect(
      retriever.retrieve('WHERE', {
        userId,
        courseId,
        purpose: 'admin_generation',
      })
    ).rejects.toThrow('RAG_ADMIN_REQUIRED');
    await expect(
      retriever.retrieve('WHERE', {
        userId: adminId,
        courseId,
        purpose: 'admin_generation',
      })
    ).resolves.toBeDefined();
  });

  it('短小节直接使用完整上下文且不调用 Embedding', async () => {
    const context = await getLessonAiContext(
      lessonId,
      undefined,
      {
        userId,
        query: 'WHERE 怎么用？',
        retriever: {
          async retrieve() {
            throw new Error('不应调用向量检索');
          },
        },
      }
    );

    expect(context?.retrievalMode).toBe('full_context');
    expect(context?.evidenceQuality).toBe('strong');
    expect(context?.evidence).toHaveLength(1);
    expect(context?.evidence[0].sourceId).toBe(lessonId);
  });

  it('历史消息保留回答范围、证据质量和课程来源', async () => {
    const session = await prisma.ai_chat_sessions.create({
      data: {
        user_id: userId,
        lesson_id: lessonId,
      },
    });
    await prisma.ai_chat_messages.create({
      data: {
        session_id: session.id,
        role: 'assistant',
        message_type: 'chat',
        content: 'WHERE 用于过滤记录 [1]。',
        metadata: {
          answerScope: 'course',
          promptVersion: 'grounded-v3',
          promptRevision: 'grounded-v3.1-boundary',
          evidenceQuality: 'strong',
          sources: [
            {
              index: 1,
              sourceType: 'lesson',
              sourceId: lessonId,
              title: 'WHERE',
              chunkIndex: 0,
              contentHash: 'a'.repeat(64),
              score: 1,
            },
          ],
        },
      },
    });

    const messages = await getLessonChatMessages(session.id);
    expect(messages[0]).toMatchObject({
      answerScope: 'course',
      promptVersion: 'grounded-v3',
      promptRevision: 'grounded-v3.1-boundary',
      evidenceQuality: 'strong',
      sources: [
        {
          index: 1,
          sourceId: lessonId,
          title: 'WHERE',
        },
      ],
    });
  });

  it('层级删除可在同一事务内使下属索引全部失效', async () => {
    await prisma.$transaction((tx) =>
      invalidateLessonsKnowledge(tx, [lessonId])
    );
    const states = await prisma.knowledge_index_state.findMany({
      where: {
        OR: [
          { source_type: 'lesson', source_id: lessonId },
          {
            source_type: 'exercise',
            source_id: { in: [exerciseId, aiExerciseId] },
          },
        ],
      },
      select: { status: true },
    });
    const activeChunks = await prisma.knowledge_chunks.count({
      where: { lesson_id: lessonId, is_delete: 0 },
    });

    expect(states.every((state) => state.status === 'invalid')).toBe(
      true
    );
    expect(activeChunks).toBe(0);
  });
});
