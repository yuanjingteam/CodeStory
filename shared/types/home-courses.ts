export interface Course {
  id: number;
  title: string;
  description: string;
  icon: string;
  level: string;
  levelColor: string;
  progress: number;
}

export interface HomeCoursesProps {
  courses: Course[];
}
