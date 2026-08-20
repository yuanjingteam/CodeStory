import axios from 'axios';
import request from '@/utils/request';
import type {
  LoginRequest,
  ApiResponse,
  LoginResponse,
  RegisterRequest,
  ImageCaptchaData,
  ForgetPasswordRequest,
  LoginUserInfo,
  AuthErrorCode,
} from '@/types/auth';

export interface AuthErrorDetails {
  errorCode?: AuthErrorCode;
  message: string;
  status?: number;
}

export function getAuthErrorDetails(
  error: unknown,
  fallbackMessage: string
): AuthErrorDetails {
  if (!axios.isAxiosError(error)) {
    return { message: fallbackMessage };
  }

  const data = error.response?.data as
    | { errorCode?: AuthErrorCode; message?: string }
    | undefined;
  return {
    errorCode: data?.errorCode,
    message: data?.message || fallbackMessage,
    status: error.response?.status,
  };
}
// 登录
export const login = async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  return request.post('/auth/login', data);
};

//登出
export const logout = async (): Promise<ApiResponse<void>> => {
  return request.post('/auth/logout');
};

export const getCurrentUser = async (): Promise<ApiResponse<LoginUserInfo>> => {
  return request.get('/auth/me');
};

// 注册
export const register = async (
  data: RegisterRequest
): Promise<ApiResponse<void>> => {
  return request.post('/auth/register', data);
};
// 获取图片验证码
export const getImageCaptcha = async (): Promise<ApiResponse<ImageCaptchaData>> => {
  return request.get('/auth/image-captcha');
};

//获取邮箱验证码
export const getEmailCaptcha = async (data: {
  email: string;
}): Promise<ApiResponse<{ captchaId: string }>> => {
  return request.post('/auth/email-captcha', data);
};

//忘记密码
export const forgetPassword = async (data: ForgetPasswordRequest): Promise<ApiResponse<void>> => {
  return request.post('/auth/forget-password', data);
};

