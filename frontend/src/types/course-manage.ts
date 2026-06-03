export interface CourseFormData {
  title: string;
  description: string;
  level: number;
  coverImage?: File | string;
}

export type CreateCourseRequest = CourseFormData;

export interface CreateCourseResponse {
  code: number;
  message: string;
  data: {
    id: string;
    title: string;
    description: string;
    level: number;
    status: number;
    cover_url?: string;
  };
}

export interface UpdateCourseRequest extends Partial<CourseFormData> {
  id: string;
}

export interface DeleteCourseResponse {
  code: number;
  message: string;
  data: null;
}
