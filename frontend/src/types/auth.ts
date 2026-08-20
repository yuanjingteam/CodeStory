export interface ApiResponse<T> {
  code: number;
  errorCode?: AuthErrorCode;
  message: string;
  data: T;
}

export type AuthErrorCode =
  | 'AUTH_LOGIN_INCOMPLETE'
  | 'AUTH_REGISTER_INCOMPLETE'
  | 'AUTH_RESET_INCOMPLETE'
  | 'AUTH_INVALID_EMAIL'
  | 'AUTH_INVALID_PASSWORD'
  | 'AUTH_INVALID_NICKNAME'
  | 'AUTH_INVALID_IMAGE_CAPTCHA'
  | 'AUTH_IMAGE_CAPTCHA_EXPIRED'
  | 'AUTH_IMAGE_CAPTCHA_INCORRECT'
  | 'AUTH_INVALID_EMAIL_CODE'
  | 'AUTH_EMAIL_CODE_EXPIRED'
  | 'AUTH_EMAIL_CODE_INCORRECT'
  | 'AUTH_EMAIL_EXISTS'
  | 'AUTH_ACCOUNT_DELETED'
  | 'AUTH_CREDENTIALS_INVALID'
  | 'AUTH_EMAIL_RATE_LIMITED'
  | 'AUTH_EMAIL_SEND_FAILED'
  | 'AUTH_CAPTCHA_GENERATION_FAILED'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_REGISTER_FAILED'
  | 'AUTH_RESET_FAILED';

export type LoginRequest = {
  email: string;
  password: string;
  captchaCode: string;
  captchaId: string;
  rememberMe?: boolean;
};

export type LoginResponse = {
  accessToken: string;
  accessExpiresAt: string;
  // 迁移期兼容字段，后续统一使用 accessToken。
  token?: string;
  user: LoginUserInfo;
};

export type RefreshResponse = {
  accessToken: string;
  accessExpiresAt: string;
};

export type LoginUserInfo = {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  sex?: number;
  occupation?: string;
  role: number;
  level: number;
  score: number;
  created_at: string;
};
export type RegisterRequest = {
  nickname: string;
  email: string;
  password: string;
  emailCode: string;
};

export interface ImageCaptchaData {
  captchaId: string;
  image: string;
}

export interface SendEmailCodeRequest {
  email: string;
}

export interface ForgetPasswordRequest {
  email: string;
  emailCode: string;
  password: string;
}

export interface User {
  avatar?: string;
  created_at?: Date;
  email?: string;
  id?: string;
  id_delete: number;
  level?: number;
  nickname?: string;
  occupation?: string;
  password: string;
  role?: number;
  score?: number;
  sex?: number;
  update_at: Date;
}


