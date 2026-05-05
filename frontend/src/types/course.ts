export interface CourseListRequest {
  keyword?: string;
  /**
   * 0-简单 1-中等 2-困难
   */
  level?: number;
  page?: number;
  size?: number;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  coverUrl?: string;
  level: string | number;
  icon?: string;
  rating?: number; 
  learners?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseListResponse {
  records?: Course[];
  total: number;
  page?: number;
  size?: number;
}
