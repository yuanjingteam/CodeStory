import type { Request, Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  getBaseRefreshTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from '@/config/auth-cookie';
import { AuthError } from '@/errors/auth-error';
import { refreshService } from '@/services/auth/refresh';
import { getCookieValue } from '@/utils/cookie';

class RefreshController {
  async refresh(req: Request, res: Response) {
    const refreshToken = getCookieValue(
      req.headers.cookie,
      REFRESH_TOKEN_COOKIE_NAME
    );

    if (!refreshToken) {
      return res.status(401).json({
        code: 'REFRESH_TOKEN_MISSING',
        message: '未找到登录续期凭证',
        data: null,
      });
    }

    try {
      const result = await refreshService.refresh(refreshToken);

      res.cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        result.refreshToken,
        getRefreshTokenCookieOptions(
          result.rememberMe,
          result.refreshExpiresAt
        )
      );

      return res.status(200).json({
        code: 200,
        message: 'Token 刷新成功',
        data: {
          accessToken: result.accessToken,
          accessExpiresAt: result.accessExpiresAt,
        },
      });
    } catch (error) {
      res.clearCookie(
        REFRESH_TOKEN_COOKIE_NAME,
        getBaseRefreshTokenCookieOptions()
      );

      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({
          code: error.code,
          message: error.message,
          data: null,
        });
      }

      console.error('刷新 Token 失败:', error);
      return res.status(500).json({
        code: 'AUTH_SERVICE_ERROR',
        message: '认证服务暂时不可用',
        data: null,
      });
    }
  }
}

export const refreshController = new RefreshController();
