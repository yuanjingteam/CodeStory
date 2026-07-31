import '../src/config/env';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '../src/generated/prisma';
import prisma from '../src/config/prisma';
import {
  completeKnowledgeIndexes,
  loadKnowledgeSourceAssessment,
  queueKnowledgeSource,
  type KnowledgeIndexTicket,
} from '../src/services/rag';
import { ragEvalDatasetSchema } from '../evals/rag-types';

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

type ReviewedSource = {
  sourceType: 'lesson' | 'exercise';
  sourceId: string;
  contentHash: string;
};

async function main(): Promise<void> {
  const dataset = ragEvalDatasetSchema.parse(
    JSON.parse(
      await readFile(
        path.resolve(
          'evals/datasets/rag-candidates.generated.json'
        ),
        'utf8'
      )
    )
  );
  const approvedSources = new Map<
    string,
    ReviewedSource
  >();
  for (const item of dataset.cases) {
    if (item.reviewStatus !== 'approved') continue;
    for (const source of item.expectedSources) {
      approvedSources.set(
        `${source.sourceType}:${source.sourceId}`,
        source
      );
    }
  }

  const sourcesToInclude: ReviewedSource[] = [];
  const mismatches: string[] = [];
  for (const [key, label] of approvedSources) {
    const assessment = await loadKnowledgeSourceAssessment(
      label.sourceType,
      label.sourceId
    );
    if (
      !assessment.source ||
      !assessment.readiness ||
      hashContent(assessment.source.content) !== label.contentHash
    ) {
      mismatches.push(key);
      continue;
    }
    if (assessment.readiness.status === 'needs_review') {
      sourcesToInclude.push(label);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(
      `RAG_APPROVED_SOURCE_CHANGED:${mismatches.join(',')}`
    );
  }

  const summary = {
    approvedCases: dataset.cases.filter(
      (item) => item.reviewStatus === 'approved'
    ).length,
    approvedSources: approvedSources.size,
    sourcesToInclude: sourcesToInclude.length,
  };
  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ dryRun: true, ...summary }, null, 2));
    return;
  }

  const tickets: KnowledgeIndexTicket[] = [];
  await prisma.$transaction(async (tx) => {
    for (const source of sourcesToInclude) {
      if (source.sourceType === 'lesson') {
        const lesson = await tx.lessons.update({
          where: { id: source.sourceId },
          data: { knowledge_index_policy: 'include' },
          select: { id: true, updated_at: true },
        });
        tickets.push(
          await queueKnowledgeSource(
            tx,
            'lesson',
            lesson.id,
            lesson.updated_at
          )
        );
      } else {
        const exercise = await tx.exercises.update({
          where: { id: source.sourceId },
          data: { knowledge_index_policy: 'include' },
          select: { id: true, updated_at: true },
        });
        tickets.push(
          await queueKnowledgeSource(
            tx,
            'exercise',
            exercise.id,
            exercise.updated_at
          )
        );
      }
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const results = await completeKnowledgeIndexes(tickets);
  console.log(
    JSON.stringify(
      {
        dryRun: false,
        ...summary,
        indexed: results.results.filter(
          (result) => result.status === 'ready'
        ).length,
        failed: results.results.filter(
          (result) => result.status === 'failed'
        ).length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
