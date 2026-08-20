import request from '@/utils/request';
import type { LessonDetailResponse } from '@/types/lesson-detail';

export const lessonDetailApi = {
  getById: (
    lessonId: string | number,
    params?: { courseId?: string; chapterId?: string }
  ) => {
    return request
      .get<LessonDetailResponse>(`chapter/lesson/${lessonId}`, { params })
      .then(res => res.data);
  },
  startById: (
    lessonId: string | number,
    params?: { courseId?: string; chapterId?: string },
    signal?: AbortSignal
  ) => {
    return request
      .post<LessonDetailResponse>(`chapter/lesson/${lessonId}/start`, null, {
        params,
        signal,
      })
      .then(res => res.data);
  },
};
