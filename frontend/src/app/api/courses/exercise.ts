import request from '@/utils/request';
import type { ExerciseDetailResponse, ExerciseSubmitResponse } from '@/types/exercise';

export const exerciseApi = {
  getDetail: (exerciseId: string | number) => {
    return request.get<ExerciseDetailResponse>(`exercises/detail`, {
      params: { exercise_id: exerciseId }
    }).then(res => res.data);
  },

  submit: (exerciseId: string | number, answer: string) => {
    return request.post<ExerciseSubmitResponse>('exercises/submit', {
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
