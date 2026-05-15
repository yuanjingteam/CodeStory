export interface Exercise {
  id: string;
  lesson_id: string;
  type: 'single_choice' | 'code' | 'fill';
  knowledge: string | null;
  content: string;
  answer: string;
  analysis: string | null;
  difficulty: number;
  metadata: any;
}

export interface UserAnswer {
  answer: string | null;
  submission_count: number;
  feedback: string | null;
  hint_level_used: number;
  score: number;
}

export interface ExerciseDetailResponse {
  id: string;
  lesson_id: string;
  type: string;
  knowledge: string;
  content: string;
  analysis: string;
  difficulty: number;
  metadata: any;
  userAnswer: {
    answer: string;
    submission_count: number;
    feedback: string;
    hint_level_used: number;
    score: number;
  } | null;
}

export interface ExerciseSubmitResponse {
  correct: boolean;
  score: number;
  feedback: string;
  analysis: string;
}
