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
    score_deduction: number[];
  };
}

export type HintsValue = HintConfig | string | null;

export interface LessonItem {
  id: string;
  lessonId: string;
  lessonName: string;
  courseId: string;
  courseName: string;
  chapterId: string;
  chapterName: string;
  type: string;
  content: string;
  knowledge: string;
  answer: string;
  analysis: string;
  difficulty: number;
  source: string;
  sortOrder: number;
  metadata: MetadataValue;
  hints: HintsValue;
  createdAt: string;
  updateAt: string;
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
