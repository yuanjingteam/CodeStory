import request from '@/utils/request';
import type {
  LoginRequest,
  RegisterRequest,
  ImageCaptchaResponse,
  ResetPasswordRequest,
} from 'shared/types/auth';
export const login = async (data: LoginRequest) => {
  return request.post('/auth/login', data);
};
export const register = async (data: RegisterRequest) => {
  return request.post('/auth/register', data);
};
// 获取图片验证码
export const getImageCaptcha = async (): Promise<ImageCaptchaResponse> => {
  return request.get('/auth/image-captcha');
};

//获取邮箱验证码
export const getEmailCaptcha = async (data: { email: string }) => {
  return request.post('/auth/email-captcha', data);
};

//重置密码
export const resetPassword = async (data: ResetPasswordRequest) => {
  return request.post('/auth/reset-password', data);
};