import request from '@/utils/request';
import type { ApiResponse } from '@/types/auth';
import type { HomeCourse, HomeData } from '@/types/home';

export const getHomeCourses = async (): Promise<ApiResponse<HomeCourse[]>> => {
  return request.get('/home/home-courses');
};

export const getStartLearningCourse = async (): Promise<
  ApiResponse<{ path: string }>
> => {
  return request.get(`/home/start-learning`);
};

export const getHomeStats = async (): Promise<
  ApiResponse<HomeData>
> => {
  return request.get('/home/home-stats');
};
