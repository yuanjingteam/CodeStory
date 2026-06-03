import request from '@/utils/request';
import type { ExerciseDetailResponse, ExerciseSubmitResponse } from '@/types/exercise';

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

  submit: (exerciseId: string | number, answer: string, hintLevelUsed: number = 0) => {
    return request.post<ExerciseSubmitResponse>('exercises/submit', {
      exercise_id: exerciseId,
      answer,
      hint_level_used: hintLevelUsed
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
