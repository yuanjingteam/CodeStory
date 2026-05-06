export interface LessonDetailResponse {
  code: number;
  data: LessonDetailData;
  message: string;
}

export interface LessonDetailData {
  id: string;
  title: string;
  description?: string;
  content: string;
  difficulty: number;
  estimated_time: number;
  order: number;
  chapter_id: string;
  course_id: string;
  video_url?: string;
  resources?: LessonResource[];
}

export interface LessonResource {
  id: string;
  title: string;
  url: string;
  type: 'document' | 'video' | 'code' | 'link';
}
