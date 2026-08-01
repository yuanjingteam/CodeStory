import '../src/config/env';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exerciseGenerationStage2Dataset } from './datasets/exercise-generation-stage2';
import {
  generateExerciseCandidateForEvaluation,
  getExerciseGenerationRuntimeConfig,
} from '../src/services/ai/exercise-gen';
import { getAiConfig } from '../src/config/ai';
import {
  assertUniqueExpectedIds,
  createRunIdentity,
  getCodeStatus,
  hashFile,
  stableHash,
} from './eval-integrity';

const concurrencyArg = process.argv.find((item) => item.startsWith('--concurrency='));
const concurrency = Math.max(1, Math.min(8, Number(concurrencyArg?.split('=')[1] || 5)));
const outputArg = process.argv.find((item) => item.startsWith('--output='));
const limitArg = process.argv.find((item) => item.startsWith('--limit='));
const limit = Math.max(1, Math.min(100, Number(limitArg?.split('=')[1] || 100)));
const outputPath = path.resolve(
  outputArg?.slice('--output='.length)
    || 'evals/datasets/exercise-generation-results.json'
);
const resume = process.argv.includes('--resume');

export interface EvaluationRunManifest {
  version: 2;
  runId: string;
  createdAt: string;
  datasetHash: string;
  promptSourceHash: string;
  codeStatus: string;
  sampleCount: number;
  concurrency: number;
  model: string;
  baseUrl: string | null;
  runtime: ReturnType<typeof getExerciseGenerationRuntimeConfig>;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function manifestsMatch(
  left: EvaluationRunManifest,
  right: EvaluationRunManifest
): boolean {
  const { runId: _leftRunId, createdAt: _leftCreatedAt, ...leftConfig } = left;
  const { runId: _rightRunId, createdAt: _rightCreatedAt, ...rightConfig } = right;
  return JSON.stringify(leftConfig) === JSON.stringify(rightConfig);
}

export function assertEvaluationRunCanStart(options: {
  resume: boolean;
  outputExists: boolean;
  manifestExists: boolean;
  outputPath: string;
  currentManifest: EvaluationRunManifest;
  existingManifest?: EvaluationRunManifest;
}): void {
  if (!options.resume && (options.outputExists || options.manifestExists)) {
    throw new Error(
      `评测输出已存在：${options.outputPath}。新运行必须使用新路径；仅恢复同一次运行时可显式传入 --resume。`
    );
  }
  if (!options.resume) return;
  if (!options.manifestExists) {
    throw new Error('--resume 要求已有 manifest；输出可由 manifest-only 检查点安全恢复。');
  }
  if (
    !options.existingManifest
    || !manifestsMatch(options.existingManifest, options.currentManifest)
  ) {
    throw new Error(
      'manifest 与当前模型、Prompt、数据集、并发或运行参数不一致，拒绝混合评测结果。'
    );
  }
}

export function assertExistingEvaluationResults(
  existing: Array<Record<string, unknown>>,
  expectedIds: ReadonlySet<string>
): void {
  assertUniqueExpectedIds(existing, expectedIds, '已有评测输出');
}

async function main() {
  const selectedDataset = exerciseGenerationStage2Dataset.slice(0, limit);
  const manifestPath = `${outputPath}.manifest.json`;
  const aiConfig = getAiConfig();
  const promptSourcePath = path.resolve('src/services/ai/exercise-gen/service.ts');
  const manifest: EvaluationRunManifest = {
    version: 2,
    ...createRunIdentity(),
    datasetHash: stableHash(selectedDataset),
    promptSourceHash: hashFile(promptSourcePath),
    codeStatus: getCodeStatus(path.resolve('..')),
    sampleCount: selectedDataset.length,
    concurrency,
    model: aiConfig.model,
    baseUrl: aiConfig.baseUrl || null,
    runtime: getExerciseGenerationRuntimeConfig(1),
  };
  const outputExists = await pathExists(outputPath);
  const manifestExists = await pathExists(manifestPath);

  let existingManifest: EvaluationRunManifest | undefined;
  if (resume) {
    if (manifestExists) {
      existingManifest = JSON.parse(
        await readFile(manifestPath, 'utf8')
      ) as EvaluationRunManifest;
      manifest.runId = existingManifest.runId;
      manifest.createdAt = existingManifest.createdAt;
    }
  }
  assertEvaluationRunCanStart({
    resume,
    outputExists,
    manifestExists,
    outputPath,
    currentManifest: manifest,
    existingManifest,
  });
  if (!resume) {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  let existing: Array<Record<string, unknown>> = [];
  if (resume && outputExists) {
    existing = JSON.parse(await readFile(outputPath, 'utf8'));
    if (!Array.isArray(existing)) throw new Error('已有评测输出必须是数组。');
    assertExistingEvaluationResults(existing, new Set(selectedDataset.map((item) => item.id)));
  }
  const byId = new Map(existing.map((item) => [String(item.id), item]));

  async function runItem(item: typeof exerciseGenerationStage2Dataset[number]) {
    try {
      const generated = await generateExerciseCandidateForEvaluation(item);
      return {
          id: item.id,
          ...generated.metrics,
          finalSuccess: true,
          validCandidateCount: generated.candidates.length,
          candidate: generated.candidates[0],
          evidence: item.evidence,
          agentAnswerCorrect: null,
          machineDuplicate: null,
          agentConfirmedDuplicate: null,
          labelProvenance: 'pending-human-review',
      };
    } catch (error) {
      const errorDetail = error && typeof error === 'object' && 'originalCause' in error
        ? error.originalCause
        : undefined;
      const diagnostics = errorDetail && typeof errorDetail === 'object'
        ? errorDetail as Record<string, unknown>
        : {};
      return {
          id: item.id,
          firstPassStructured: false,
          repaired: false,
          finalSuccess: false,
          modelCallCount: typeof diagnostics.modelCallCount === 'number'
            ? diagnostics.modelCallCount
            : 1,
          firstFailureKind: diagnostics.firstFailureKind,
          repairFailureKind: diagnostics.repairFailureKind,
          attemptLatenciesMs: diagnostics.attemptLatenciesMs,
          validCandidateCount: 0,
          error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
          errorDetail,
          agentAnswerCorrect: null,
          machineDuplicate: null,
          agentConfirmedDuplicate: null,
          labelProvenance: 'pending-human-review',
      };
    }
  }

  const pending = selectedDataset.filter((item) => !byId.has(item.id));
  for (let offset = 0; offset < pending.length; offset += concurrency) {
    const batch = pending.slice(offset, offset + concurrency);
    const completed = await Promise.all(batch.map(runItem));
    completed.forEach((item) => byId.set(String(item.id), item));
    const checkpoint = selectedDataset
      .map((item) => byId.get(item.id))
      .filter((item): item is Record<string, unknown> => Boolean(item));
    await writeFile(outputPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
    process.stdout.write(`checkpoint ${checkpoint.length}/${selectedDataset.length}\n`);
  }
  const results = selectedDataset.map((item) => byId.get(item.id)!);
  process.stdout.write(`${JSON.stringify({
    outputPath,
    attempts: results.length,
    successes: results.filter((item) => item.finalSuccess).length,
    concurrency,
  }, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
