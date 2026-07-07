export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

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
  // 迁移期兼容旧前端，完成刷新流程后删除。
  token: string;
  user: LoginUserInfo;
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


