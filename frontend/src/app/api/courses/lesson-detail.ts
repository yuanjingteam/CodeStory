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
};
