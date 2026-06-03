export interface HomeCourse {
  id: string;
  title: string;
  cover_url: string;
  description: string;
  level: number;
  course_seq: number;
  student_count: number;
  completed_lessons: number;
  total_lessons: number;
}

export interface HomeData {
  course_count: number;
  lesson_count: number;
  completion_rate: number;
  user_count: number;
}
