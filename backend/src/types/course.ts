export interface CourseListParams {
  keyword?: string;
  level?: number;
  learnStatus?: number;
  minStudentCount?: number;
  maxStudentCount?: number;
  page?: number;
  size?: number;
}

export interface LessonInfo {
  id: string;
  title: string;
  difficulty: number;
  estimated_time: number;
}

export interface ChapterInfo {
  id: string;
  title: string;
  order: number;
  lessonCount: number;
  lessons: LessonInfo[];
}

export interface CourseListItem {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  level: number;
  progress: number;
  progressText: string;
  learnStatus: number;
}

export interface CourseListResult {
  records: CourseListItem[];
  total: number;
  page: number;
  size: number;
}

export interface CourseDetailData {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  level: number;
  chapterCount: number;
  lessonCount: number;
  estimatedTotalTime: number;
  chapters: ChapterInfo[];
}
