import type { CookieOptions } from 'express';

export const REFRESH_TOKEN_COOKIE_NAME = 'codestory_refresh_token';

export function getBaseRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  };
}

export function getRefreshTokenCookieOptions(
  rememberMe: boolean,
  refreshExpiresAt: string
): CookieOptions {
  const options = getBaseRefreshTokenCookieOptions();

  if (rememberMe) {
    const maxAge = new Date(refreshExpiresAt).getTime() - Date.now();
    if (maxAge > 0) {
      options.maxAge = maxAge;
    }
  }

  return options;
}
