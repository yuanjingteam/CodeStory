import { Prisma } from '../../src/generated/prisma';
import {
  queueKnowledgeSource,
  type KnowledgeSourceType,
} from '../../src/services/rag';

type TransactionClient = Prisma.TransactionClient;

export interface RagMaintenanceCandidate {
  source_type: KnowledgeSourceType;
  source_id: string;
  index_generation: bigint;
  status: string;
  age_minutes: number;
}

export async function claimRagMaintenanceCandidate(
  tx: TransactionClient,
  candidate: RagMaintenanceCandidate,
  ageMinutes: number
): Promise<boolean> {
  const claimed = await tx.$queryRaw<Array<{ index_generation: bigint }>>(
    Prisma.sql`
      UPDATE "knowledge_index_state"
      SET "status" = 'repairing', "error_code" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "source_type" = ${candidate.source_type}
        AND "source_id" = ${candidate.source_id}
        AND "index_generation" = ${candidate.index_generation}
        AND "status" = ${candidate.status}
        AND (
          "status" = 'failed'
          OR (
            "status" IN ('pending', 'repairing')
            AND "updated_at" <= CURRENT_TIMESTAMP -
              (${ageMinutes} * INTERVAL '1 minute')
          )
        )
      RETURNING "index_generation"
    `
  );
  return claimed.length === 1;
}

export async function queueClaimedRagSource(
  tx: TransactionClient,
  candidate: RagMaintenanceCandidate,
  sourceUpdatedAt: Date
) {
  const locked = await tx.$queryRaw<Array<{ index_generation: bigint }>>(
    Prisma.sql`
      SELECT "index_generation"
      FROM "knowledge_index_state"
      WHERE "source_type" = ${candidate.source_type}
        AND "source_id" = ${candidate.source_id}
        AND "index_generation" = ${candidate.index_generation}
        AND "status" = 'repairing'
      FOR UPDATE
    `
  );
  if (locked.length !== 1) return null;
  return queueKnowledgeSource(
    tx,
    candidate.source_type,
    candidate.source_id,
    sourceUpdatedAt
  );
}

export async function invalidateClaimedRagSource(
  tx: TransactionClient,
  candidate: RagMaintenanceCandidate
): Promise<boolean> {
  const invalidated = await tx.$queryRaw<Array<{ index_generation: bigint }>>(
    Prisma.sql`
      UPDATE "knowledge_index_state"
      SET "index_generation" = "index_generation" + 1,
        "status" = 'invalid', "error_code" = NULL,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "source_type" = ${candidate.source_type}
        AND "source_id" = ${candidate.source_id}
        AND "index_generation" = ${candidate.index_generation}
        AND "status" = 'repairing'
      RETURNING "index_generation"
    `
  );
  if (invalidated.length !== 1) return false;
  await tx.$executeRaw(Prisma.sql`
    UPDATE "knowledge_chunks"
    SET "is_delete" = 1, "updated_at" = CURRENT_TIMESTAMP
    WHERE "source_type" = ${candidate.source_type}
      AND "source_id" = ${candidate.source_id}
  `);
  return true;
}

