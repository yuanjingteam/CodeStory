import '../src/config/env';
import prisma from '../src/config/prisma';
import { getAiEmbeddingConfig } from '../src/config/ai';
import { createKnowledgeRetriever } from '../src/services/rag';

async function main(): Promise<void> {
  const embeddingConfig = getAiEmbeddingConfig();
  const user = await prisma.users.findFirst({
    where: { is_delete: 0 },
    select: { id: true },
  });
  const readyLessonStates = await prisma.knowledge_index_state.findMany({
    where: {
      source_type: 'lesson',
      status: 'ready',
      embedding_model: embeddingConfig.model,
      embedding_dimensions: embeddingConfig.dimensions,
    },
    select: { source_id: true },
    orderBy: { indexed_at: 'asc' },
  });
  const lesson = await prisma.lessons.findFirst({
    where: {
      id: { in: readyLessonStates.map((state) => state.source_id) },
      is_delete: 0,
      chapters: {
        is_delete: 0,
        courses: { is_delete: 0 },
      },
    },
    select: {
      id: true,
      title: true,
      chapters: { select: { course_id: true } },
    },
    orderBy: { created_at: 'asc' },
  });
  if (!user || !lesson) {
    throw new Error('RAG_RETRIEVAL_FIXTURE_MISSING');
  }

  const results = await createKnowledgeRetriever().retrieve(
    `请解释“${lesson.title}”的核心知识`,
    {
      userId: user.id,
      courseId: lesson.chapters.course_id,
      lessonId: lesson.id,
      purpose: 'student_chat',
      topK: 5,
    }
  );
  process.stdout.write(
    `${JSON.stringify({
      queryLessonId: lesson.id,
      resultCount: results.length,
      results: results.map((result) => ({
        sourceType: result.sourceType,
        sourceId: result.sourceId,
        chunkIndex: result.chunkIndex,
        contentHash: result.contentHash,
        score: result.score,
      })),
    })}\n`
  );
  if (results.length === 0) {
    throw new Error('RAG_RETRIEVAL_EMPTY');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
