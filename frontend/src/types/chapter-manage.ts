export interface ChapterItem {
  id: string;
  courseId: string;
  courseName: string;
  chapterName: string;
  sectionCount: number;
  sortOrder: number;
  createdAt: string;
  updateAt: string;
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
