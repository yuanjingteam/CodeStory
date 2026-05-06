import request from '@/utils/request';
import type { LessonDetailResponse, LessonDetailData } from '@/types/lesson';

export const lessonApi = {
  // GET /courses/{courseId}/chapters/{chapterId}/lessons/{lessonId}
  getById: (courseId: string | number, chapterId: string | number, lessonId: string | number) => {
    return request.get<LessonDetailData>(
      `courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}`
    );
  },
};
