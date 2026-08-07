import request from '@/utils/request';
import { toFormData } from '@/utils/formData';
import type { CreateCourseRequest, CreateCourseResponse, UpdateCourseRequest, DeleteCourseResponse } from '@/types/course-manage';
import type { CourseListResponse } from '@/types/course';

export const courseManageApi = {
  getList: (params?: {
    keyword?: string;
    level?: number;
    status?: 'active' | 'deleted';
    page?: number;
    size?: number;
  }) => {
    return request
      .get<{ data: CourseListResponse }>('admin/courses/list', {
        params,
      })
      .then(res => res.data);
  },

  create: (data: CreateCourseRequest) => {
    const { coverImage, ...rest } = data;
    const formData = toFormData(rest, coverImage ? [{ key: 'coverImage', value: coverImage }] : undefined);

    return request.post<CreateCourseResponse>('admin/courses', formData).then(res => res.data);
  },

  update: (id: string | number, data: Omit<UpdateCourseRequest, 'id'>) => {
    const { coverImage, ...rest } = data;
    const formData = toFormData(rest as Record<string, unknown>, coverImage ? [{ key: 'coverImage', value: coverImage }] : undefined);

    return request.put<CreateCourseResponse>(`admin/courses/${id}`, formData).then(res => res.data);
  },

  delete: (id: string | number) => {
    return request.delete<DeleteCourseResponse>(`admin/courses/${id}`).then(res => res.data);
  },

  restore: (id: string | number) => {
    return request
      .put<{
        data: { id: string; restoredLessons: number };
      }>(`admin/courses/${id}/restore`)
      .then(res => res.data);
  },
};

export default courseManageApi;
