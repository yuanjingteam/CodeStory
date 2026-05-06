export interface CourseDetailResponse {
  code: number;
  data: CourseDetailData;
  message: string;
}

export interface CourseDetailData {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  level: number;
  chapterCount: number;
  lessonCount: number;
  estimatedTotalTime: number;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  lessonCount: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  difficulty: number;
  estimated_time: number;
}
