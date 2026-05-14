import { Request, Response } from 'express';
import { forgetPasswordService } from '@/services/auth/forgetpassword';
import { ForgetPasswordRequest } from 'shared/types/auth';

class ForgetPasswordController {
  async forgetPassword(req: Request, res: Response) {
    try {
      const body = req.body as ForgetPasswordRequest;
      const { email, password, emailCode } = body;

      if (!email || !password || !emailCode) {
        return res.status(400).json({
          code: 400,
          message: '邮箱、密码和验证码不能为空',
        });
      }

      const result = await forgetPasswordService.forgetPassword(body);

      return res.status(200).json({
        code: 200,
        message: result.message,
        data: {
          email: body.email,
        },
      });
    } catch (error) {
      console.error('Forget password error:', error);
      return res.status(400).json({
        code: 400,
        message: error instanceof Error ? error.message : '重置密码失败',
      });
    }
  }
}

export const forgetPasswordController = new ForgetPasswordController();
