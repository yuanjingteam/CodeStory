import fs from 'node:fs';
import path from 'node:path';
import { assertUniqueExpectedIds } from './eval-integrity';

export interface ExerciseHumanReview {
  id: string;
  answerCorrect: boolean;
  confirmedDuplicate: boolean;
  reviewer: string;
  reviewedAt: string;
  note?: string;
}

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2)
    .find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function isValidReview(review: Record<string, unknown>): review is Record<string, unknown> & ExerciseHumanReview {
  return typeof review.id === 'string'
    && typeof review.answerCorrect === 'boolean'
    && typeof review.confirmedDuplicate === 'boolean'
    && typeof review.reviewer === 'string'
    && review.reviewer.trim().length > 0
    && typeof review.reviewedAt === 'string'
    && !Number.isNaN(Date.parse(review.reviewedAt))
    && (review.note === undefined || typeof review.note === 'string');
}

export function mergeExerciseHumanReviews(
  results: Array<Record<string, unknown>>,
  reviews: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const validResults = results.filter((result) => (
    result.finalSuccess === true && Number(result.validCandidateCount) > 0
  ));
  const expectedIds = new Set(validResults.map((result) => String(result.id)));
  assertUniqueExpectedIds(reviews, expectedIds, '管理员 sidecar');
  if (reviews.length !== expectedIds.size) {
    throw new Error(`管理员 sidecar 未覆盖全部有效候选：${reviews.length}/${expectedIds.size}`);
  }
  for (const review of reviews) {
    if (!isValidReview(review)) {
      throw new Error(`管理员 sidecar 字段无效：${String(review.id || '<unknown>')}`);
    }
  }
  const reviewById = new Map(reviews.map((review) => [String(review.id), review]));
  return results.map((result) => {
    if (!expectedIds.has(String(result.id))) return result;
    const review = reviewById.get(String(result.id))!;
    return {
      ...result,
      answerCorrect: review.answerCorrect,
      humanConfirmedDuplicate: review.confirmedDuplicate,
      reviewer: review.reviewer,
      reviewedAt: review.reviewedAt,
      reviewNote: review.note,
      labelProvenance: 'human-reviewed',
    };
  });
}

function main(): void {
  const inputPath = path.resolve(getArgument('input') || 'evals/datasets/exercise-generation-results.json');
  const reviewsPath = path.resolve(getArgument('reviews') || 'evals/reports/exercise-generation-human-review.json');
  const outputPath = path.resolve(getArgument('output') || 'evals/datasets/exercise-generation-results-human-reviewed.json');
  if (outputPath === inputPath || fs.existsSync(outputPath)) {
    throw new Error('合并输出必须使用尚不存在的新路径，禁止覆盖原始评测。');
  }
  const results = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as Array<Record<string, unknown>>;
  const reviews = JSON.parse(fs.readFileSync(reviewsPath, 'utf8')) as Array<Record<string, unknown>>;
  if (!Array.isArray(results) || !Array.isArray(reviews)) throw new Error('输入和 sidecar 必须是 JSON 数组。');
  const merged = mergeExerciseHumanReviews(results, reviews);
  fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ outputPath, records: merged.length, humanReviewed: reviews.length }, null, 2)}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
