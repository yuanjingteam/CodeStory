import { describe, expect, it } from 'vitest';
import {
  assertEvaluationRunCanStart,
  type EvaluationRunManifest,
} from '../../evals/run-exercise-generation-stage2';
import { getExerciseGenerationRuntimeConfig } from '../../src/services/ai/exercise-gen';

function createManifest(
  overrides: Partial<EvaluationRunManifest> = {}
): EvaluationRunManifest {
  return {
    version: 1,
    datasetHash: 'fixed-dataset-hash',
    sampleCount: 100,
    concurrency: 3,
    model: 'test-model',
    baseUrl: 'https://example.test/v1',
    runtime: getExerciseGenerationRuntimeConfig(1),
    ...overrides,
  };
}

describe('阶段 2 · 出题评测续跑保护', () => {
  it('新运行默认拒绝复用已有输出', () => {
    expect(() => assertEvaluationRunCanStart({
      resume: false,
      outputExists: true,
      manifestExists: true,
      outputPath: 'existing.json',
      currentManifest: createManifest(),
    })).toThrow(/新路径/);
  });

  it('显式续跑仍拒绝混合不同配置或数据集', () => {
    expect(() => assertEvaluationRunCanStart({
      resume: true,
      outputExists: true,
      manifestExists: true,
      outputPath: 'existing.json',
      currentManifest: createManifest(),
      existingManifest: createManifest({ datasetHash: 'other-dataset' }),
    })).toThrow(/拒绝混合评测结果/);
  });

  it('仅允许输出与 manifest 齐全且完全匹配的续跑', () => {
    const manifest = createManifest();
    expect(() => assertEvaluationRunCanStart({
      resume: true,
      outputExists: true,
      manifestExists: true,
      outputPath: 'existing.json',
      currentManifest: manifest,
      existingManifest: structuredClone(manifest),
    })).not.toThrow();
  });
});
