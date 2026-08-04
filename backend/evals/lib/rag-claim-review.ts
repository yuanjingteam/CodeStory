export interface IndexedClaimCandidate {
  index: number;
}

export interface IndexedClaimVerdict {
  index: number;
}

export function normalizeClaimBatchIndexes<
  T extends IndexedClaimVerdict,
>(
  candidates: IndexedClaimCandidate[],
  reviews: T[]
): T[] {
  const expectedIndexes = new Set(
    candidates.map((candidate) => candidate.index)
  );
  const returnedIndexes = reviews.map((review) => review.index);

  if (
    reviews.length === candidates.length &&
    returnedIndexes.every((index) => expectedIndexes.has(index))
  ) {
    return reviews;
  }

  const localIndexes = new Set(returnedIndexes);
  const usesCompleteLocalIndexes =
    reviews.length === candidates.length &&
    localIndexes.size === candidates.length &&
    returnedIndexes.every(
      (index) =>
        Number.isInteger(index) &&
        index >= 0 &&
        index < candidates.length
    );

  if (!usesCompleteLocalIndexes) return reviews;

  return reviews.map((review) => ({
    ...review,
    index: candidates[review.index].index,
  }));
}
