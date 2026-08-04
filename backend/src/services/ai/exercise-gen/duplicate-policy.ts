export const EXERCISE_GENERATION_DUPLICATE_CODE =
  'EXERCISE_GENERATION_DUPLICATE' as const;

export const EXERCISE_GENERATION_DUPLICATE_THRESHOLD = 0.92;

export type ExerciseDuplicateReviewStatus =
  | 'draft'
  | 'approved'
  | 'rejected';

export type ExerciseDuplicateCheckPhase = 'preflight' | 'post_lock';

export interface ExistingExerciseDuplicateCheck {
  candidateIndex: number;
  candidateLessonId: string;
  matchedExerciseId: string;
  matchedLessonId: string;
  reviewStatus: ExerciseDuplicateReviewStatus;
  similarity: number;
}

export interface BatchExerciseDuplicateCheck {
  candidateIndex: number;
  matchedCandidateIndex: number;
  lessonId: string;
  similarity: number;
}

export interface ExerciseDuplicatePolicyInput {
  lessonId: string;
  existingChecks: ExistingExerciseDuplicateCheck[];
  batchChecks: BatchExerciseDuplicateCheck[];
  phase?: ExerciseDuplicateCheckPhase;
  threshold?: number;
}

export interface ExerciseDuplicatePolicyDecision {
  blocked: boolean;
  code: typeof EXERCISE_GENERATION_DUPLICATE_CODE | null;
  phase: ExerciseDuplicateCheckPhase;
  existingMatches: ExistingExerciseDuplicateCheck[];
  batchMatches: BatchExerciseDuplicateCheck[];
}

const ACTIVE_REVIEW_STATUSES = new Set<ExerciseDuplicateReviewStatus>([
  'draft',
  'approved',
]);

function isValidSimilarity(value: number): boolean {
  return Number.isFinite(value) && value >= -1 && value <= 1;
}

function requireValidInput(input: ExerciseDuplicatePolicyInput): void {
  if (!input.lessonId.trim()) {
    throw new TypeError('lessonId 不能为空。');
  }

  const threshold =
    input.threshold ?? EXERCISE_GENERATION_DUPLICATE_THRESHOLD;
  if (!isValidSimilarity(threshold)) {
    throw new TypeError('重复阈值必须是 -1 到 1 之间的有限数值。');
  }

  for (const check of input.existingChecks) {
    if (!isValidSimilarity(check.similarity)) {
      throw new TypeError('既有题重复检查包含无效相似度。');
    }
  }
  for (const check of input.batchChecks) {
    if (!isValidSimilarity(check.similarity)) {
      throw new TypeError('批内重复检查包含无效相似度。');
    }
  }
}

export function evaluateExerciseDuplicatePolicy(
  input: ExerciseDuplicatePolicyInput
): ExerciseDuplicatePolicyDecision {
  requireValidInput(input);
  const phase = input.phase ?? 'preflight';
  const threshold =
    input.threshold ?? EXERCISE_GENERATION_DUPLICATE_THRESHOLD;

  const existingMatches = input.existingChecks.filter(
    (check) =>
      check.candidateLessonId === input.lessonId &&
      check.matchedLessonId === input.lessonId &&
      ACTIVE_REVIEW_STATUSES.has(check.reviewStatus) &&
      check.similarity >= threshold
  );
  const batchMatches = input.batchChecks.filter(
    (check) =>
      check.lessonId === input.lessonId &&
      check.candidateIndex !== check.matchedCandidateIndex &&
      check.similarity >= threshold
  );
  const blocked = existingMatches.length > 0 || batchMatches.length > 0;

  return {
    blocked,
    code: blocked ? EXERCISE_GENERATION_DUPLICATE_CODE : null,
    phase,
    existingMatches,
    batchMatches,
  };
}

export class ExerciseGenerationDuplicateError extends Error {
  readonly code = EXERCISE_GENERATION_DUPLICATE_CODE;
  readonly publicMessage =
    '生成结果与该小节现有题目或同批候选重复，本次未保存任何草稿。';

  constructor(
    public readonly decision: ExerciseDuplicatePolicyDecision
  ) {
    super(EXERCISE_GENERATION_DUPLICATE_CODE);
    this.name = 'ExerciseGenerationDuplicateError';
  }
}

export function assertNoExerciseGenerationDuplicates(
  input: ExerciseDuplicatePolicyInput
): ExerciseDuplicatePolicyDecision {
  const decision = evaluateExerciseDuplicatePolicy(input);
  if (decision.blocked) {
    throw new ExerciseGenerationDuplicateError(decision);
  }
  return decision;
}
