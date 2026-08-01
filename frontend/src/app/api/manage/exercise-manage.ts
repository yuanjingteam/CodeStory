import request from '@/utils/request';
import type {
  ExerciseGenerationInput,
  ExerciseGenerationResult,
  ExerciseManageListQuery,
  ExerciseManageWriteInput,
  ManagedExercise,
} from '@/types/exercise-manage';

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

const exerciseManageApi = {
  getList: (params: ExerciseManageListQuery) =>
    request
      .get<
        ApiEnvelope<{
          total: number;
          data: ManagedExercise[];
          pendingCount: number;
          oldestPendingCreatedAt: string | null;
        }>
      >('admin/exercises/list', { params })
      .then((response) => response.data),

  getDetail: (id: string) =>
    request
      .get<ApiEnvelope<ManagedExercise>>(`admin/exercises/${id}`)
      .then((response) => response.data),

  create: (data: ExerciseManageWriteInput) =>
    request
      .post<
        ApiEnvelope<{
          exercise: ManagedExercise;
          indexStatus: string;
        }>
      >('admin/exercises', data)
      .then((response) => response.data),

  update: (id: string, data: ExerciseManageWriteInput) =>
    request
      .put<
        ApiEnvelope<{
          exercise: ManagedExercise;
          indexStatus: string;
        }>
      >(`admin/exercises/${id}`, data)
      .then((response) => response.data),

  review: (
    id: string,
    action: 'approve' | 'reject',
    exercise?: ExerciseManageWriteInput
  ) =>
    request
      .put<
        ApiEnvelope<{
          exercise: ManagedExercise;
          indexStatus: string;
        }>
      >(`admin/exercises/${id}/review`, { action, exercise })
      .then((response) => response.data),

  delete: (id: string) =>
    request
      .delete<ApiEnvelope<null>>(`admin/exercises/${id}`)
      .then((response) => response.data),

  generate: (data: ExerciseGenerationInput) =>
    request
      .post<ApiEnvelope<ExerciseGenerationResult>>(
        'admin/exercises/generate',
        data,
        { timeout: 45_000 }
      )
      .then((response) => response.data),
};

export default exerciseManageApi;
