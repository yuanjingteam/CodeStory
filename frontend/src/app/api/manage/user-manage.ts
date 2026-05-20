import request from '@/utils/request';
import { ApiResponse } from 'shared/types/auth';
import {
  GetUserListRequest,
  UserListResponse,
  UserDetailRequest,
} from 'shared/types/user-manage';

// 获取用户列表
export const getUserList = async (
  data: GetUserListRequest
): Promise<ApiResponse<UserListResponse>> => {
  return request.post('/user-manage/list', data);
};

export const getUserDetailById = async (
  userId: string
): Promise<ApiResponse<UserDetailRequest>> => {
  return request.get(`/user-manage/detail/${userId}`);
};

// 新增用户
export const addUser = async (
  data: UserDetailRequest
): Promise<ApiResponse<void>> => {
  return request.post('/user-manage/adduser', data);
};

// 编辑用户信息
export const updateUserDetail = async (
  userId: string,
  data: Partial<UserDetailRequest>
): Promise<ApiResponse<void>> => {
  return request.put(`/user-manage/update-detail/${userId}`, data);
};

// 删除用户
export const deleteUser = async (
  userId: string
): Promise<ApiResponse<void>> => {
  return request.delete(`/user-manage/${userId}`);
};

// 恢复用户
export const restoreUser = async (
  userId: string
): Promise<ApiResponse<void>> => {
  return request.put(`/user-manage/restore/${userId}`);
};
