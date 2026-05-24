import request from '@/utils/request';
import type { ExerciseDetailResponse, ExerciseSubmitResponse } from '@/types/exercise';

export const exerciseApi = {
  getDetail: (exerciseId: string | number) => {
    return request.get<ExerciseDetailResponse>(`exercises/detail`, {
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
