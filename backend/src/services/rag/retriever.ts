import { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import { getAiEmbeddingConfig } from '../../config/ai';
import { embedQuery, type EmbeddingClient } from './embedding';
import { INDEX_VERSION } from './indexer';
import type {
  KnowledgeRetriever,
  KnowledgeSourceType,
  RetrieveOptions,
  RetrievedKnowledge,
} from './types';

const DEFAULT_TOP_K = 5;
const MAX_TOP_K = 10;
const QWEN_RETRIEVAL_INSTRUCTION =
  'Instruct: Given a Chinese programming course question, retrieve passages that directly help answer it.\nQuery: ';

interface RetrievalRow {
  source_type: KnowledgeSourceType;
  source_id: string;
  course_id: string | null;
  lesson_id: string | null;
  source_version: Date;
  chunk_index: number;
  content: string;
  content_hash: string;
  metadata: Prisma.JsonValue | null;
  score: number;
}

function formatEmbeddingQuery(query: string, model: string): string {
  return model.startsWith('Qwen/Qwen3-Embedding-')
    ? `${QWEN_RETRIEVAL_INSTRUCTION}${query}`
    : query;
}

async function assertRetrievalAccess(
  options: RetrieveOptions
): Promise<void> {
  const user = await prisma.users.findFirst({
    where: { id: options.userId, is_delete: 0 },
    select: { role: true },
  });
  if (!user) throw new Error('RAG_ACCESS_DENIED');
  if (options.purpose === 'admin_generation' && user.role !== 1) {
    throw new Error('RAG_ADMIN_REQUIRED');
  }

  const course = await prisma.courses.findFirst({
    where: { id: options.courseId, is_delete: 0 },
    select: { id: true },
  });
  if (!course) throw new Error('RAG_COURSE_NOT_FOUND');

  if (options.lessonId) {
    const lesson = await prisma.lessons.findFirst({
      where: {
        id: options.lessonId,
        is_delete: 0,
        chapters: {
          is_delete: 0,
          course_id: options.courseId,
          courses: { is_delete: 0 },
        },
      },
      select: { id: true },
    });
    if (!lesson) throw new Error('RAG_LESSON_SCOPE_INVALID');
  }
}

export class AuthorizedKnowledgeRetriever
  implements KnowledgeRetriever
{
  constructor(
    private readonly embeddingClient?: EmbeddingClient
  ) {}

  async retrieve(
    query: string,
    options: RetrieveOptions
  ): Promise<RetrievedKnowledge[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    await assertRetrievalAccess(options);

    const config = getAiEmbeddingConfig();
    const queryVector = await embedQuery(
      formatEmbeddingQuery(normalizedQuery, config.model),
      {
        client: this.embeddingClient,
        dimensions: config.dimensions,
      }
    );
    const vector = `[${queryVector.join(',')}]`;
    const topK = Math.min(
      Math.max(options.topK || DEFAULT_TOP_K, 1),
      MAX_TOP_K
    );
    const sourceTypes =
      options.sourceTypes?.length
        ? options.sourceTypes
        : (['lesson', 'exercise'] as KnowledgeSourceType[]);

    const rows = await prisma.$queryRaw<RetrievalRow[]>(
      Prisma.sql`
        SELECT
          k."source_type",
          k."source_id",
          k."course_id",
          k."lesson_id",
          k."source_version",
          k."chunk_index",
          k."content",
          k."content_hash",
          k."metadata",
          1 - (k."embedding" <=> ${vector}::vector) AS "score"
        FROM "knowledge_chunks" k
        INNER JOIN "knowledge_index_state" s
          ON s."source_type" = k."source_type"
          AND s."source_id" = k."source_id"
          AND s."source_updated_at" = k."source_version"
        WHERE k."is_delete" = 0
          AND k."course_id" = ${options.courseId}
          AND k."source_type" IN (
            ${Prisma.join(sourceTypes)}
          )
          AND s."status" = 'ready'
          AND s."embedding_model" = ${config.model}
          AND s."embedding_dimensions" = ${config.dimensions}
          AND s."index_version" = ${INDEX_VERSION}
          AND (
            (
              k."source_type" = 'lesson'
              AND EXISTS (
                SELECT 1
                FROM "lessons" l
                INNER JOIN "chapters" c
                  ON c."id" = l."chapter_id"
                INNER JOIN "courses" co
                  ON co."id" = c."course_id"
                WHERE l."id" = k."source_id"
                  AND l."is_delete" = 0
                  AND c."is_delete" = 0
                  AND co."is_delete" = 0
                  AND co."id" = ${options.courseId}
              )
            ) OR (
              k."source_type" = 'exercise'
              AND EXISTS (
                SELECT 1
                FROM "exercises" e
                INNER JOIN "lessons" l
                  ON l."id" = e."lesson_id"
                INNER JOIN "chapters" c
                  ON c."id" = l."chapter_id"
                INNER JOIN "courses" co
                  ON co."id" = c."course_id"
                WHERE e."id" = k."source_id"
                  AND e."is_delete" = 0
                  AND COALESCE(e."source", 'static') <> 'ai'
                  AND l."is_delete" = 0
                  AND c."is_delete" = 0
                  AND co."is_delete" = 0
                  AND co."id" = ${options.courseId}
              )
            )
          )
        ORDER BY k."embedding" <=> ${vector}::vector
        LIMIT ${topK}
      `
    );

    return rows.map((row) => ({
      sourceType: row.source_type,
      sourceId: row.source_id,
      courseId: row.course_id || undefined,
      lessonId: row.lesson_id || undefined,
      sourceVersion: row.source_version,
      chunkIndex: row.chunk_index,
      content: row.content,
      contentHash: row.content_hash,
      metadata:
        row.metadata &&
        typeof row.metadata === 'object' &&
        !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : undefined,
      score: Number(row.score),
    }));
  }
}

export function createKnowledgeRetriever(
  embeddingClient?: EmbeddingClient
): KnowledgeRetriever {
  return new AuthorizedKnowledgeRetriever(embeddingClient);
}
