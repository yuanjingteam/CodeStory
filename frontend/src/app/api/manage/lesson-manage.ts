import request from '@/utils/request';
import type {
  LessonListResponse,
  CreateLessonRequest,
  CreateLessonResponse,
  UpdateLessonRequest,
  UpdateLessonResponse,
  DeleteLessonResponse,
} from '@/types/lesson-manage';

export const lessonManageApi = {
  getList: (params?: { chapterId?: string; courseId?: string; keyword?: string; difficulty?: number; page?: number; size?: number }) => {
    return request.get<LessonListResponse>('admin/lessons/list', { params }).then(res => res.data);
  },

  create: (data: CreateLessonRequest) => {
    return request.post<CreateLessonResponse>('admin/lessons', data).then(res => res.data);
  },

  update: (id: string | number, data: UpdateLessonRequest) => {
    return request.put<UpdateLessonResponse>(`admin/lessons/${id}`, data).then(res => res.data);
  },

  delete: (id: string | number) => {
    return request.delete<DeleteLessonResponse>(`admin/lessons/${id}`).then(res => res.data);
  },
};

export default lessonManageApi;
