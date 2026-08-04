import fs from 'node:fs';
import path from 'node:path';
import { stableHash } from './eval-integrity';

export interface GenerationAttempt {
  id: string;
  firstPassStructured: boolean;
  repaired: boolean;
  finalSuccess: boolean;
  modelCallCount: number;
  validCandidateCount: number;
  answerCorrect?: boolean;
  humanConfirmedDuplicate?: boolean;
  machineDuplicate?: boolean;
  machineDuplicateSimilarity?: number | null;
  crossCourseSimilar?: boolean;
  labelProvenance?: string;
}

export const STAGE2_THRESHOLDS = {
  firstPassStructuredRate: 0.9,
  repairedSuccessRate: 0.99,
  finalFailureRate: 0.01,
  modelCallsPerValidCandidate: 1.3,
  answerAccuracy: 0.95,
    humanConfirmedDuplicateRate: 0.05,
} as const;

export const STAGE2_FORMAL_SAMPLE_COUNT = 50;

function getArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2)
    .find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

export function scoreExerciseGeneration(
  attempts: GenerationAttempt[],
  manifest: Record<string, unknown>
) {
  if (
    attempts.length !== STAGE2_FORMAL_SAMPLE_COUNT
    || manifest.sampleCount !== STAGE2_FORMAL_SAMPLE_COUNT
  ) {
    throw new Error(
      `阶段二正式门禁要求恰好 ${STAGE2_FORMAL_SAMPLE_COUNT} 次样本，当前为 ${attempts.length}。`
    );
  }
  const ids = new Set<string>();
  for (const attempt of attempts) {
    if (!attempt.id || ids.has(attempt.id)) throw new Error(`评测 id 无效或重复：${attempt.id || '<unknown>'}`);
    ids.add(attempt.id);
    if (!Number.isInteger(attempt.modelCallCount) || attempt.modelCallCount < 1
      || !Number.isInteger(attempt.validCandidateCount) || attempt.validCandidateCount < 0) {
      throw new Error(`评测记录 ${attempt.id} 字段无效。`);
    }
    if (attempt.finalSuccess && attempt.validCandidateCount !== 1) {
      throw new Error(`正式评测每次成功运行必须产生 1 个有效候选：${attempt.id}`);
    }
    if (attempt.finalSuccess && (
      attempt.labelProvenance !== 'human-reviewed'
      || typeof attempt.answerCorrect !== 'boolean'
      || typeof attempt.humanConfirmedDuplicate !== 'boolean'
    )) {
      throw new Error(`有效候选缺少管理员人工标注：${attempt.id}`);
    }
  }
  const successes = attempts.filter((attempt) => attempt.finalSuccess);
  const firstPass = attempts.filter((attempt) => attempt.firstPassStructured).length;
  const validCandidates = attempts.reduce((sum, attempt) => sum + attempt.validCandidateCount, 0);
  const modelCalls = attempts.reduce((sum, attempt) => sum + attempt.modelCallCount, 0);
  const metrics = {
    firstPassStructuredRate: round(ratio(firstPass, attempts.length)),
    repairedSuccessRate: round(ratio(successes.length, attempts.length)),
    finalFailureRate: round(ratio(attempts.length - successes.length, attempts.length)),
    modelCallsPerValidCandidate: round(ratio(modelCalls, validCandidates)),
    answerAccuracy: round(ratio(successes.filter((item) => item.answerCorrect).length, successes.length)),
    humanConfirmedDuplicateRate: round(ratio(successes.filter((item) => item.humanConfirmedDuplicate).length, successes.length)),
    crossCourseSimilarityRate: round(ratio(successes.filter((item) => item.crossCourseSimilar).length, successes.length)),
    machineDuplicateRate: round(ratio(successes.filter((item) => item.machineDuplicate === true).length, successes.length)),
  };
  const gates = {
    firstPassStructuredRate: metrics.firstPassStructuredRate >= STAGE2_THRESHOLDS.firstPassStructuredRate,
    repairedSuccessRate: metrics.repairedSuccessRate >= STAGE2_THRESHOLDS.repairedSuccessRate,
    finalFailureRate: metrics.finalFailureRate <= STAGE2_THRESHOLDS.finalFailureRate,
    modelCallsPerValidCandidate: metrics.modelCallsPerValidCandidate <= STAGE2_THRESHOLDS.modelCallsPerValidCandidate,
    answerAccuracy: metrics.answerAccuracy >= STAGE2_THRESHOLDS.answerAccuracy,
    humanConfirmedDuplicateRate: metrics.humanConfirmedDuplicateRate <= STAGE2_THRESHOLDS.humanConfirmedDuplicateRate,
    machineDuplicateScreened: successes.every((item) => typeof item.machineDuplicate === 'boolean'),
  };
  return {
    generatedAt: new Date().toISOString(),
    manifestHash: stableHash(manifest),
    sampleSize: attempts.length,
    humanReviewedCandidateCount: successes.length,
    duplicatePolicy: 'same-lesson-approved-baseline',
    machineDuplicatePolicy: {
      scope: 'same-lesson-approved-baseline',
      threshold: 0.92,
      administratorConfirmationRequired: true,
      screenedCandidateCount: successes.filter((item) => typeof item.machineDuplicate === 'boolean').length,
      machineDuplicateCount: successes.filter((item) => item.machineDuplicate === true).length,
    },
    observationOnly: ['crossCourseSimilarityRate'],
    metrics,
    thresholds: STAGE2_THRESHOLDS,
    gates,
    passed: Object.values(gates).every(Boolean),
  };
}

function main(): void {
  const inputPath = path.resolve(getArgument('input') || 'evals/datasets/exercise-generation-results-human-reviewed.json');
  const manifestPath = path.resolve(getArgument('manifest') || `${inputPath}.manifest.json`);
  const outputValue = getArgument('output');
  const outputPath = outputValue ? path.resolve(outputValue) : null;
  if (!fs.existsSync(inputPath) || !fs.existsSync(manifestPath)) {
    throw new Error('缺少人工标注结果或对应运行 manifest。');
  }
  const attempts = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as GenerationAttempt[];
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  if (!Array.isArray(attempts)) throw new Error('出题评测输入必须是数组。');
  const report = scoreExerciseGeneration(attempts, manifest);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, serialized, 'utf8');
  }
  process.stdout.write(serialized);
  if (!report.passed) process.exitCode = 1;
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
