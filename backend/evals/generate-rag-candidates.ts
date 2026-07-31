import '../src/config/env';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '../src/config/prisma';
import { loadKnowledgeSource } from '../src/services/rag';
import {
  ragEvalDatasetSchema,
  type RagEvalDataset,
} from './rag-types';

function getOutputPath(): string {
  const prefix = '--output=';
  const argument = process.argv.find((value) =>
    value.startsWith(prefix)
  );
  return argument
    ? path.resolve(argument.slice(prefix.length))
    : path.resolve(
        'evals/datasets/rag-candidates.generated.json'
      );
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function main(): Promise<void> {
  const outputPath = getOutputPath();
  const cases: RagEvalDataset['cases'] = [];
  const lessons = await prisma.lessons.findMany({
    where: {
      is_delete: 0,
      chapters: {
        is_delete: 0,
        courses: { is_delete: 0 },
      },
    },
    select: { id: true },
    orderBy: { created_at: 'asc' },
  });

  for (const lesson of lessons) {
    const source = await loadKnowledgeSource('lesson', lesson.id);
    if (!source || !source.courseId) continue;
    const title = String(source.metadata?.lessonTitle || '当前小节');
    const label = {
      sourceType: 'lesson' as const,
      sourceId: source.sourceId,
      contentHash: hashContent(source.content),
    };
    const questions = [
      `“${title}”主要讲解什么？`,
      `在实际编程中，应该如何应用“${title}”中的核心知识？`,
    ];
    questions.forEach((question, index) => {
      cases.push({
        id: `lesson-${source.sourceId}-${index + 1}`,
        courseId: source.courseId!,
        lessonId: source.lessonId,
        question,
        expectedSources: [label],
        reviewStatus: 'pending',
      });
    });
  }

  const exercises = await prisma.exercises.findMany({
    where: {
      is_delete: 0,
      NOT: { source: 'ai' },
      lessons: {
        is_delete: 0,
        chapters: {
          is_delete: 0,
          courses: { is_delete: 0 },
        },
      },
    },
    select: { id: true },
    orderBy: { created_at: 'asc' },
  });
  for (const exercise of exercises) {
    const source = await loadKnowledgeSource(
      'exercise',
      exercise.id
    );
    if (!source || !source.courseId) continue;
    const knowledge = String(
      source.metadata?.knowledge || source.metadata?.exerciseType || '该题'
    );
    const label = {
      sourceType: 'exercise' as const,
      sourceId: source.sourceId,
      contentHash: hashContent(source.content),
    };
    [
      `这道关于“${knowledge}”的题目主要考查什么？`,
      `解决这道关于“${knowledge}”的题目时应采用什么思路？`,
    ].forEach((question, index) => {
      cases.push({
        id: `exercise-${source.sourceId}-${index + 1}`,
        courseId: source.courseId!,
        lessonId: source.lessonId,
        question,
        expectedSources: [label],
        reviewStatus: 'pending',
      });
    });
  }

  let previousCases = new Map<
    string,
    RagEvalDataset['cases'][number]
  >();
  try {
    const previous = ragEvalDatasetSchema.parse(
      JSON.parse(await readFile(outputPath, 'utf8'))
    );
    previousCases = new Map(
      previous.cases.map((item) => [item.id, item])
    );
  } catch {
    previousCases = new Map();
  }
  const reviewedCases = cases.map((item) => {
    const previous = previousCases.get(item.id);
    if (
      !previous ||
      previous.question !== item.question ||
      JSON.stringify(previous.expectedSources) !==
        JSON.stringify(item.expectedSources)
    ) {
      return item;
    }
    return {
      ...item,
      reviewStatus: previous.reviewStatus,
      reviewerNote: previous.reviewerNote,
    };
  });
  const dataset = ragEvalDatasetSchema.parse({
    datasetVersion: 'rag-v1-candidates',
    generatedAt: new Date().toISOString(),
    reviewRequired: true,
    cases: reviewedCases,
  });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(dataset, null, 2)}\n`,
    'utf8'
  );
  process.stdout.write(
    `${JSON.stringify({
      outputPath,
      candidates: dataset.cases.length,
      reviewStatuses: dataset.cases.reduce<Record<string, number>>(
        (counts, item) => {
          counts[item.reviewStatus] =
            (counts[item.reviewStatus] || 0) + 1;
          return counts;
        },
        {}
      ),
    })}\n`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
