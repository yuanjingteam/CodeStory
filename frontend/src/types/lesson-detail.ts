export interface LessonDetailResponse {
  code: number;
  data: LessonDetailData;
  message: string;
}

export interface LessonDetailData {
  course: CourseInfo;
  currentLesson: CurrentLesson;
  catalog: Chapter[];
  exercises: Exercise[];
}

export interface CourseInfo {
  id: string;
  title: string;
  progress: number;
}

export interface CurrentLesson {
  id: string;
  title: string;
  content: string;
  difficulty: number;
  estimatedTime: number;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: LessonItem[];
}

export interface LessonItem {
  id: string;
  title: string;
  status: 0 | 1 | 2;
}

export interface Exercise {
  id: string;
  type: 'code' | 'choice' | 'fill';
  content: string;
  analysis: string;
  order: number;
  metadata: {
    template: string;
    testCases?: TestCase[];
  };
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}
