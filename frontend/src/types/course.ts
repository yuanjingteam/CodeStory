export interface CourseListRequest {
  keyword?: string;
  /**
   * 0-简单 1-中等 2-困难
   */
  level?: number;
  learnStatus?: number;
  minStudentCount?: number;
  maxStudentCount?: number;
  page?: number;
  size?: number;
}

export interface Course {
  id: string | number;
  uuid?: string;
  title: string;
  description: string;
  cover_url?: string;
  level: string | number;  // 0-初级 1-中级 2-高级
  studentCount?: number;  // 学习人数
  progress?: number;       // 进度百分比
  progressText?: string;   // 进度文本
  learnStatus?: number;    // 0-未开始 1-进行中 2-已完成
  icon?: string;
  rating?: number;
  learners?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  purgeAt?: string | null;
}

export interface CourseListResponse {
  records?: Course[];
  total: number;
  page?: number;
  size?: number;
}

export interface CourseListApiResponse {
  code: number;
  message: string;
  data: CourseListResponse;
}
