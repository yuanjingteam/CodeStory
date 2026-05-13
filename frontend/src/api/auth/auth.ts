import request from '@/utils/request';
import type { AxiosResponse } from 'axios';
import type {
  LoginRequest,
  ApiResponse,
  LoginResponse,
  RegisterRequest,
  ImageCaptchaData,
  ForgetPasswordRequest,
} from 'shared/types/auth';
// 登录
export const login = async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  return request.post('/auth/login', data);
};

//登出
export const logout = async (): Promise<ApiResponse<void>> => {
  return request.post('/auth/logout');
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
