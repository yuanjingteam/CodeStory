export type AuthErrorCode =
  | 'REFRESH_TOKEN_MISSING'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_INVALID'
  | 'REFRESH_TOKEN_REUSED'
  | 'SESSION_REVOKED'
  | 'SESSION_ABSOLUTE_EXPIRED'
  | 'USER_UNAVAILABLE'
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

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly statusCode = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function normalizeAuthError(
  error: unknown,
  fallback: {
    statusCode: number;
    code: AuthErrorCode;
    message: string;
  }
) {
  if (error instanceof AuthError) return error;
  return new AuthError(fallback.code, fallback.message, fallback.statusCode);
}
