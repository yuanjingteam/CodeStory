import request from '@/utils/request';
import type { LessonDetailResponse } from '@/types/lesson-detail';

export const lessonDetailApi = {
  getById: (lessonId: string | number) => {
    return request.get<LessonDetailResponse>(`chapter/lesson/${lessonId}`).then(res => res.data);
  },
};