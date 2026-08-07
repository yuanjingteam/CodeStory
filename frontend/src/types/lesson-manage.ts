import type {
  KnowledgeIndexStatus,
  KnowledgeIndexSummary,
} from './knowledge-index';

export interface ExerciseMetadata {
  template?: string;
  options?: string[];
  testCases?: Array<{ input: string; output: string }>;
  [key: string]: unknown;
}

export type MetadataValue = ExerciseMetadata | string | null;

export interface HintConfig {
  [key: `level_${number}`]: string;
  _meta: {
    max_level: number;
  };
}

export type HintsValue = HintConfig | string | null;
export type KnowledgeIndexPolicy = 'auto' | 'include' | 'exclude';

export interface ExerciseItem {
  id: string;
  type: string;
  exerciseContent: string;
  answer: string;
  knowledge: string;
  analysis: string;
  source: string;
  metadata: MetadataValue;
  hints: HintsValue;
  order?: number;
  knowledgeIndexPolicy?: KnowledgeIndexPolicy;
}

export interface DeletedExerciseItem extends ExerciseItem {
  deletedAt?: string | null;
  purgeAt?: string | null;
}

export interface LessonItem {
  id: string;
  uuid?: string;
  lessonId: string;
  lessonName: string;
  courseId: string;
  courseUuid?: string;
  courseName: string;
  chapterId: string;
  chapterUuid?: string;
  chapterName: string;
  content: string;
  difficulty: number;
  sortOrder: number;
  estimatedTime: number;
  knowledgeIndexPolicy: KnowledgeIndexPolicy;
  exercises: ExerciseItem[];
  deletedExercises?: DeletedExerciseItem[];
  exerciseCount: number;
  createdAt: string;
  updateAt: string;
  deletedAt?: string | null;
  purgeAt?: string | null;
  indexStatus: KnowledgeIndexStatus;
  indexSummary: KnowledgeIndexSummary;
}

export interface LessonListResponse {
  code: number;
  msg: string;
  data: {
    total: number;
    data: LessonItem[];
  };
}

export interface CreateLessonRequest {
  chapterId: string;
  lessonName: string;
  content?: string;
  type?: string;
  difficulty?: number;
  sortOrder?: number;
  answer?: string;
  metadata?: MetadataValue;
  hints?: HintsValue;
  estimatedTime?: number;
  knowledgeIndexPolicy?: KnowledgeIndexPolicy;
  exercises?: ExerciseItem[];
}

export interface CreateLessonResponse {
  code: number;
  msg: string;
  data: LessonItem;
}

export interface UpdateLessonRequest {
  lessonName?: string;
  content?: string;
  type?: string;
  difficulty?: number;
  sortOrder?: number;
  answer?: string;
  metadata?: MetadataValue;
  hints?: HintsValue;
  estimatedTime?: number;
  knowledgeIndexPolicy?: KnowledgeIndexPolicy;
  exercises?: ExerciseItem[];
}

export interface UpdateLessonResponse {
  code: number;
  msg: string;
  data: LessonItem;
}

export interface DeleteLessonResponse {
  code: number;
  msg: string;
  data: null;
}

export interface ReindexLessonResponse {
  code: number;
  msg: string;
  data: {
    lessonId: string;
    sourceCount: number;
    readyCount: number;
    failedCount: number;
    indexStatus: KnowledgeIndexStatus;
    indexSummary: KnowledgeIndexSummary;
  };
}

export interface ReindexLessonsBatchRequest {
  courseId?: string;
  chapterId?: string;
  keyword?: string;
  difficulty?: number;
}

export interface ReindexLessonsBatchResponse {
  code: number;
  msg: string;
  data: {
    lessonCount: number;
    sourceCount: number;
    readyCount: number;
    failedCount: number;
    indexStatus: KnowledgeIndexStatus;
    indexSummary: KnowledgeIndexSummary;
  };
}
