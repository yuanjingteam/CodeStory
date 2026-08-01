import '../src/config/env';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gradingStage3Dataset } from './datasets/grading-stage3';
import { reviewCodeWithAI } from '../src/services/ai/evaluate/code-grading-chain';
import {
  calculateAiReviewedFinalScore,
  gradeCodeExercise,
  type CodeGradeResult,
} from '../src/services/courses/code-grading.service';

export const NEUTRAL_GRADING_REFERENCE_ANALYSIS =
  '参考答案仅用于说明目标结果，请独立判断学生代码的语义正确性。';

export function buildGradingReviewInput(
  item: typeof gradingStage3Dataset[number],
  staticGrade: CodeGradeResult
) {
  return {
    exerciseContent: item.exerciseContent,
    knowledge: 'SQL 查询',
    correctAnswer: item.correctAnswer,
    analysis: NEUTRAL_GRADING_REFERENCE_ANALYSIS,
    userCode: item.userCode,
    language: 'sql',
    hintLevelUsed: 0,
    staticGrade,
  };
}

export function buildGradingReportCase(
  item: typeof gradingStage3Dataset[number]
) {
  return {
    id: item.id,
    answerClass: item.answerClass,
    exerciseContent: item.exerciseContent,
    correctAnswer: item.correctAnswer,
    userCode: item.userCode,
    expectedPass: item.expectedPass,
    agentScore: item.agentScore,
  };
}

async function main() {
  const outputArg = process.argv.find((argument) => argument.startsWith('--output='));
  const outputPath = outputArg
    ? path.resolve(outputArg.slice('--output='.length))
    : path.resolve('evals/reports/grading-stage3.json');
  const limitArg = process.argv.find((argument) => argument.startsWith('--limit='));
  const concurrencyArg = process.argv.find((argument) => argument.startsWith('--concurrency='));
  const limit = Math.max(1, Math.min(
    gradingStage3Dataset.length,
    Number(limitArg?.slice('--limit='.length) || gradingStage3Dataset.length)
  ));
  const concurrency = Math.max(1, Math.min(
    5,
    Number(concurrencyArg?.slice('--concurrency='.length) || 1)
  ));
  const selectedDataset = gradingStage3Dataset.slice(0, limit);
  const results = new Array<Record<string, unknown>>(selectedDataset.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < selectedDataset.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = selectedDataset[index];
    const staticGrade = gradeCodeExercise({
      userCode: item.userCode,
      correctAnswer: item.correctAnswer,
      metadata: { language: 'sql' },
      hintLevelUsed: 0,
    });
    try {
      const ai = await reviewCodeWithAI(
        buildGradingReviewInput(item, staticGrade)
      );
      const aiScore = calculateAiReviewedFinalScore(ai, 0);
      const agreement = ai.review.isLikelyCorrect === item.expectedPass;
      results[index] = {
        ...buildGradingReportCase(item),
        labelProvenance: 'agent-audited',
        staticPass: staticGrade.correct,
        aiPass: ai.review.isLikelyCorrect,
        aiScore,
        confidence: ai.review.confidence,
        needsManualReview: ai.review.needsManualReview,
        ruleConflict: staticGrade.correct !== ai.review.isLikelyCorrect,
        agreement,
        absoluteError: Math.abs(aiScore - item.agentScore),
        status: 'completed',
      };
    } catch (error) {
      const errorWithCause = error as Error & { cause?: unknown };
      results[index] = {
        ...buildGradingReportCase(item),
        labelProvenance: 'agent-audited',
        status: 'failed',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        errorDetail: error instanceof Error && errorWithCause.cause instanceof Error
          ? errorWithCause.cause.message
          : undefined,
      };
    }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  let completedCount = 0;
  let agreementCount = 0;
  let absoluteErrorTotal = 0;
  for (const item of results) {
    if (!('agreement' in item)) continue;
    completedCount += 1;
    if (item.agreement) agreementCount += 1;
    absoluteErrorTotal += Number(item.absoluteError);
  }
  const agreementRate = completedCount
    ? agreementCount / completedCount
    : 0;
  const meanAbsoluteError = completedCount
    ? absoluteErrorTotal / completedCount
    : null;
  const report = {
    mode: 'real-model',
    auditMode: 'agent-audited',
    humanReviewed: false,
    datasetVersion: 'grading-stage3-2026-08-01',
    sampleCount: selectedDataset.length,
    strata: {
      correct: selectedDataset.filter((item) => item.answerClass === 'correct').length,
      wrong: selectedDataset.filter((item) => item.answerClass === 'wrong').length,
      boundary: selectedDataset.filter((item) => item.answerClass === 'boundary').length,
    },
    completedCount,
    failedCount: results.length - completedCount,
    agreementRate,
    meanAbsoluteError,
    thresholds: { agreementRate: 0.9, meanAbsoluteError: 10 },
    results,
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    outputPath,
    sampleCount: report.sampleCount,
    completedCount: report.completedCount,
    agreementRate,
    meanAbsoluteError,
  }, null, 2)}\n`);
  if (completedCount !== selectedDataset.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
