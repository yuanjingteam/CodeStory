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

export interface ExerciseItem {
  id: string;
  type: string;
  exerciseContent: string;
  answer: string;
  metadata: MetadataValue;
  hints: HintsValue;
  order?: number;
}

export interface LessonItem {
  id: string;
  lessonId: string;
  lessonName: string;
  courseId: string;
  courseName: string;
  chapterId: string;
  chapterName: string;
  content: string;
  difficulty: number;
  sortOrder: number;
  estimatedTime: number;
  exercises: ExerciseItem[];
  exerciseCount: number;
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
  estimatedTime?: number;
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
