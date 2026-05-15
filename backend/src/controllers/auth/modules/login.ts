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

}
export const loginController = new LoginController();
