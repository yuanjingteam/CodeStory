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
  // 可空：Prisma 侧是 metadata Json?，此前非空的断言会让 SQL NULL 直接崩掉组件
  metadata: ChoiceMetadata | CodeMetadata | null;
  hints: HintConfig | null;
  /** 后端判定这道题能否作答；选项配置坏掉时为 false */
  usable?: boolean;
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

export interface ChoiceOptionExplanation {
  label: string;
  explanation: string;
  isCorrect: boolean;
}

export interface ChoiceExplanationData {
  summary: string;
  correctOption: string;
  selectedOption: string;
  correctExplanation: string;
  selectedExplanation: string;
  optionExplanations: ChoiceOptionExplanation[];
  studyTip: string;
}

export interface ChoiceExplanationResponse {
  code: number;
  message: string;
  data: ChoiceExplanationData;
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
