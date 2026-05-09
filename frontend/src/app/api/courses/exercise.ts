import request from '@/utils/request';
import type { ExerciseDetailResponse } from '@/types/exercise';

export const exerciseApi = {
  getDetail: (exerciseId: string | number) => {
    return request.get<ExerciseDetailResponse>(`exercises/detail`, {
      params: { exercise_id: exerciseId }
    }).then(res => res.data);
  },
};
