import '../src/config/env';
import { Prisma } from '../src/generated/prisma';
import prisma from '../src/config/prisma';
import {
  completeKnowledgeIndex,
  loadKnowledgeSourceAssessment,
} from '../src/services/rag';
import { parsePositiveInteger } from './lib/operations';
import {
  claimRagMaintenanceCandidate,
  invalidateClaimedRagSource,
  queueClaimedRagSource,
  type RagMaintenanceCandidate,
} from './lib/rag-maintenance';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const ageMinutes = parsePositiveInteger(argument('age-minutes'), 10, 43_200);
  const limit = parsePositiveInteger(argument('limit'), 100, 1_000);
  const candidates = await prisma.$queryRaw<RagMaintenanceCandidate[]>(Prisma.sql`
    SELECT "source_type", "source_id", "index_generation", "status",
      FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - "updated_at")) / 60)::int
        AS "age_minutes"
    FROM "knowledge_index_state"
    WHERE "status" = 'failed'
      OR ("status" IN ('pending', 'repairing') AND "updated_at" <=
        CURRENT_TIMESTAMP - (${ageMinutes} * INTERVAL '1 minute'))
    ORDER BY "updated_at" ASC
    LIMIT ${limit}
  `);
  const totals: Record<string, number> = {
    candidates: candidates.length,
    stalePending: candidates.filter((item) => item.status === 'pending').length,
    staleRepairing: candidates.filter((item) => item.status === 'repairing').length,
    failedBeforeRun: candidates.filter((item) => item.status === 'failed').length,
    ready: 0,
    failed: 0,
    stale: 0,
    generationConflicts: 0,
    invalid: 0,
    needs_content: 0,
    needs_review: 0,
    excluded: 0,
  };

  if (execute) {
    for (const candidate of candidates) {
      const claimed = await prisma.$transaction((tx) =>
        claimRagMaintenanceCandidate(tx, candidate, ageMinutes)
      );
      if (!claimed) {
        totals.generationConflicts += 1;
        continue;
      }
      const assessment = await loadKnowledgeSourceAssessment(
        candidate.source_type,
        candidate.source_id
      );
      if (!assessment.source) {
        const invalidated = await prisma.$transaction((tx) =>
          invalidateClaimedRagSource(tx, candidate)
        );
        if (invalidated) totals.invalid += 1;
        else totals.generationConflicts += 1;
        continue;
      }
      const source = assessment.source;
      const ticket = await prisma.$transaction((tx) =>
        queueClaimedRagSource(tx, candidate, source.sourceVersion)
      );
      if (!ticket) {
        totals.generationConflicts += 1;
        continue;
      }
      const result = await completeKnowledgeIndex(ticket);
      totals[result.status] += 1;
      if (result.status === 'stale') totals.generationConflicts += 1;
    }
  }

  process.stdout.write(`${JSON.stringify({
    event: 'rag_index_maintenance',
    generatedAt: new Date().toISOString(),
    dryRun: !execute,
    ageMinutes,
    limit,
    totals,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      index_generation: candidate.index_generation.toString(),
    })),
  })}\n`);
  if ((execute && totals.failed > 0) || (!execute && candidates.length > 0)) {
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: 'rag_index_maintenance_failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

