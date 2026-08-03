export const EXERCISE_GENERATION_DUPLICATE_THRESHOLD = 0.92;

export interface ApprovedLessonEmbedding {
  exerciseId: string;
  lessonId: string;
  embedding: number[];
}

export interface DuplicateScreenResult {
  machineDuplicate: boolean;
  matchedExerciseId: string | null;
  similarity: number | null;
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

/**
 * Deterministic machine pre-screen. Only approved exercises from the same
 * lesson are considered; the administrator sidecar remains authoritative.
 */
export function screenAgainstApprovedLesson(
  candidate: { lessonId: string; embedding: number[] },
  baseline: ApprovedLessonEmbedding[],
  threshold = EXERCISE_GENERATION_DUPLICATE_THRESHOLD,
): DuplicateScreenResult {
  let best: { exerciseId: string; similarity: number } | null = null;
  for (const item of baseline) {
    if (item.lessonId !== candidate.lessonId) continue;
    const similarity = cosineSimilarity(candidate.embedding, item.embedding);
    if (!best || similarity > best.similarity) best = { exerciseId: item.exerciseId, similarity };
  }
  return {
    machineDuplicate: best !== null && best.similarity >= threshold,
    matchedExerciseId: best?.exerciseId ?? null,
    similarity: best ? Number(best.similarity.toFixed(6)) : null,
  };
}
