export type ManagedExerciseType = 'single_choice' | 'code';
export type ExerciseReviewStatus = 'draft' | 'approved' | 'rejected';

export interface ManagedExerciseMetadata {
  options?: string[];
  codeTemplate?: string;
  language?: string;
  testCases?: Array<{ input: string; output: string }>;
  [key: string]: unknown;
}

export interface ExerciseGenerationMetadata {
  traceId?: string;
  model?: string;
  promptVersion?: string;
  retrieval?: {
    fallback?: boolean;
    sources?: Array<{
      sourceType?: string;
      sourceId?: string;
      chunkIndex?: number;
      contentHash?: string;
      score?: number;
      excerpt?: string;
    }>;
  };
  parameters?: Record<string, unknown>;
  selfCheck?: {
    formatValid?: boolean;
    answerExists?: boolean;
    difficultyMatch?: boolean;
    notes?: string[];
  };
  duplicateCheck?: {
    matched?: boolean;
    exerciseId?: string;
    similarity?: number;
  };
  generationMetrics?: {
    firstPassStructured?: boolean;
    repaired?: boolean;
    modelCallCount?: number;
  };
  generatedAt?: string;
}

export interface ManagedExercise {
  id: string;
  lessonId: string;
  lessonName: string;
  chapterId: string;
  chapterName: string;
  courseId: string;
  courseName: string;
  type: ManagedExerciseType;
  content: string;
  answer: string;
  analysis: string;
  knowledge: string;
  difficulty: number;
  source: string;
  reviewStatus: ExerciseReviewStatus;
  metadata: ManagedExerciseMetadata | null;
  genMetadata: ExerciseGenerationMetadata | null;
  order: number;
  waitSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseManageWriteInput {
  lessonId: string;
  type: ManagedExerciseType;
  content: string;
  answer: string;
  analysis: string;
  knowledge: string;
  difficulty: number;
  source: string;
  metadata: ManagedExerciseMetadata;
}

export interface ExerciseManageListQuery {
  courseId?: string;
  chapterId?: string;
  lessonId?: string;
  type?: ManagedExerciseType;
  difficulty?: number;
  source?: string;
  reviewStatus?: ExerciseReviewStatus;
  keyword?: string;
  queue?: boolean;
  page?: number;
  size?: number;
}

export interface ExerciseGenerationInput {
  lessonId: string;
  knowledge: string;
  type: ManagedExerciseType;
  difficulty: number;
  count: number;
}

export interface ExerciseGenerationResult {
  drafts: Array<
    Pick<
      ManagedExercise,
      | 'id'
      | 'lessonId'
      | 'type'
      | 'content'
      | 'answer'
      | 'analysis'
      | 'knowledge'
      | 'difficulty'
      | 'source'
      | 'reviewStatus'
      | 'metadata'
      | 'genMetadata'
      | 'createdAt'
    >
  >;
  metrics: {
    firstPassStructured: boolean;
    repaired: boolean;
    modelCallCount: number;
  };
}
