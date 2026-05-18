import type { ApiResponse,  } from 'shared/types/auth';
import request from '@/utils/request';
import type { UserProfileInfo, UserCourse, UpdateUserInfopRequest } from 'shared/types/profile';

export async function getProfile(): Promise<ApiResponse<UserProfileInfo>> {
  return request.get('/profile/user-info');
}

export async function getUserCourses(): Promise<ApiResponse<UserCourse[]>> {
  return request.get('/profile/user-courses');
}

export async function updateUserProfile(data: UpdateUserInfopRequest): Promise<ApiResponse<UserProfileInfo>> {
  return request.put('/profile/update-profile', data);
}

export async function uploadAvatar(file: File): Promise<ApiResponse<UserProfileInfo>> {
  return request.post('/profile/upload-avatar', file);
}
