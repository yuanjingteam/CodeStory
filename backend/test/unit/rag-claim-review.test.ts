import { describe, expect, it } from 'vitest';
import { normalizeClaimBatchIndexes } from '../../evals/lib/rag-claim-review';

describe('RAG 陈述审核批次索引', () => {
  const candidates = Array.from({ length: 3 }, (_, index) => ({
    index: index + 8,
  }));

  it('保留模型返回的完整全局索引', () => {
    const reviews = candidates.map(({ index }) => ({
      index,
      supported: true,
    }));

    expect(
      normalizeClaimBatchIndexes(candidates, reviews)
    ).toEqual(reviews);
  });

  it('把完整且唯一的批内索引映射为全局索引', () => {
    const reviews = [
      { index: 2, supported: true },
      { index: 0, supported: false },
      { index: 1, supported: true },
    ];

    expect(
      normalizeClaimBatchIndexes(candidates, reviews).map(
        (review) => review.index
      )
    ).toEqual([10, 8, 9]);
  });

  it('不掩盖缺项或重复索引', () => {
    const incomplete = [
      { index: 0, supported: true },
      { index: 0, supported: false },
    ];

    expect(
      normalizeClaimBatchIndexes(candidates, incomplete)
    ).toEqual(incomplete);
  });
});
