import type {
  KnowledgeIndexStatus,
  KnowledgeIndexSummary,
} from './knowledge-index';

export interface ChapterItem {
  id: string;
  courseId: string;
  courseName: string;
  chapterName: string;
  sectionCount: number;
  sortOrder: number;
  createdAt: string;
  updateAt: string;
  deletedAt?: string | null;
  purgeAt?: string | null;
  indexStatus?: KnowledgeIndexStatus;
  indexSummary?: KnowledgeIndexSummary;
}

export interface ChapterListResponse {
  code: number;
  msg: string;
  data: {
    total: number;
    data: ChapterItem[];
  };
}

export interface CreateChapterRequest {
  courseId: string;
  chapterName: string;
  sortOrder?: number;
}

export interface CreateChapterResponse {
  code: number;
  msg: string;
  data: ChapterItem;
}

export interface UpdateChapterRequest {
  chapterName?: string;
  sortOrder?: number;
}

export interface UpdateChapterResponse {
  code: number;
  msg: string;
  data: ChapterItem;
}

export interface DeleteChapterResponse {
  code: number;
  msg: string;
  data: null;
}

export interface RestoreChapterResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    restoredLessons: number;
  };
}
