import request from '@/utils/request';
import type { CourseListRequest, CourseListApiResponse } from '@/types/course';

export const courseApi = {
  getList: (params: CourseListRequest) => {
    return request.get<CourseListApiResponse>('courses/list', { params }).then(res => res.data);
  },
};
export default courseApi;