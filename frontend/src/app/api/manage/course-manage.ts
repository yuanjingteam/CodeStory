import request from '@/utils/request';
import { toFormData } from '@/utils/formData';
import type { CreateCourseRequest, CreateCourseResponse, UpdateCourseRequest } from '@/types/course-manage';

export const courseManageApi = {
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
};

export default courseManageApi;
