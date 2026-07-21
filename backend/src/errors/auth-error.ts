export type AuthErrorCode =
  | 'REFRESH_TOKEN_MISSING'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_INVALID'
  | 'REFRESH_TOKEN_REUSED'
  | 'SESSION_REVOKED'
  | 'SESSION_ABSOLUTE_EXPIRED'
  | 'USER_UNAVAILABLE';

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
