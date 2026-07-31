import '../src/config/env';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '../src/config/prisma';
import { getAiConfig } from '../src/config/ai';
import { getLessonAiContext } from '../src/services/ai/lesson-context.service';
import { streamLessonChat } from '../src/services/ai/lesson-chat.service';
import { ragEvalDatasetSchema } from './rag-types';

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function selectStratified<T extends { courseId: string }>(
  cases: T[],
  limit: number
): T[] {
  const groups = new Map<string, T[]>();
  cases.forEach((item) => {
    const group = groups.get(item.courseId) || [];
    group.push(item);
    groups.set(item.courseId, group);
  });
  const selected: T[] = [];
  while (selected.length < limit) {
    let added = false;
    for (const group of groups.values()) {
      const item = group.shift();
      if (item) {
        selected.push(item);
        added = true;
        if (selected.length === limit) break;
      }
    }
    if (!added) break;
  }
  return selected;
}

async function main(): Promise<void> {
  const datasetPath = path.resolve(
    getArgument('dataset') ||
      'evals/datasets/rag-candidates.generated.json'
  );
  const outputPath = path.resolve(
    getArgument('output') ||
      'evals/reports/rag-answer-review.generated.json'
  );
  const dataset = ragEvalDatasetSchema.parse(
    JSON.parse(await readFile(datasetPath, 'utf8'))
  );
  const approved = dataset.cases.filter(
    (item) => item.reviewStatus === 'approved' && item.lessonId
  );
  if (approved.length < 20) {
    throw new Error(
      `RAG_ANSWER_REVIEW_REQUIRED: 只有 ${approved.length} 条已审核且带小节的问题`
    );
  }
  const user = await prisma.users.findFirst({
    where: { is_delete: 0 },
    select: { id: true },
  });
  if (!user) throw new Error('RAG_EVAL_USER_MISSING');

  process.env.AI_RAG_ENABLED = 'true';
  const selected = selectStratified(approved, 20);
  type ReviewResult = {
    id: string;
    question: string;
    answer: string;
    evidence: Array<{
      sourceType: string;
      sourceId: string;
      contentHash: string;
      chunkIndex: number;
      score: number;
      content: string;
    }>;
    claims?: Array<{
      text: string;
      supportReview: 'pending' | 'supported' | 'unsupported';
      reviewerNote: string;
    }>;
  };
  const model = getAiConfig().model;
  let existingResults: ReviewResult[] = [];
  try {
    const previous = JSON.parse(
      await readFile(outputPath, 'utf8')
    ) as {
      datasetVersion?: string;
      model?: string;
      results?: ReviewResult[];
    };
    if (
      previous.datasetVersion === dataset.datasetVersion &&
      previous.model === model &&
      Array.isArray(previous.results)
    ) {
      existingResults = previous.results;
    }
  } catch {
    existingResults = [];
  }
  const resultsById = new Map(
    existingResults.map((result) => [result.id, result])
  );
  const writeCheckpoint = async (): Promise<void> => {
    const results = selected
      .map((item) => resultsById.get(item.id))
      .filter((item): item is ReviewResult => Boolean(item));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(
        {
          datasetVersion: dataset.datasetVersion,
          model,
          generatedAt: new Date().toISOString(),
          reviewRequired: true,
          results,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  };
  for (const item of selected) {
    if (resultsById.has(item.id)) continue;
    const context = await getLessonAiContext(
      item.lessonId!,
      undefined,
      {
        userId: user.id,
        query: item.question,
      }
    );
    if (!context || context.evidence.length === 0) {
      throw new Error(`RAG_EVIDENCE_MISSING:${item.id}`);
    }
    let answer = '';
    for await (const token of streamLessonChat(
      context,
      item.question,
      new AbortController().signal
    )) {
      answer += token;
    }
    resultsById.set(item.id, {
      id: item.id,
      question: item.question,
      answer,
      evidence: context.evidence.map((source) => ({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        contentHash: source.contentHash,
        chunkIndex: source.chunkIndex,
        score: source.score,
        content: source.content,
      })),
      claims: [],
    });
    await writeCheckpoint();
  }

  await writeCheckpoint();
  process.stdout.write(
    `${JSON.stringify({
      outputPath,
      model,
      cases: resultsById.size,
      claimReview: 'pending',
    })}\n`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
