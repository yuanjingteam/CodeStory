import '../src/config/env';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '../src/generated/prisma';
import prisma from '../src/config/prisma';
import {
  completeKnowledgeIndexes,
  invalidateLessonKnowledge,
  loadKnowledgeSourceAssessment,
  queueKnowledgeSource,
  type KnowledgeIndexTicket,
} from '../src/services/rag';
import { ragEvalDatasetSchema } from '../evals/rag-types';

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function main(): Promise<void> {
  const datasetPath = path.resolve(
    'evals/datasets/rag-candidates.generated.json'
  );
  const dataset = ragEvalDatasetSchema.parse(
    JSON.parse(await readFile(datasetPath, 'utf8'))
  );
  const rejected = dataset.cases.filter(
    (item) => item.reviewStatus === 'rejected'
  );
  const sources = new Map<
    string,
    {
      sourceType: 'lesson' | 'exercise';
      sourceId: string;
      contentHash: string;
      notes: Set<string>;
    }
  >();
  for (const item of rejected) {
    for (const label of item.expectedSources) {
      const key = `${label.sourceType}:${label.sourceId}`;
      const current = sources.get(key) || {
        ...label,
        notes: new Set<string>(),
      };
      if (item.reviewerNote) current.notes.add(item.reviewerNote);
      sources.set(key, current);
    }
  }

  const testLessonIds = [...sources.values()]
    .filter(
      (source) =>
        source.sourceType === 'lesson' &&
        [...source.notes].some((note) => note.includes('测试数据'))
    )
    .map((source) => source.sourceId);
  const mismatches: string[] = [];
  for (const [key, label] of sources) {
    const assessment = await loadKnowledgeSourceAssessment(
      label.sourceType,
      label.sourceId
    );
    const alreadyGovernedTestLesson =
      label.sourceType === 'lesson' &&
      testLessonIds.includes(label.sourceId) &&
      !assessment.source &&
      Boolean(
        await prisma.lessons.findFirst({
          where: {
            id: label.sourceId,
            is_delete: 1,
            knowledge_index_policy: 'exclude',
          },
          select: { id: true },
        })
      );
    if (
      !alreadyGovernedTestLesson &&
      (!assessment.source ||
        hashContent(assessment.source.content) !== label.contentHash)
    ) {
      mismatches.push(key);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(
      `RAG_REJECTED_SOURCE_CHANGED:${mismatches.join(',')}`
    );
  }

  const summary = {
    rejectedCases: rejected.length,
    uniqueSources: sources.size,
    testLessonsToSoftDelete: testLessonIds.length,
    sourcesToExclude: sources.size - testLessonIds.length,
  };
  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ dryRun: true, ...summary }, null, 2));
    return;
  }

  const tickets: KnowledgeIndexTicket[] = [];
  await prisma.$transaction(async (tx) => {
    for (const source of sources.values()) {
      if (source.sourceType === 'lesson') {
        const isTestLesson = testLessonIds.includes(source.sourceId);
        const currentLesson = await tx.lessons.findUnique({
          where: { id: source.sourceId },
          select: {
            is_delete: true,
            knowledge_index_policy: true,
          },
        });
        if (
          isTestLesson &&
          currentLesson?.is_delete === 1 &&
          currentLesson.knowledge_index_policy === 'exclude'
        ) {
          await invalidateLessonKnowledge(tx, source.sourceId);
          continue;
        }
        const lesson = await tx.lessons.update({
          where: { id: source.sourceId },
          data: {
            knowledge_index_policy: 'exclude',
            ...(isTestLesson
              ? { is_delete: 1, deleted_at: new Date() }
              : {}),
          },
          select: { id: true, updated_at: true },
        });
        if (isTestLesson) {
          await invalidateLessonKnowledge(tx, lesson.id);
        } else {
          tickets.push(
            await queueKnowledgeSource(
              tx,
              'lesson',
              lesson.id,
              lesson.updated_at
            )
          );
        }
        continue;
      }

      const exercise = await tx.exercises.update({
        where: { id: source.sourceId },
        data: { knowledge_index_policy: 'exclude' },
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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await completeKnowledgeIndexes(tickets);
  console.log(JSON.stringify({ dryRun: false, ...summary }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
