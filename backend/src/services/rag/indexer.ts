import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma';
import prisma from '../../config/prisma';
import { getAiEmbeddingConfig } from '../../config/ai';
import { logger } from '../../config/logger';
import { splitKnowledgeSource } from './chunker';
import {
  embedDocumentsInBatches,
  type EmbeddingClient,
} from './embedding';
import { loadKnowledgeSourceAssessment } from './source';
import type {
  KnowledgeIndexResult,
  KnowledgeIndexStatus,
  KnowledgeIndexTicket,
  KnowledgeSourceType,
} from './types';

type TransactionClient = Prisma.TransactionClient;
const INDEX_VERSION = 'rag-v1';

function getEmbeddingIdentity(): {
  model: string;
  dimensions: number;
} {
  const parsedDimensions = Number(
    process.env.AI_EMBEDDING_DIMENSIONS || 1024
  );
  return {
    model:
      process.env.AI_EMBEDDING_MODEL?.trim() ||
      'Qwen/Qwen3-Embedding-4B',
    dimensions:
      Number.isInteger(parsedDimensions) &&
      parsedDimensions > 0
        ? parsedDimensions
        : 1024,
  };
}

function normalizeErrorCode(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'UNKNOWN_INDEX_ERROR';
  return message
    .split(':', 1)[0]
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 100) || 'UNKNOWN_INDEX_ERROR';
}

function vectorLiteral(vector: number[]): string {
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error('EMBEDDING_NON_FINITE');
  }
  return `[${vector.join(',')}]`;
}

export async function queueKnowledgeSource(
  tx: TransactionClient,
  sourceType: KnowledgeSourceType,
  sourceId: string,
  sourceUpdatedAt: Date
): Promise<KnowledgeIndexTicket> {
  const config = getEmbeddingIdentity();
  const rows = await tx.$queryRaw<Array<{ index_generation: bigint }>>(
    Prisma.sql`
      INSERT INTO "knowledge_index_state" (
        "id", "source_type", "source_id", "source_updated_at",
        "index_generation", "status", "error_code",
        "embedding_model", "embedding_dimensions", "index_version",
        "created_at", "updated_at"
      )
      VALUES (
        ${randomUUID()}, ${sourceType}, ${sourceId}, ${sourceUpdatedAt},
        1, 'pending', NULL,
        ${config.model}, ${config.dimensions}, ${INDEX_VERSION},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("source_type", "source_id")
      DO UPDATE SET
        "source_updated_at" = EXCLUDED."source_updated_at",
        "index_generation" =
          "knowledge_index_state"."index_generation" + 1,
        "status" = 'pending',
        "error_code" = NULL,
        "embedding_model" = EXCLUDED."embedding_model",
        "embedding_dimensions" = EXCLUDED."embedding_dimensions",
        "index_version" = EXCLUDED."index_version",
        "updated_at" = CURRENT_TIMESTAMP
      RETURNING "index_generation"
    `
  );

  return {
    sourceType,
    sourceId,
    sourceUpdatedAt,
    generation: rows[0].index_generation,
  };
}

export async function queueLessonKnowledge(
  tx: TransactionClient,
  lessonId: string
): Promise<KnowledgeIndexTicket[]> {
  const lesson = await tx.lessons.findFirst({
    where: { id: lessonId, is_delete: 0 },
    select: { id: true, updated_at: true },
  });
  if (!lesson) return [];

  const exercises = await tx.exercises.findMany({
    where: {
      lesson_id: lessonId,
      is_delete: 0,
      review_status: 'approved',
    },
    select: { id: true, updated_at: true },
  });

  await invalidateHiddenLessonExercises(tx, lessonId);

  const tickets = [
    await queueKnowledgeSource(
      tx,
      'lesson',
      lesson.id,
      lesson.updated_at
    ),
  ];
  for (const exercise of exercises) {
    tickets.push(
      await queueKnowledgeSource(
        tx,
        'exercise',
        exercise.id,
        exercise.updated_at
      )
    );
  }
  return tickets;
}

export async function queueLessonsKnowledge(
  tx: TransactionClient,
  lessonIds: string[]
): Promise<KnowledgeIndexTicket[]> {
  const tickets: KnowledgeIndexTicket[] = [];
  for (const lessonId of [...new Set(lessonIds)]) {
    tickets.push(...(await queueLessonKnowledge(tx, lessonId)));
  }
  return tickets;
}

async function invalidateHiddenLessonExercises(
  tx: TransactionClient,
  lessonId: string
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_chunks"
      SET "is_delete" = 1, "updated_at" = CURRENT_TIMESTAMP
      WHERE "source_type" = 'exercise'
        AND "source_id" IN (
          SELECT "id" FROM "exercises"
          WHERE "lesson_id" = ${lessonId}
            AND ("is_delete" <> 0 OR "review_status" <> 'approved')
        )
    `
  );
  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_index_state"
      SET
        "index_generation" = "index_generation" + 1,
        "status" = 'invalid',
        "error_code" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "source_type" = 'exercise'
        AND "source_id" IN (
          SELECT "id" FROM "exercises"
          WHERE "lesson_id" = ${lessonId}
            AND ("is_delete" <> 0 OR "review_status" <> 'approved')
        )
    `
  );
}

export async function invalidateLessonKnowledge(
  tx: TransactionClient,
  lessonId: string
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_chunks"
      SET "is_delete" = 1, "updated_at" = CURRENT_TIMESTAMP
      WHERE "lesson_id" = ${lessonId}
    `
  );
  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_index_state"
      SET
        "index_generation" = "index_generation" + 1,
        "status" = 'invalid',
        "error_code" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE (
        "source_type" = 'lesson' AND "source_id" = ${lessonId}
      ) OR (
        "source_type" = 'exercise'
        AND "source_id" IN (
          SELECT "id" FROM "exercises"
          WHERE "lesson_id" = ${lessonId}
        )
      )
    `
  );
}

export async function invalidateLessonsKnowledge(
  tx: TransactionClient,
  lessonIds: string[]
): Promise<void> {
  const uniqueLessonIds = [...new Set(lessonIds)];
  if (uniqueLessonIds.length === 0) return;

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_chunks"
      SET "is_delete" = 1, "updated_at" = CURRENT_TIMESTAMP
      WHERE "lesson_id" IN (${Prisma.join(uniqueLessonIds)})
    `
  );
  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_index_state"
      SET
        "index_generation" = "index_generation" + 1,
        "status" = 'invalid',
        "error_code" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE (
        "source_type" = 'lesson'
        AND "source_id" IN (${Prisma.join(uniqueLessonIds)})
      ) OR (
        "source_type" = 'exercise'
        AND "source_id" IN (
          SELECT "id" FROM "exercises"
          WHERE "lesson_id" IN (${Prisma.join(uniqueLessonIds)})
        )
      )
    `
  );
}

export async function invalidateKnowledgeSource(
  tx: TransactionClient,
  sourceType: KnowledgeSourceType,
  sourceId: string
): Promise<void> {
  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_chunks"
      SET "is_delete" = 1, "updated_at" = CURRENT_TIMESTAMP
      WHERE "source_type" = ${sourceType}
        AND "source_id" = ${sourceId}
    `
  );
  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_index_state"
      SET
        "index_generation" = "index_generation" + 1,
        "status" = 'invalid',
        "error_code" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "source_type" = ${sourceType}
        AND "source_id" = ${sourceId}
    `
  );
}

async function markTicketFailed(
  ticket: KnowledgeIndexTicket,
  errorCode: string
): Promise<void> {
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "knowledge_index_state"
      SET
        "status" = 'failed',
        "error_code" = ${errorCode},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "source_type" = ${ticket.sourceType}
        AND "source_id" = ${ticket.sourceId}
        AND "index_generation" = ${ticket.generation}
        AND "source_updated_at" = ${ticket.sourceUpdatedAt}
    `
  );
}

async function markTicketNotIndexable(
  ticket: KnowledgeIndexTicket,
  status: 'needs_content' | 'needs_review' | 'excluded',
  errorCode: string
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const states = await tx.$queryRaw<
      Array<{
        index_generation: bigint;
        source_updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT "index_generation", "source_updated_at"
        FROM "knowledge_index_state"
        WHERE "source_type" = ${ticket.sourceType}
          AND "source_id" = ${ticket.sourceId}
        FOR UPDATE
      `
    );
    const state = states[0];
    if (
      !state ||
      state.index_generation !== ticket.generation ||
      state.source_updated_at.getTime() !==
        ticket.sourceUpdatedAt.getTime()
    ) {
      return false;
    }

    await tx.$executeRaw(
      Prisma.sql`
        DELETE FROM "knowledge_chunks"
        WHERE "source_type" = ${ticket.sourceType}
          AND "source_id" = ${ticket.sourceId}
      `
    );
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "knowledge_index_state"
        SET
          "status" = ${status},
          "error_code" = ${errorCode},
          "indexed_at" = NULL,
          "updated_at" = CURRENT_TIMESTAMP
        WHERE "source_type" = ${ticket.sourceType}
          AND "source_id" = ${ticket.sourceId}
          AND "index_generation" = ${ticket.generation}
      `
    );
    return true;
  });
}

export async function completeKnowledgeIndex(
  ticket: KnowledgeIndexTicket,
  options?: {
    embeddingClient?: EmbeddingClient;
    beforeSwapCommit?: () => Promise<void>;
  }
): Promise<KnowledgeIndexResult> {
  let embeddingCompleted = false;
  try {
    const assessment = await loadKnowledgeSourceAssessment(
      ticket.sourceType,
      ticket.sourceId
    );
    const source = assessment.source;
    if (
      !source ||
      source.sourceVersion.getTime() !==
        ticket.sourceUpdatedAt.getTime()
    ) {
      return {
        ticket,
        status: source ? 'stale' : 'invalid',
        chunkCount: 0,
      };
    }
    if (
      assessment.readiness &&
      assessment.readiness.status !== 'indexable'
    ) {
      const status = assessment.readiness.status;
      const updated = await markTicketNotIndexable(
        ticket,
        status,
        assessment.readiness.reasonCode || 'RAG_CONTENT_NOT_INDEXABLE'
      );
      return {
        ticket,
        status: updated ? status : 'stale',
        chunkCount: 0,
        errorCode: assessment.readiness.reasonCode,
      };
    }

    const chunks = await splitKnowledgeSource(source);
    const config = getAiEmbeddingConfig();
    const vectors = await embedDocumentsInBatches(
      chunks.map((chunk) => chunk.content),
      {
        client: options?.embeddingClient,
        batchSize: config.batchSize,
        dimensions: config.dimensions,
      }
    );
    embeddingCompleted = true;

    const swapped = await prisma.$transaction(async (tx) => {
      const states = await tx.$queryRaw<
        Array<{
          index_generation: bigint;
          source_updated_at: Date;
          status: string;
          embedding_model: string | null;
          embedding_dimensions: number | null;
          index_version: string | null;
        }>
      >(
        Prisma.sql`
          SELECT
            "index_generation", "source_updated_at", "status",
            "embedding_model", "embedding_dimensions", "index_version"
          FROM "knowledge_index_state"
          WHERE "source_type" = ${ticket.sourceType}
            AND "source_id" = ${ticket.sourceId}
          FOR UPDATE
        `
      );
      const state = states[0];
      if (
        !state ||
        state.index_generation !== ticket.generation ||
        state.source_updated_at.getTime() !==
          ticket.sourceUpdatedAt.getTime() ||
        state.embedding_model !== config.model ||
        state.embedding_dimensions !== config.dimensions ||
        state.index_version !== INDEX_VERSION
      ) {
        return false;
      }

      await tx.$executeRaw(
        Prisma.sql`
          DELETE FROM "knowledge_chunks"
          WHERE "source_type" = ${ticket.sourceType}
            AND "source_id" = ${ticket.sourceId}
        `
      );
      await options?.beforeSwapCommit?.();

      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        const metadata = JSON.stringify(chunk.metadata || {});
        const embedding = vectorLiteral(vectors[index]);
        await tx.$executeRaw(
          Prisma.sql`
            INSERT INTO "knowledge_chunks" (
              "id", "source_type", "source_id", "course_id",
              "lesson_id", "source_version", "chunk_index",
              "content", "content_hash", "embedding", "metadata",
              "created_at", "updated_at", "is_delete"
            )
            VALUES (
              ${randomUUID()}, ${chunk.sourceType}, ${chunk.sourceId},
              ${chunk.courseId || null}, ${chunk.lessonId || null},
              ${chunk.sourceVersion}, ${chunk.chunkIndex},
              ${chunk.content}, ${chunk.contentHash},
              ${embedding}::vector, ${metadata}::json,
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
            )
          `
        );
      }

      await tx.$executeRaw(
        Prisma.sql`
          UPDATE "knowledge_index_state"
          SET
            "status" = 'ready',
            "error_code" = NULL,
            "indexed_at" = CURRENT_TIMESTAMP,
            "updated_at" = CURRENT_TIMESTAMP
          WHERE "source_type" = ${ticket.sourceType}
            AND "source_id" = ${ticket.sourceId}
            AND "index_generation" = ${ticket.generation}
        `
      );
      return true;
    });

    return {
      ticket,
      status: swapped ? 'ready' : 'stale',
      chunkCount: swapped ? chunks.length : 0,
    };
  } catch (error) {
    const errorCode = normalizeErrorCode(error);
    if (!embeddingCompleted) {
      await markTicketFailed(ticket, errorCode).catch(() => undefined);
    }
    logger.warn(
      {
        source_type: ticket.sourceType,
        source_id: ticket.sourceId,
        generation: ticket.generation.toString(),
        error_code: errorCode,
      },
      'knowledge indexing failed'
    );
    return {
      ticket,
      status: 'failed',
      chunkCount: 0,
      errorCode,
    };
  }
}

export async function completeKnowledgeIndexes(
  tickets: KnowledgeIndexTicket[],
  options?: { embeddingClient?: EmbeddingClient }
): Promise<{
  status: KnowledgeIndexStatus;
  results: KnowledgeIndexResult[];
}> {
  const results: KnowledgeIndexResult[] = [];
  for (const ticket of tickets) {
    results.push(await completeKnowledgeIndex(ticket, options));
  }
  const readyCount = results.filter(
    (result) => result.status === 'ready'
  ).length;
  const failedCount = results.filter(
    (result) => result.status === 'failed'
  ).length;
  return {
    status:
      readyCount === results.length
        ? 'ready'
        : failedCount === results.length && results.length > 0
          ? 'failed'
          : 'partial',
    results,
  };
}

export { INDEX_VERSION };
