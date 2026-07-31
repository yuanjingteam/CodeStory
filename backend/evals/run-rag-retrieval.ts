import '../src/config/env';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '../src/config/prisma';
import { createKnowledgeRetriever } from '../src/services/rag';
import { getAiEmbeddingConfig } from '../src/config/ai';
import { ragEvalDatasetSchema } from './rag-types';

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(
      Math.ceil(sorted.length * ratio) - 1,
      sorted.length - 1
    )
  ];
}

async function main(): Promise<void> {
  const datasetPath = path.resolve(
    getArgument('dataset') ||
      'evals/datasets/rag-candidates.generated.json'
  );
  const outputPath = getArgument('output')
    ? path.resolve(getArgument('output')!)
    : undefined;
  const allowPending = process.argv.includes('--allow-pending');
  const dataset = ragEvalDatasetSchema.parse(
    JSON.parse(await readFile(datasetPath, 'utf8'))
  );
  const cases = dataset.cases.filter(
    (item) =>
      item.reviewStatus === 'approved' ||
      (allowPending && item.reviewStatus === 'pending')
  );
  if (cases.length < 50) {
    throw new Error(
      `RAG_EVAL_REVIEW_REQUIRED: 可评测问题只有 ${cases.length} 条，至少需要 50 条审核通过的问题`
    );
  }

  const user = await prisma.users.findFirst({
    where: { is_delete: 0 },
    select: { id: true },
  });
  if (!user) throw new Error('RAG_EVAL_USER_MISSING');

  const retriever = createKnowledgeRetriever();
  const latencies: number[] = [];
  let recalled = 0;
  let reciprocalRankSum = 0;
  const results = [];

  for (const item of cases) {
    const startedAt = performance.now();
    const retrieved = await retriever.retrieve(item.question, {
      userId: user.id,
      courseId: item.courseId,
      lessonId: item.lessonId,
      purpose: 'student_chat',
      topK: 5,
    });
    const latencyMs = performance.now() - startedAt;
    latencies.push(latencyMs);
    const expected = new Set(
      item.expectedSources.map(
        (source) => `${source.sourceType}:${source.sourceId}`
      )
    );
    const rank = retrieved.findIndex((source) =>
      expected.has(`${source.sourceType}:${source.sourceId}`)
    );
    if (rank >= 0) {
      recalled += 1;
      reciprocalRankSum += 1 / (rank + 1);
    }
    results.push({
      id: item.id,
      recalledAt5: rank >= 0,
      rank: rank >= 0 ? rank + 1 : null,
      latencyMs,
      retrieved: retrieved.map((source) => ({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        contentHash: source.contentHash,
        chunkIndex: source.chunkIndex,
        score: source.score,
      })),
    });
  }

  const config = getAiEmbeddingConfig();
  const report = {
    datasetVersion: dataset.datasetVersion,
    reviewed: !allowPending,
    model: config.model,
    dimensions: config.dimensions,
    caseCount: cases.length,
    recallAt5: recalled / cases.length,
    mrrAt5: reciprocalRankSum / cases.length,
    latencyMs: {
      p50: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
    },
    passed: !allowPending && recalled / cases.length >= 0.85,
    results,
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, 'utf8');
  } else {
    process.stdout.write(serialized);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
