import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  recommendationStage5Dataset,
  type RecommendationPrecisionCase,
} from './datasets/recommendation-stage5';

export function precisionAtK(
  recommendedIds: string[],
  relevantIds: string[],
  k: number
): number {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error('k 必须是正整数');
  }
  const relevant = new Set(relevantIds);
  const uniqueTopK = [...new Set(recommendedIds)].slice(0, k);
  const hits = uniqueTopK.filter((id) => relevant.has(id)).length;
  return hits / k;
}

export function scoreRecommendationDataset(
  dataset: RecommendationPrecisionCase[],
  k = 5
) {
  const cases = dataset.map((item) => ({
    id: item.id,
    scene: item.scene,
    precisionAtK: precisionAtK(
      item.recommendedIds,
      item.relevantIds,
      k
    ),
    labelProvenance: item.labelProvenance,
    notes: item.notes,
  }));
  const macroPrecisionAtK =
    cases.reduce((sum, item) => sum + item.precisionAtK, 0) /
    Math.max(cases.length, 1);
  return {
    generatedAt: new Date().toISOString(),
    metric: `Precision@${k}`,
    sampleSize: cases.length,
    macroPrecisionAtK,
    threshold: 0.7,
    passed: cases.length > 0 && macroPrecisionAtK >= 0.7,
    labelProvenance: 'spec-derived-review',
    cases,
  };
}

async function main() {
  const outputArg = process.argv.find((argument) =>
    argument.startsWith('--output=')
  );
  const output = path.resolve(
    outputArg?.slice('--output='.length) ||
      'evals/reports/recommendation-stage5.json'
  );
  const report = scoreRecommendationDataset(recommendationStage5Dataset);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `${JSON.stringify({
      output,
      sampleSize: report.sampleSize,
      precisionAt5: report.macroPrecisionAtK,
      passed: report.passed,
    }, null, 2)}\n`
  );
  if (!report.passed) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
