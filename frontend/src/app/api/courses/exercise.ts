import request from '@/utils/request';
import type {
  ChoiceExplanationResponse,
  ExerciseDetailResponse,
  ExerciseSubmitResponse,
} from '@/types/exercise';
import type {
  GradingReviewLatest,
  GradingReviewSummary,
  ResponseData,
} from '@/types/grading-review';

interface HintData {
  content: string;
  level: number;
  maxLevel: number;
}

interface HintResponse {
  code: number;
  message: string;
  data: HintData;
}

interface AcquiredHintsData {
  hints: Array<{ level: number; content: string }>;
  currentLevel: number;
  maxLevel: number;
}

interface AcquiredHintsResponse {
  code: number;
  message: string;
  data: AcquiredHintsData;
}

export const exerciseApi = {
  getDetail: (exerciseId: string | number) => {
    return request.get<ExerciseDetailResponse>(`exercises/detail`, {
      params: { exercise_id: exerciseId }
    }).then(res => res.data);
  },

  getHint: (exerciseId: string | number, level: number) => {
    return request.get<HintResponse>('exercises/hint', {
      params: { 
        exercise_id: exerciseId,
        level 
      }
    }).then(res => res.data);
  },

  getAcquiredHints: (exerciseId: string | number) => {
    return request.get<AcquiredHintsResponse>('exercises/hints', {
      params: { exercise_id: exerciseId }
    }).then(res => res.data);
  },

  submit: (exerciseId: string | number, answer: string, recommendationToken?: string) => {
    return request.post<ExerciseSubmitResponse>('exercises/submit', {
      exercise_id: exerciseId,
      answer,
      ...(recommendationToken ? { recommendationToken } : {})
    }).then(res => res.data);
  },

  getLatestGradingReview: (exerciseId: string | number) => {
    return request
      .get<ResponseData<GradingReviewLatest | null>>(
        'exercises/grading-reviews/latest',
        { params: { exercise_id: exerciseId } }
      )
      .then((response) => response.data);
  },

  appealGradingReview: (exerciseId: string | number, reason: string) => {
    return request
      .post<ResponseData<GradingReviewSummary>>(
        'exercises/grading-reviews/appeal',
        { exercise_id: exerciseId, reason }
      )
      .then((response) => response.data);
  },

  explainChoice: (exerciseId: string | number, answer: string) => {
    return request.post<ChoiceExplanationResponse>('exercises/choice-explanation', {
      exercise_id: exerciseId,
      answer
    }).then(res => res.data);
  },

  navigate: (currentId: string, direction: 'prev' | 'next', lessonId?: string) => {
    return request.get<ExerciseDetailResponse>('exercises/navigate', {
      params: {
        currentId,
        direction,
        lessonId
      }
    }).then(res => res.data);
  },
};
