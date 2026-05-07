export type LoginRequest = {
  email: string;
  password: string;
  captchaCode: string;
  captchaId: string;
};

export type RegisterRequest = {
  nickname: string;
  email: string;
  password: string;
  emailCode: string;
};

export interface CaptchaResponse {
  success: boolean;
  captchaId: string;
  imageBase64: string;
  message?: string;
}

export interface SendEmailCodeRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  emailCode: string;
  password: string;
}
