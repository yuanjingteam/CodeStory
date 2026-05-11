export interface ExerciseDetailResponse {
  code: number;
  message: string;
  data: ExerciseDetailData;
}

export interface ExerciseDetailData {
  id: string;
  lesson_id: string;
  type: 'choice' | 'code' | 'fill';
  knowledge: string;
  content: string;
  answer: string;
  analysis: string;
  difficulty: number;
  metadata: ChoiceMetadata | CodeMetadata;
  userAnswer?: UserAnswer;
}

export interface ChoiceMetadata {
  options: string[];
}

export interface CodeMetadata {
  codeTemplate: string;
  testCases?: TestCase[];
}

export interface TestCase {
  input: string;
  output: string;
}

export interface UserAnswer {
  answer: string;
  submission_count: number;
  feedback: string;
  hint_level_used: number;
  score: number;
}

export interface ExerciseSubmitResponse {
  code: number;
  message: string;
  data: {
    correct: boolean;
    score: number;
    feedback: string;
    analysis: string;
  };
}
