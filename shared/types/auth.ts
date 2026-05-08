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

export interface ImageCaptchaData {
  captchaId: string;
  image: string;
}
export interface ImageCaptchaResponse {
  code: number;
  message: string;
  data?: ImageCaptchaData;
}

export interface SendEmailCodeRequest {
  email: string;
}

export interface ResetPasswordRequest {
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

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
  };
}
