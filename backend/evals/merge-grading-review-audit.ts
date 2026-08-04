import fs from 'node:fs';
import path from 'node:path';
import { assertUniqueExpectedIds } from './eval-integrity';

export interface GradingHumanReview {
  id: string;
  expectedPass: boolean;
  expectedScore: number;
  reviewer: string;
  reviewedAt: string;
  note?: string;
}

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2)
    .find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

export function mergeGradingHumanReviews(
  report: Record<string, unknown>,
  reviews: Array<Record<string, unknown>>
): Record<string, unknown> {
  const results = report.results;
  if (!Array.isArray(results) || results.length !== 30 || report.sampleCount !== 30) {
    throw new Error('阶段三人工门禁要求完整的 30 条运行结果。');
  }
  if (results.some((result) => (result as Record<string, unknown>).status !== 'completed')) {
    throw new Error('阶段三存在未完成样本，不能进入人工门禁。');
  }
  const expectedIds = new Set(results.map((result) => String((result as Record<string, unknown>).id)));
  assertUniqueExpectedIds(reviews, expectedIds, '阶段三管理员 sidecar');
  if (reviews.length !== 30) throw new Error(`阶段三管理员 sidecar 必须覆盖 30/30，当前 ${reviews.length}/30。`);
  for (const review of reviews) {
    if (typeof review.expectedPass !== 'boolean'
      || typeof review.expectedScore !== 'number'
      || review.expectedScore < 0 || review.expectedScore > 100
      || typeof review.reviewer !== 'string' || !review.reviewer.trim()
      || typeof review.reviewedAt !== 'string' || Number.isNaN(Date.parse(review.reviewedAt))
      || (review.note !== undefined && typeof review.note !== 'string')) {
      throw new Error(`阶段三管理员 sidecar 字段无效：${String(review.id || '<unknown>')}`);
    }
  }
  const byId = new Map(reviews.map((review) => [String(review.id), review]));
  let agreementCount = 0;
  let absoluteErrorTotal = 0;
  const mergedResults = results.map((value) => {
    const result = value as Record<string, unknown>;
    const review = byId.get(String(result.id))!;
    const agreement = result.aiPass === review.expectedPass;
    const absoluteError = Math.abs(Number(result.aiScore) - Number(review.expectedScore));
    if (agreement) agreementCount += 1;
    absoluteErrorTotal += absoluteError;
    return {
      ...result,
      humanExpectedPass: review.expectedPass,
      humanExpectedScore: review.expectedScore,
      reviewer: review.reviewer,
      reviewedAt: review.reviewedAt,
      reviewNote: review.note,
      agreement,
      absoluteError,
      labelProvenance: 'human-reviewed',
    };
  });
  const agreementRate = agreementCount / 30;
  const meanAbsoluteError = absoluteErrorTotal / 30;
  const passed = agreementRate >= 0.9 && meanAbsoluteError <= 10;
  return {
    ...report,
    auditMode: 'administrator-sidecar',
    humanReviewed: true,
    completedCount: 30,
    failedCount: 0,
    agreementRate,
    meanAbsoluteError,
    passed,
    results: mergedResults,
  };
}

function main(): void {
  const inputPath = path.resolve(getArgument('input') || 'evals/reports/grading-stage3.json');
  const reviewsPath = path.resolve(getArgument('reviews') || 'evals/reports/grading-stage3-human-review.json');
  const outputPath = path.resolve(getArgument('output') || 'evals/reports/grading-stage3-human-reviewed.json');
  if (outputPath === inputPath || fs.existsSync(outputPath)) {
    throw new Error('人工评分输出必须使用尚不存在的新路径。');
  }
  const report = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as Record<string, unknown>;
  const reviews = JSON.parse(fs.readFileSync(reviewsPath, 'utf8')) as Array<Record<string, unknown>>;
  if (!Array.isArray(reviews)) throw new Error('阶段三 sidecar 必须是 JSON 数组。');
  const merged = mergeGradingHumanReviews(report, reviews);
  fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ outputPath, humanReviewed: true, passed: merged.passed }, null, 2)}\n`);
  if (!merged.passed) process.exitCode = 1;
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
