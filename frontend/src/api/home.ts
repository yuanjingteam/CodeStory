import request from '@/utils/request';
import type { ApiResponse } from 'shared/types/auth';
import type { Course } from 'shared/types/home-courses';

// 获取热门课程
export const getHomeCourses = async (): Promise<ApiResponse<Course[]>> => {
  return request.get('/home/home-courses');
};

export const getStartLearningCourse = async (
  userId: string
): Promise<ApiResponse<{ path: string }>> => {
  return request.get(`/home/start-learning/${userId}`);
};
