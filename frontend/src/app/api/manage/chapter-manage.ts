import request from '@/utils/request';
import type {
  ChapterListResponse,
  CreateChapterRequest,
  CreateChapterResponse,
  UpdateChapterRequest,
  UpdateChapterResponse,
  DeleteChapterResponse,
} from '@/types/chapter-manage';

export const chapterManageApi = {
  getList: (params?: { courseId?: string; keyword?: string; page?: number; size?: number }) => {
    return request.get<ChapterListResponse>('admin/chapter/list', { params }).then(res => res.data);
  },

  create: (data: CreateChapterRequest) => {
    return request.post<CreateChapterResponse>('admin/chapter', data).then(res => res.data);
  },

  update: (id: string | number, data: UpdateChapterRequest) => {
    return request.put<UpdateChapterResponse>(`admin/chapter/${id}`, data).then(res => res.data);
  },

  delete: (id: string | number) => {
    return request.delete<DeleteChapterResponse>(`admin/chapter/${id}`).then(res => res.data);
  },
};

export default chapterManageApi;
