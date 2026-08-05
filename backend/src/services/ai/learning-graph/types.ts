export const GUIDED_LEARNING_PHASES = [
  'INIT',
  'EXPLAIN',
  'QUESTION',
  'WAIT_ANSWER',
  'EVALUATE',
  'HINT',
  'REVIEW',
  'COMPLETE',
  'EMPTY',
  'RESTART_REQUIRED',
] as const;

export type GuidedLearningPhase =
  (typeof GUIDED_LEARNING_PHASES)[number];

export const GUIDED_PHASE_CODE: Record<
  GuidedLearningPhase,
  number
> = {
  INIT: 0,
  EXPLAIN: 1,
  QUESTION: 2,
  WAIT_ANSWER: 3,
  EVALUATE: 4,
  HINT: 5,
  REVIEW: 6,
  COMPLETE: 7,
  EMPTY: 8,
  RESTART_REQUIRED: 9,
};

export interface GuidedLearningInput {
  answer: string;
}

export interface GuidedLearningPublicState {
  runId: string;
  graphVersion: string;
  stateVersion: number;
  phase: GuidedLearningPhase;
  lessonId: string;
  exerciseId: string | null;
  exerciseContent: string | null;
  exerciseType: string | null;
  explanation: string | null;
  hintLevel: number;
  hint: string | null;
  feedback: string | null;
  score: number | null;
  correct: boolean | null;
}

export class GuidedLearningConflictError extends Error {
  constructor(
    public readonly current: GuidedLearningPublicState | null
  ) {
    super('GUIDED_LEARNING_STATE_CONFLICT');
  }
}

export class GuidedLearningNotFoundError extends Error {
  constructor(message = '引导式学习运行不存在') {
    super(message);
  }
}

export class GuidedLearningRestartRequiredError extends Error {
  constructor(
    public readonly current: GuidedLearningPublicState
  ) {
    super('GUIDED_LEARNING_RESTART_REQUIRED');
  }
}
