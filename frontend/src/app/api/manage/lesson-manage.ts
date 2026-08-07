import request from '@/utils/request';
import type {
  LessonListResponse,
  CreateLessonRequest,
  CreateLessonResponse,
  UpdateLessonRequest,
  UpdateLessonResponse,
  DeleteLessonResponse,
  ReindexLessonResponse,
  ReindexLessonsBatchRequest,
  ReindexLessonsBatchResponse,
} from '@/types/lesson-manage';

export const lessonManageApi = {
  getList: (params?: { chapterId?: string; courseId?: string; keyword?: string; difficulty?: number; status?: 'active' | 'deleted'; page?: number; size?: number }) => {
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

  restore: (id: string | number) => {
    return request
      .put<{
        data: {
          lessonId: string;
          indexSummary: ReindexLessonResponse['data']['indexSummary'];
        };
      }>(`admin/lessons/${id}/restore`)
      .then(res => res.data);
  },

  restoreExercise: (
    lessonId: string | number,
    exerciseId: string
  ) => {
    return request
      .put<{
        data: {
          exerciseId: string;
          indexSummary: ReindexLessonResponse['data']['indexSummary'];
        };
      }>(
        `admin/lessons/${lessonId}/exercises/${exerciseId}/restore`
      )
      .then(res => res.data);
  },

  reindex: (id: string | number) => {
    return request
      .post<ReindexLessonResponse>(`admin/lessons/${id}/reindex`)
      .then(res => res.data);
  },

  reindexBatch: (data: ReindexLessonsBatchRequest) => {
    return request
      .post<ReindexLessonsBatchResponse>(
        'admin/lessons/reindex-batch',
        data
      )
      .then(res => res.data);
  },
};

export default lessonManageApi;
