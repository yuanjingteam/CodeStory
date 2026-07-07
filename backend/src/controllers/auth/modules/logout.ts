import type { Request, Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  getBaseRefreshTokenCookieOptions,
} from '@/config/auth-cookie';
import { logoutService } from '@/services/auth/logout';
import { getCookieValue } from '@/utils/cookie';

class LogoutController {
  async logout(req: Request, res: Response) {
    const refreshToken = getCookieValue(
      req.headers.cookie,
      REFRESH_TOKEN_COOKIE_NAME
    );

    try {
      await logoutService.logout(refreshToken);
      res.clearCookie(
        REFRESH_TOKEN_COOKIE_NAME,
        getBaseRefreshTokenCookieOptions()
      );

      return res.status(200).json({
        code: 200,
        message: '退出登录成功',
        data: null,
      });
    } catch (error) {
      console.error('退出登录失败:', error);
      return res.status(500).json({
        code: 'AUTH_SERVICE_ERROR',
        message: '认证服务暂时不可用',
        data: null,
      });
    }
  }
}

export const logoutController = new LogoutController();
