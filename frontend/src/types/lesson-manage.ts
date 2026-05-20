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
