import request from '@/utils/request';
import type {
  AdminGradingReviewDetail,
  AdminGradingReviewItem,
  GradingReviewPagination,
  GradingReviewResult,
  GradingReviewStatus,
  ResponseData,
} from '@/types/grading-review';

interface GradingReviewListData {
  items: AdminGradingReviewItem[];
  pagination: GradingReviewPagination;
}

interface GradingReviewListParams {
  status?: GradingReviewStatus | '';
  page: number;
  size: number;
}

export const gradingReviewManageApi = {
  list: (params: GradingReviewListParams) =>
    request
      .get<ResponseData<GradingReviewListData>>('admin/grading-reviews', {
        params: { ...params, status: params.status || undefined },
      })
      .then((response) => response.data),

  detail: (id: string) =>
    request
      .get<ResponseData<AdminGradingReviewDetail>>(
        `admin/grading-reviews/${id}`
      )
      .then((response) => response.data),

  review: (
    id: string,
    data: { result: GradingReviewResult; note?: string }
  ) =>
    request
      .post<ResponseData<AdminGradingReviewDetail>>(
        `admin/grading-reviews/${id}/review`,
        data
      )
      .then((response) => response.data),
};
