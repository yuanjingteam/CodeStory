import '../src/config/env';
import { Prisma } from '../src/generated/prisma';
import prisma from '../src/config/prisma';
import {
  completeKnowledgeIndex,
  invalidateKnowledgeSource,
  loadKnowledgeSourceAssessment,
  queueKnowledgeSource,
  type KnowledgeSourceType,
} from '../src/services/rag';

function parsePositiveArgument(
  name: string,
  fallback: number
): number {
  const prefix = `--${name}=`;
  const value = Number(
    process.argv
      .find((argument) => argument.startsWith(prefix))
      ?.slice(prefix.length)
  );
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function main(): Promise<void> {
  const ageMinutes = parsePositiveArgument('age-minutes', 5);
  const limit = Math.min(
    parsePositiveArgument('limit', 100),
    1_000
  );
  const states = await prisma.$queryRaw<
    Array<{
      source_type: KnowledgeSourceType;
      source_id: string;
    }>
  >(
    Prisma.sql`
      SELECT "source_type", "source_id"
      FROM "knowledge_index_state"
      WHERE "status" = 'failed'
        OR (
          "status" = 'pending'
          AND "updated_at" <=
            CURRENT_TIMESTAMP - (${ageMinutes} * INTERVAL '1 minute')
        )
      ORDER BY "updated_at" ASC
      LIMIT ${limit}
    `
  );

  const totals = {
    candidates: states.length,
    ready: 0,
    failed: 0,
    stale: 0,
    invalid: 0,
    needs_content: 0,
    needs_review: 0,
    excluded: 0,
  };
  for (const state of states) {
    const assessment = await loadKnowledgeSourceAssessment(
      state.source_type,
      state.source_id
    );
    const source = assessment.source;
    if (!source) {
      await prisma.$transaction((tx) =>
        invalidateKnowledgeSource(
          tx,
          state.source_type,
          state.source_id
        )
      );
      totals.invalid += 1;
      continue;
    }

    const ticket = await prisma.$transaction((tx) =>
      queueKnowledgeSource(
        tx,
        source.sourceType,
        source.sourceId,
        source.sourceVersion
      )
    );
    const result = await completeKnowledgeIndex(ticket);
    totals[result.status] += 1;
  }

  process.stdout.write(`${JSON.stringify({ totals })}\n`);
  if (totals.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
