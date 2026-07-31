import '../src/config/env';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '../src/config/prisma';
import {
  getAiConfig,
  getAiTutorPromptVersion,
} from '../src/config/ai';
import { getLessonAiContext } from '../src/services/ai/lesson-context.service';
import {
  getLessonChatSources,
  getLessonTutorPromptRevision,
  normalizeLessonChatAnswer,
  resolveAnswerScope,
  streamLessonChat,
} from '../src/services/ai/lesson-chat.service';
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
  const requestedPromptVersion = getArgument('prompt-version');
  if (
    requestedPromptVersion &&
    !['grounded-v2', 'grounded-v3'].includes(
      requestedPromptVersion
    )
  ) {
    throw new Error('RAG_PROMPT_VERSION_INVALID');
  }
  if (requestedPromptVersion) {
    process.env.AI_TUTOR_PROMPT_VERSION =
      requestedPromptVersion;
  }
  const promptVersion = getAiTutorPromptVersion();
  const promptRevision =
    getLessonTutorPromptRevision(promptVersion);
  const requestedLimit = Number(getArgument('limit') || 20);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit >= 20
      ? requestedLimit
      : 20;
  const requestedConcurrency = Number(
    getArgument('concurrency') || 1
  );
  const concurrency =
    Number.isInteger(requestedConcurrency) &&
    requestedConcurrency >= 1 &&
    requestedConcurrency <= 4
      ? requestedConcurrency
      : 1;
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
  if (approved.length < limit) {
    throw new Error(
      `RAG_ANSWER_REVIEW_REQUIRED: 只有 ${approved.length} 条已审核且带小节的问题，需要 ${limit} 条`
    );
  }
  const user = await prisma.users.findFirst({
    where: { is_delete: 0 },
    select: { id: true },
  });
  if (!user) throw new Error('RAG_EVAL_USER_MISSING');

  process.env.AI_RAG_ENABLED = 'true';
  const selected = selectStratified(approved, limit);
  type ReviewResult = {
    id: string;
    question: string;
    answer: string;
    rawAnswer?: string;
    answerScope: 'course' | 'extended';
    evidenceQuality: 'strong' | 'thin' | 'empty';
    contextDurationMs: number;
    modelTimeToFirstTokenMs: number;
    timeToFirstTokenMs: number;
    generationDurationMs: number;
    totalDurationMs: number;
    outputCharacters: number;
    sources: ReturnType<typeof getLessonChatSources>;
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
      promptVersion?: string;
      promptRevision?: string;
      results?: ReviewResult[];
    };
    if (
      previous.datasetVersion === dataset.datasetVersion &&
      previous.model === model &&
      previous.promptVersion === promptVersion &&
      previous.promptRevision === promptRevision &&
      Array.isArray(previous.results)
    ) {
      existingResults = previous.results;
      existingResults = existingResults.map((result) => {
        const normalizedAnswer = normalizeLessonChatAnswer(
          result.answer,
          result.answerScope
        );
        return normalizedAnswer === result.answer
          ? result
          : {
              ...result,
              answer: normalizedAnswer,
              rawAnswer: result.rawAnswer || result.answer,
            };
      });
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
          promptVersion,
          promptRevision,
          generatedAt: new Date().toISOString(),
          reviewRequired: true,
          expectedAnswers: selected.length,
          completedAnswers: results.length,
          status:
            results.length === selected.length
              ? 'complete'
              : 'partial',
          results,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  };
  let checkpointQueue = Promise.resolve();
  const queueCheckpoint = (): Promise<void> => {
    checkpointQueue = checkpointQueue.then(writeCheckpoint);
    return checkpointQueue;
  };
  const generateResult = async (
    item: (typeof selected)[number]
  ): Promise<void> => {
    const caseStartedAt = performance.now();
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
    const contextCompletedAt = performance.now();
    let answer = '';
    const answerScope =
      promptVersion === 'grounded-v3'
        ? resolveAnswerScope(item.question)
        : 'course';
    const modelStartedAt = performance.now();
    let firstTokenAt: number | undefined;
    for await (const token of streamLessonChat(
      context,
      item.question,
      new AbortController().signal,
      [],
      undefined,
      { answerScope, promptVersion }
    )) {
      if (firstTokenAt === undefined && token.length > 0) {
        firstTokenAt = performance.now();
      }
      answer += token;
    }
    const modelCompletedAt = performance.now();
    if (firstTokenAt === undefined || !answer.trim()) {
      throw new Error(`RAG_ANSWER_EMPTY:${item.id}`);
    }
    const normalizedAnswer = normalizeLessonChatAnswer(
      answer,
      answerScope
    );
    resultsById.set(item.id, {
      id: item.id,
      question: item.question,
      answer: normalizedAnswer,
      ...(normalizedAnswer !== answer
        ? { rawAnswer: answer }
        : {}),
      answerScope,
      evidenceQuality: context.evidenceQuality,
      contextDurationMs: contextCompletedAt - caseStartedAt,
      modelTimeToFirstTokenMs: firstTokenAt - modelStartedAt,
      timeToFirstTokenMs: firstTokenAt - caseStartedAt,
      generationDurationMs: modelCompletedAt - modelStartedAt,
      totalDurationMs: modelCompletedAt - caseStartedAt,
      outputCharacters: normalizedAnswer.length,
      sources: getLessonChatSources(context),
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
    await queueCheckpoint();
  };
  const pending = selected.filter(
    (item) => !resultsById.has(item.id)
  );
  const generationQueue = pending.map((item) => ({
    item,
    attempt: 1,
  }));
  const failedItemIds: string[] = [];
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < generationQueue.length) {
      const task = generationQueue[nextIndex];
      nextIndex += 1;
      try {
        await generateResult(task.item);
      } catch {
        if (task.attempt < 2) {
          generationQueue.push({
            item: task.item,
            attempt: task.attempt + 1,
          });
        } else {
          failedItemIds.push(task.item.id);
        }
      }
    }
  };
  const workers = Array.from(
    {
      length: Math.min(concurrency, pending.length),
    },
    () => worker()
  );
  await Promise.all(workers);
  if (failedItemIds.length > 0) {
    throw new Error(
      `RAG_ANSWER_REVIEW_INCOMPLETE:${failedItemIds.join(',')}`
    );
  }

  await queueCheckpoint();
  process.stdout.write(
    `${JSON.stringify({
      outputPath,
      model,
      promptVersion,
      promptRevision,
      cases: resultsById.size,
      concurrency,
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
