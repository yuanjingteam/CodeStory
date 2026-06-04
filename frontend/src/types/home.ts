export interface HomeCourse {
  id: string;
  title: string;
  cover_url: string;
  description: string;
  level: number;
  study_count: number;
}

export interface HomeData {
  course_count: number;
  lesson_count: number;
  completion_rate: number;
  user_count: number;
}
