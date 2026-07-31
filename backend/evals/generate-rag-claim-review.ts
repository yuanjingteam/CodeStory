import '../src/config/env';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import {
  createChatModel,
  extractJsonObject,
  getMessageText,
} from '../src/services/ai/_shared/model';
import { getAiConfig } from '../src/config/ai';

const REVIEW_RUBRIC_VERSION = 'rag-claim-support-v3';
const REVIEW_PIPELINE_VERSION = 'claim-candidates-v1';
const MAX_CANDIDATES_PER_REVIEW = 8;

const reviewedClaimSchema = z.object({
  text: z.string().trim().min(1),
  claimScope: z.enum(['course', 'supplement']),
  supportReview: z.enum(['supported', 'unsupported']),
  correctnessReview: z.enum([
    'correct',
    'incorrect',
    'uncertain',
    'not_applicable',
  ]),
  evidenceIndexes: z.array(z.number().int().positive()),
  reviewerNote: z.string().trim(),
});

const claimVerdictSchema = z.object({
  reviews: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      isClaim: z.boolean().default(true),
      supportReview: z.enum(['supported', 'unsupported']),
      correctnessReview: z.enum([
        'correct',
        'incorrect',
        'uncertain',
        'not_applicable',
      ]),
      evidenceIndexes: z
        .array(z.number().int().positive())
        .default([]),
      reviewerNote: z.string().trim(),
    })
  ),
});
type ClaimVerdict = z.infer<
  typeof claimVerdictSchema
>['reviews'][number];

function normalizeSupportReview(value: unknown): unknown {
  if (value === true) return 'supported';
  if (value === false) return 'unsupported';
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'supported' ||
    normalized === 'support' ||
    normalized === '支持'
  ) {
    return 'supported';
  }
  if (
    normalized === 'unsupported' ||
    normalized === 'not_supported' ||
    normalized === 'not supported' ||
    normalized === '不支持'
  ) {
    return 'unsupported';
  }
  return value;
}

function normalizeClaimVerdicts(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  const reviews = Array.isArray(record.reviews)
    ? record.reviews
    : record.claims;
  if (!Array.isArray(reviews)) return value;
  return {
    reviews: reviews.map((claim, index) => {
      if (!claim || typeof claim !== 'object') return claim;
      const item = claim as Record<string, unknown>;
      const rawIndex =
        item.index ?? item.candidateIndex ?? item.id ?? index;
      const rawIsClaim = item.isClaim ?? item.keep ?? true;
      return {
        index:
          typeof rawIndex === 'string'
            ? Number(rawIndex)
            : rawIndex,
        isClaim:
          typeof rawIsClaim === 'string'
            ? rawIsClaim.toLowerCase() !== 'false'
            : rawIsClaim,
        supportReview: normalizeSupportReview(
          item.supportReview ?? item.supported ?? item.status
        ),
        correctnessReview:
          item.correctnessReview ||
          item.correctness ||
          'not_applicable',
        evidenceIndexes:
          item.evidenceIndexes || item.evidence || item.sources || [],
        reviewerNote:
          item.reviewerNote || item.reason || item.note || '',
      };
    }),
  };
}

interface ClaimCandidate {
  index: number;
  text: string;
  claimScope: 'course' | 'supplement';
}

function splitClaimText(value: string): string[] {
  const codeBlocks: string[] = [];
  const withPlaceholders = value.replace(
    /```[\s\S]*?```/g,
    (codeBlock) => {
      const index = codeBlocks.push(codeBlock.trim()) - 1;
      return `\n\n__CODE_BLOCK_${index}__\n\n`;
    }
  );

  return withPlaceholders
    .split(/\n{2,}|(?<=[。！？；])\s*|\n(?=(?:[-*]|\d+\.)\s)/)
    .map((item) =>
      item
        .replace(/^#{1,6}\s+/, '')
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .trim()
    )
    .map((item) => {
      const match = item.match(/^__CODE_BLOCK_(\d+)__$/);
      return match ? codeBlocks[Number(match[1])] || '' : item;
    })
    .filter(Boolean);
}

function extractClaimCandidates(
  answer: string,
  answerScope: 'course' | 'extended'
): ClaimCandidate[] {
  const supplementHeading = '### 通用补充（非课程原文）';
  const supplementIndex =
    answerScope === 'extended'
      ? answer.indexOf(supplementHeading)
      : -1;
  const sections: Array<{
    text: string;
    claimScope: ClaimCandidate['claimScope'];
  }> =
    supplementIndex >= 0
      ? [
          {
            text: answer
              .slice(0, supplementIndex)
              .replace('### 课程内结论', ''),
            claimScope: 'course',
          },
          {
            text: answer.slice(
              supplementIndex + supplementHeading.length
            ),
            claimScope: 'supplement',
          },
        ]
      : [{ text: answer, claimScope: 'course' }];

  return sections.flatMap((section) =>
    splitClaimText(section.text).map((text) => ({
      index: 0,
      text,
      claimScope: section.claimScope,
    }))
  ).map((candidate, index) => ({ ...candidate, index }));
}

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function getConcurrency(): number {
  const parsed = Number(getArgument('concurrency') || '1');
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, 8)
    : 1;
}

function createAnswerHash(
  answer: string,
  evidence: Array<{ content: string }>
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        answer,
        evidence: evidence.map((item) => item.content),
      })
    )
    .digest('hex');
}

async function main(): Promise<void> {
  const inputPath = path.resolve(
    getArgument('input') ||
      'evals/reports/rag-answer-review.generated.json'
  );
  const outputPath = path.resolve(
    getArgument('output') ||
      'evals/reports/rag-answer-claims.generated.json'
  );
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as {
    datasetVersion: string;
    model: string;
    promptVersion?: string;
    promptRevision?: string;
    generatedAt: string;
    results: Array<{
      id: string;
      question: string;
      answer: string;
      answerScope?: 'course' | 'extended';
      evidence: Array<{
        sourceType: string;
        sourceId: string;
        chunkIndex: number;
        content: string;
      }>;
    }>;
  };
  if (input.results.length < 20) {
    throw new Error(
      `RAG_CLAIM_REVIEW_REQUIRED: 只有 ${input.results.length} 条回答`
    );
  }

  const reviewerModel = getAiConfig().model;
  type ClaimResult = {
    id: string;
    answerHash: string;
    evidenceCount: number;
    claims: Array<z.infer<typeof reviewedClaimSchema>>;
  };
  let existingResults: ClaimResult[] = [];
  let preserveAgentAudit = false;
  try {
    const previous = JSON.parse(
      await readFile(outputPath, 'utf8')
    ) as {
      datasetVersion?: string;
      answerModel?: string;
      reviewerModel?: string;
      rubricVersion?: string;
      pipelineVersion?: string;
      reviewMethod?: string;
      results?: ClaimResult[];
    };
    if (
      previous.datasetVersion === input.datasetVersion &&
      previous.answerModel === input.model &&
      previous.reviewerModel === reviewerModel &&
      previous.rubricVersion === REVIEW_RUBRIC_VERSION &&
      previous.pipelineVersion === REVIEW_PIPELINE_VERSION &&
      Array.isArray(previous.results)
    ) {
      const inputById = new Map(
        input.results.map((item) => [item.id, item])
      );
      existingResults = previous.results.map((result) => ({
        ...result,
        evidenceCount:
          result.evidenceCount ??
          inputById.get(result.id)?.evidence.length ??
          0,
      }));
      preserveAgentAudit =
        previous.reviewMethod?.includes('agent-audited') === true &&
        input.results.every((item) => {
          const result = existingResults.find(
            (candidate) => candidate.id === item.id
          );
          return (
            result?.answerHash ===
            createAnswerHash(item.answer, item.evidence)
          );
        });
    }
  } catch {
    existingResults = [];
  }

  const resultsById = new Map(
    existingResults.map((result) => [result.id, result])
  );
  const writeCheckpoint = async (): Promise<void> => {
    const results = input.results
      .map((item) => resultsById.get(item.id))
      .filter((item): item is ClaimResult => Boolean(item));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(
        {
          datasetVersion: input.datasetVersion,
          answerModel: input.model,
          promptVersion: input.promptVersion,
          promptRevision: input.promptRevision,
          answerGeneratedAt: input.generatedAt,
          reviewerModel,
          rubricVersion: REVIEW_RUBRIC_VERSION,
          pipelineVersion: REVIEW_PIPELINE_VERSION,
          reviewedAt: new Date().toISOString(),
          reviewMethod: preserveAgentAudit
            ? 'hybrid-model-assisted, agent-audited'
            : 'hybrid-model-assisted, pending-agent-audit',
          expectedAnswers: input.results.length,
          completedAnswers: results.length,
          status:
            results.length === input.results.length
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

  const model = createChatModel({
    temperature: 0,
    maxTokens: 2_000,
    streaming: true,
    streamUsage: false,
    maxRetries: 0,
    timeoutMs: 90_000,
  });
  const systemMessage = new SystemMessage(
    `你是严格的 RAG 事实支持审核员。审核口径版本：${REVIEW_RUBRIC_VERSION}。

任务：
1. 候选陈述已由程序拆分，不要重写或复述文本；必须为每个 index 返回一次判定。
2. 问句、邀请、纯建议、主观评价设 isClaim=false；其余可核查事实设 true。
3. course 候选只有能从证据直接找到出处或由证据必然推出时才标 supported，correctnessReview=not_applicable。
4. supplement 候选不要求课程证据支持，supportReview 固定为 unsupported；依据成熟通用知识判断 correctnessReview。
5. 常识正确、同主题合理、代码通常可运行，都不等于被课程证据支持。
6. evidenceIndexes 从 1 开始；课程 claim 不支持或 supplement claim 时可为空。
7. reviewerNote 最多 12 个汉字；不输出分析、Markdown 或候选原文。

只输出 JSON：
{"reviews":[{"index":0,"isClaim":true,"supportReview":"supported|unsupported","correctnessReview":"correct|incorrect|uncertain|not_applicable","evidenceIndexes":[1],"reviewerNote":"理由"}]}`
  );

  const pendingItems = input.results.filter((item) => {
    const answerHash = createAnswerHash(item.answer, item.evidence);
    return resultsById.get(item.id)?.answerHash !== answerHash;
  });
  const concurrency = getConcurrency();
  let nextIndex = 0;
  const reviewItem = async (
    item: (typeof pendingItems)[number]
  ): Promise<void> => {
    const answerHash = createAnswerHash(item.answer, item.evidence);
    const candidates = extractClaimCandidates(
      item.answer,
      item.answerScope || 'course'
    );
    if (candidates.length === 0) {
      throw new Error(`RAG_CLAIM_CANDIDATES_EMPTY:${item.id}`);
    }
    const evidenceText = item.evidence
      .map(
        (evidence, evidenceIndex) =>
          `[证据 ${evidenceIndex + 1}]\n${evidence.content}`
      )
      .join('\n\n');
    const reviews: ClaimVerdict[] = [];
    for (
      let offset = 0;
      offset < candidates.length;
      offset += MAX_CANDIDATES_PER_REVIEW
    ) {
      const candidateBatch = candidates.slice(
        offset,
        offset + MAX_CANDIDATES_PER_REVIEW
      );
      const stream = await model.stream([
        systemMessage,
        new HumanMessage(
          `问题：${item.question}\n\n候选陈述：\n${JSON.stringify(
            candidateBatch
          )}\n\n证据：\n${evidenceText}`
        ),
      ]);
      let responseText = '';
      for await (const chunk of stream) {
        responseText += getMessageText(chunk.content);
      }
      const parsed = claimVerdictSchema.parse(
        normalizeClaimVerdicts(
          extractJsonObject(
            responseText,
            `RAG_CLAIM_REVIEW_JSON_NOT_FOUND:${item.id}:${offset}`
          )
        )
      );
      reviews.push(...parsed.reviews);
    }
    const reviewsByIndex = new Map(
      reviews.map((review) => [review.index, review])
    );
    if (
      candidates.some(
        (candidate) => !reviewsByIndex.has(candidate.index)
      )
    ) {
      throw new Error(`RAG_CLAIM_REVIEW_INCOMPLETE:${item.id}`);
    }
    const claims = candidates.flatMap((candidate) => {
      const review = reviewsByIndex.get(candidate.index)!;
      if (!review.isClaim) return [];
      return [
        reviewedClaimSchema.parse({
          text: candidate.text,
          claimScope: candidate.claimScope,
          supportReview:
            candidate.claimScope === 'supplement'
              ? 'unsupported'
              : review.supportReview,
          correctnessReview:
            candidate.claimScope === 'course'
              ? 'not_applicable'
              : review.correctnessReview,
          evidenceIndexes:
            candidate.claimScope === 'course'
              ? review.evidenceIndexes
              : [],
          reviewerNote: review.reviewerNote,
        }),
      ];
    });
    if (claims.length === 0) {
      throw new Error(`RAG_CLAIM_REVIEW_EMPTY:${item.id}`);
    }
    resultsById.set(item.id, {
      id: item.id,
      answerHash,
      evidenceCount: item.evidence.length,
      claims,
    });
    await queueCheckpoint();
  };
  const reviewQueue = pendingItems.map((item) => ({
    item,
    attempt: 1,
  }));
  const failedItemIds: string[] = [];
  const worker = async (): Promise<void> => {
    while (nextIndex < reviewQueue.length) {
      const task = reviewQueue[nextIndex];
      nextIndex += 1;
      try {
        await reviewItem(task.item);
      } catch {
        if (task.attempt < 2) {
          reviewQueue.push({
            item: task.item,
            attempt: task.attempt + 1,
          });
        } else {
          failedItemIds.push(task.item.id);
        }
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, pendingItems.length) },
      () => worker()
    )
  );
  if (failedItemIds.length > 0) {
    throw new Error(
      `RAG_CLAIM_REVIEW_INCOMPLETE:${failedItemIds.join(',')}`
    );
  }

  await queueCheckpoint();
  process.stdout.write(
    `${JSON.stringify({
      outputPath,
      answerModel: input.model,
      reviewerModel,
      rubricVersion: REVIEW_RUBRIC_VERSION,
      answers: resultsById.size,
      concurrency,
    })}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
