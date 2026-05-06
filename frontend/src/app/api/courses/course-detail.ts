import request from '@/utils/request';
import type { CourseDetailData } from '@/types/course-detail';

export const courseDetailApi = {
  getById: (courseId: string | number) => {
    return request.get<CourseDetailData>(`courses/${courseId}`);
  },
};
