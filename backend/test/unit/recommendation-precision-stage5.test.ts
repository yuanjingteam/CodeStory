import { describe, expect, it } from 'vitest';
import { recommendationStage5Dataset } from '../../evals/datasets/recommendation-stage5';
import {
  precisionAtK,
  scoreRecommendationDataset,
} from '../../evals/score-recommendation-precision';

describe('阶段 5 · 推荐 Precision@5 门禁', () => {
  it('固定标注集达到 Precision@5 ≥ 0.70', () => {
    const report = scoreRecommendationDataset(recommendationStage5Dataset);

    expect(report.sampleSize).toBe(10);
    expect(report.macroPrecisionAtK).toBeCloseTo(0.8, 8);
    expect(report.passed).toBe(true);
    expect(report.labelProvenance).toBe('spec-derived-review');
  });

  it('重复推荐不重复计为命中且缺位会降低 Precision', () => {
    expect(precisionAtK(['a', 'a', 'b'], ['a', 'b'], 5)).toBe(0.4);
  });

  it('拒绝无效的 k', () => {
    expect(() => precisionAtK(['a'], ['a'], 0)).toThrow(
      'k 必须是正整数'
    );
  });
});
