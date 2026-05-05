import request from '@/utils/request';
import type { LoginRequest, RegisterRequest } from 'shared/types/auth';
export const login = async (data: LoginRequest) => {
  return request.post('/auth/login', data);
};
export const register = async (data: RegisterRequest) => {
  return request.post('/auth/register', data);
};