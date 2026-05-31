import request from '@/utils/request';
import { ApiResponse } from 'shared/types/auth';
import {
  GetUserListRequest,
  UserListResponse,
  UpdateUserDetailRequest,
} from 'shared/types/user-manage';

// 获取用户列表
export const getUserList = async (
  data: GetUserListRequest
): Promise<ApiResponse<UserListResponse>> => {
  return request.post('/admin/user-manage/list', data);
};

export const getUserDetailById = async (
  userId: string
): Promise<ApiResponse<UpdateUserDetailRequest>> => {
  return request.get(`/admin/user-manage/detail/${userId}`);
};


// 编辑用户信息
export const updateUserDetail = async (
  userId: string,
  data: Partial<UpdateUserDetailRequest>
): Promise<ApiResponse<void>> => {
  return request.put(`/admin/user-manage/update-detail/${userId}`, data);
};

// 删除用户
export const deleteUser = async (
  userId: string
): Promise<ApiResponse<void>> => {
  return request.delete(`/admin/user-manage/${userId}`);
};

// 恢复用户
export const restoreUser = async (
  userId: string
): Promise<ApiResponse<void>> => {
  return request.put(`/admin/user-manage/restore/${userId}`);
};
