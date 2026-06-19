export interface ExerciseDetailResponse {
  code: number;
  message: string;
  data: ExerciseDetailData;
}

export interface HintConfig {
  [key: `level_${number}`]: string;
  _meta: {
    max_level: number;
  };
}

export interface ExerciseDetailData {
  id: string;
  lesson_id: string;
  type: 'single_choice' | 'code' | 'fill';
  knowledge: string;
  content: string;
  analysis: string;
  difficulty: number;
  metadata: ChoiceMetadata | CodeMetadata;
  hints: HintConfig | null;
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

export interface ScoreBreakdown {
  functionalScore: number;
  qualityScore: number;
  hintDeduction: number;
  finalScore: number;
}

export interface SubmitAiReview {
  isLikelyCorrect: boolean;
  feedback: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  needsManualReview: boolean;
  status: 'completed' | 'failed';
}

export interface ExerciseSubmitResponse {
  code: number;
  message: string;
  data: {
    correct: boolean;
    score: number;
    feedback: string;
    analysis: string;
    scoreBreakdown?: ScoreBreakdown;
    aiReview?: SubmitAiReview;
  };
}
