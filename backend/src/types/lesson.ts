export type ExerciseType = 'code' | 'choice' | 'fill';

export interface LessonExercise {
  id: string;
  type: ExerciseType;
  content: string;
  analysis: string;
  metadata: Record<string, any>;
}

export interface CatalogLesson {
  id: string;
  title: string;
  status: 0 | 1 | 2;
}

export interface CatalogChapter {
  id: string;
  title: string;
  lessons: CatalogLesson[];
}

export interface LessonCourseInfo {
  id: string;
  title: string;
  progress: number;
}

export interface CurrentLessonInfo {
  id: string;
  title: string;
  content: string;
  difficulty: number;
  estimatedTime: number;
}

export interface LessonDetailData {
  course: LessonCourseInfo;
  currentLesson: CurrentLessonInfo;
  catalog: CatalogChapter[];
  exercise: LessonExercise;
}
