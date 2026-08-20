import request from '@/utils/request';
import type { CourseDetailResponse } from '@/types/course-detail';

export const courseDetailApi = {
  getById: (courseId: string | number, signal?: AbortSignal) => {
    return request
      .get<CourseDetailResponse>(`courses/${courseId}`, { signal })
      .then(res => res.data);
  },
};
