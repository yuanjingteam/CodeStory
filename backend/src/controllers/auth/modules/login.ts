import { Request, Response } from 'express';
import { loginService } from '@/services/auth/login';
class LoginController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      // 基础验证
      if (!email || !password) {
        return res.status(400).json({
          code: 400,
          message: '邮箱和密码为必填项',
        });
      }

      const result = await loginService.login(email, password);
      return res.status(200).json({
        code: 200,
        message: '登录成功',
        data: result,
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
