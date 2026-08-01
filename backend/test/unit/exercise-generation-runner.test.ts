import { describe, expect, it } from 'vitest';
import {
  assertEvaluationRunCanStart,
  assertExistingEvaluationResults,
  type EvaluationRunManifest,
} from '../../evals/run-exercise-generation-stage2';
import { getExerciseGenerationRuntimeConfig } from '../../src/services/ai/exercise-gen';

function createManifest(
  overrides: Partial<EvaluationRunManifest> = {}
): EvaluationRunManifest {
  return {
    version: 2,
    runId: 'run-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    datasetHash: 'fixed-dataset-hash',
    promptSourceHash: 'fixed-prompt-hash',
    codeStatus: 'fixed-code-status',
    sampleCount: 100,
    concurrency: 3,
    model: 'test-model',
    baseUrl: 'https://example.test/v1',
    runtime: getExerciseGenerationRuntimeConfig(1),
    ...overrides,
  };
}

describe('阶段 2 · 出题评测续跑保护', () => {
  it('使用独立且有边界的出题超时配置', () => {
    const original = process.env.AI_EXERCISE_GENERATION_TIMEOUT_MS;
    try {
      delete process.env.AI_EXERCISE_GENERATION_TIMEOUT_MS;
      expect(getExerciseGenerationRuntimeConfig(1).timeoutMs).toBe(180_000);
      expect(getExerciseGenerationRuntimeConfig(1).responseFormat).toBe(
        'json_object'
      );

      process.env.AI_EXERCISE_GENERATION_TIMEOUT_MS = '240000';
      expect(getExerciseGenerationRuntimeConfig(1).timeoutMs).toBe(240_000);

      process.env.AI_EXERCISE_GENERATION_TIMEOUT_MS = '30000';
      expect(getExerciseGenerationRuntimeConfig(1).timeoutMs).toBe(180_000);
    } finally {
      if (original === undefined) {
        delete process.env.AI_EXERCISE_GENERATION_TIMEOUT_MS;
      } else {
        process.env.AI_EXERCISE_GENERATION_TIMEOUT_MS = original;
      }
    }
  });

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

  it('允许完整检查点或仅 manifest 的安全续跑，并忽略运行身份字段', () => {
    const manifest = createManifest();
    expect(() => assertEvaluationRunCanStart({
      resume: true,
      outputExists: true,
      manifestExists: true,
      outputPath: 'existing.json',
      currentManifest: manifest,
      existingManifest: structuredClone(manifest),
    })).not.toThrow();
    expect(() => assertEvaluationRunCanStart({
      resume: true,
      outputExists: false,
      manifestExists: true,
      outputPath: 'missing.json',
      currentManifest: createManifest({ runId: 'new-run', createdAt: '2026-08-02T00:00:00.000Z' }),
      existingManifest: manifest,
    })).not.toThrow();
  });

  it('拒绝重复、非法或不属于当前数据集的已有 ID', () => {
    const expected = new Set(['case-1', 'case-2']);
    expect(() => assertExistingEvaluationResults([{ id: 'case-1' }, { id: 'case-1' }], expected)).toThrow(/重复/);
    expect(() => assertExistingEvaluationResults([{ id: '' }], expected)).toThrow(/无效/);
    expect(() => assertExistingEvaluationResults([{ id: 'other' }], expected)).toThrow(/不属于/);
  });
});
