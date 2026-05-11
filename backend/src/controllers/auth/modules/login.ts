import { Request, Response } from 'express';
import { loginService } from '@/services/auth/login';
import type { LoginRequest } from 'shared/types/auth';
class LoginController {
  async login(req: Request, res: Response) {
    try {
      const body = req.body as LoginRequest;
      const { email, password, captchaId, captchaCode } = req.body;
      if (!email || !password || !captchaId || !captchaCode) {
        return res.status(400).json({
          code: 400,
          message: '登录信息不完整',
        });
      }
      const { token, user } = await loginService.login(body);
      return res.status(200).json({
        code: 200,
        message: '登录成功',
        data: { token, user },
      });
    } catch (error) {
      return res.status(401).json({
        code: 401,
        message: error instanceof Error ? error.message : '登录失败',
      });
    }
  }
  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({
          code: 400,
          message: '缺少 token',
        });
      }

      const token = authHeader.split(' ')[1];
      const result = await loginService.logout(token);

      if (result.success) {
        return res.status(200).json({
          code: 200,
          message: '登出成功',
        });
      } else {
        return res.status(500).json({
          code: 500,
          message: result.message,
        });
      }
    } catch (error) {
      return res.status(500).json({
        code: 500,
        message: error instanceof Error ? error.message : '登出失败',
      });
    }
  }
}
export const loginController = new LoginController();
