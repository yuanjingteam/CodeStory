import { Request, Response } from 'express';
import { loginService } from '@/services/auth/login';
import type { LoginRequest } from '@/types/auth';
import {
  REFRESH_TOKEN_COOKIE_NAME,
  getRefreshTokenCookieOptions,
} from '@/config/auth-cookie';
import { normalizeAuthError } from '@/errors/auth-error';
class LoginController {
  async login(req: Request, res: Response) {
    try {
      const body = req.body as LoginRequest;
      const { email, password, captchaId, captchaCode } = req.body;
      if (!email || !password || !captchaId || !captchaCode) {
        return res.status(400).json({
          code: 400,
          errorCode: 'AUTH_LOGIN_INCOMPLETE',
          message: '登录信息不完整',
        });
      }
      const {
        accessToken,
        accessExpiresAt,
        token,
        refreshToken,
        refreshExpiresAt,
        rememberMe,
        user,
      } = await loginService.login(body);

      res.cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        refreshToken,
        getRefreshTokenCookieOptions(rememberMe, refreshExpiresAt)
      );

      return res.status(200).json({
        code: 200,
        message: '登录成功',
        data: {
          accessToken,
          accessExpiresAt,
          token,
          user,
        },
      });
    } catch (error) {
      const authError = normalizeAuthError(error, {
        statusCode: 500,
        code: 'AUTH_LOGIN_FAILED',
        message: '登录失败，请稍后重试',
      });
      return res.status(authError.statusCode).json({
        code: authError.statusCode,
        errorCode: authError.code,
        message: authError.message,
      });
    }
  }

}
export const loginController = new LoginController();
