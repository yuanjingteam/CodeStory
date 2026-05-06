import request from '@/utils/request';
import type { CourseListRequest, CourseListResponse } from '@/types/course';

export const courseApi = {
  getList: (params: CourseListRequest) => {
    return request.get<CourseListResponse>('courses/list', { params });
  },
};
export default courseApi;