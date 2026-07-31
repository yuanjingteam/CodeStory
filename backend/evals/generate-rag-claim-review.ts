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

const REVIEW_RUBRIC_VERSION = 'rag-claim-support-v2';

const claimReviewSchema = z.object({
  claims: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        supportReview: z.enum(['supported', 'unsupported']),
        evidenceIndexes: z.array(z.number().int().positive()).default([]),
        reviewerNote: z.string().trim(),
      })
    )
    .min(1),
});

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

function normalizeClaimReview(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.claims)) return value;
  return {
    ...record,
    claims: record.claims.map((claim) => {
      if (!claim || typeof claim !== 'object') return claim;
      const item = claim as Record<string, unknown>;
      return {
        text: item.text || item.claim,
        supportReview: normalizeSupportReview(
          item.supportReview ?? item.supported ?? item.status
        ),
        evidenceIndexes:
          item.evidenceIndexes || item.evidence || item.sources || [],
        reviewerNote:
          item.reviewerNote || item.reason || item.note || '',
      };
    }),
  };
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
    ? Math.min(parsed, 4)
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
    generatedAt: string;
    results: Array<{
      id: string;
      question: string;
      answer: string;
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
    claims: z.infer<typeof claimReviewSchema>['claims'];
  };
  let existingResults: ClaimResult[] = [];
  try {
    const previous = JSON.parse(
      await readFile(outputPath, 'utf8')
    ) as {
      datasetVersion?: string;
      answerModel?: string;
      reviewerModel?: string;
      rubricVersion?: string;
      results?: ClaimResult[];
    };
    if (
      previous.datasetVersion === input.datasetVersion &&
      previous.answerModel === input.model &&
      previous.reviewerModel === reviewerModel &&
      previous.rubricVersion === REVIEW_RUBRIC_VERSION &&
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
          answerGeneratedAt: input.generatedAt,
          reviewerModel,
          rubricVersion: REVIEW_RUBRIC_VERSION,
          reviewedAt: new Date().toISOString(),
          reviewMethod: 'model-assisted, agent-audited',
          results,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  };

  const model = createChatModel({
    temperature: 0,
    maxTokens: 4_000,
  });
  const systemMessage = new SystemMessage(
    `你是严格的 RAG 事实支持审核员。审核口径版本：${REVIEW_RUBRIC_VERSION}。

任务：
1. 从回答中提取所有可由外部证据判断真假的事实陈述，拆成最小且可独立核查的原子 claim。
   同一事实的解释、示例和示例代码合并为一个 claim，不要逐行拆分代码。
2. 问句、邀请、纯建议、主观评价不计入 claim。
3. 只有 claim 能从所列证据直接找到出处，或由证据必然推出时，才标为 supported。
4. 常识正确、同主题合理、代码通常可运行，都不等于被本次证据支持。
5. 回答声称“课程讲了某内容”时，证据只给出标题而没有该具体内容，应标为 unsupported。
6. evidenceIndexes 使用从 1 开始的证据序号；unsupported 时可为空。
7. reviewerNote 最多 20 个汉字，只写支持出处或缺失内容。
8. 不输出分析过程、Markdown 或 JSON 之外的任何文本。

只输出 JSON：
{"claims":[{"text":"原子事实陈述","supportReview":"supported|unsupported","evidenceIndexes":[1],"reviewerNote":"理由"}]}`
  );

  const pendingItems = input.results.filter((item) => {
    const answerHash = createAnswerHash(item.answer, item.evidence);
    return resultsById.get(item.id)?.answerHash !== answerHash;
  });
  const concurrency = getConcurrency();
  for (let index = 0; index < pendingItems.length; index += concurrency) {
    const batch = pendingItems.slice(index, index + concurrency);
    const reviewedBatch = await Promise.all(
      batch.map(async (item): Promise<ClaimResult> => {
        const answerHash = createAnswerHash(item.answer, item.evidence);
        const evidenceText = item.evidence
          .map(
            (evidence, evidenceIndex) =>
              `[证据 ${evidenceIndex + 1}]\n${evidence.content}`
          )
          .join('\n\n');
        const response = await model.invoke([
          systemMessage,
          new HumanMessage(
            `问题：\n${item.question}\n\n回答：\n${item.answer}\n\n证据：\n${evidenceText}`
          ),
        ]);
        const parsed = claimReviewSchema.parse(
          normalizeClaimReview(
            extractJsonObject(
            getMessageText(response.content),
            `RAG_CLAIM_REVIEW_JSON_NOT_FOUND:${item.id}`
            )
          )
        );
        return {
          id: item.id,
          answerHash,
          claims: parsed.claims,
        };
      })
    );
    reviewedBatch.forEach((result) => {
      resultsById.set(result.id, result);
    });
    await writeCheckpoint();
  }

  await writeCheckpoint();
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
