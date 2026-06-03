import request from '@/utils/request';
import type { CourseDetailResponse } from '@/types/course-detail';

export const courseDetailApi = {
  getById: (courseId: string | number) => {
    return request.get<CourseDetailResponse>(`courses/${courseId}`).then(res => res.data);
  },
};
