import { Request, Response } from 'express';
import { forgetPasswordService } from '@/services/auth/forgetpassword';
import type { ForgetPasswordRequest } from '@/types/auth';
import { normalizeAuthError } from '@/errors/auth-error';

class ForgetPasswordController {
  async forgetPassword(req: Request, res: Response) {
    try {
      const body = req.body as ForgetPasswordRequest;
      const { email, password, emailCode } = body;

      if (!email || !password || !emailCode) {
        return res.status(400).json({
          code: 400,
          errorCode: 'AUTH_RESET_INCOMPLETE',
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
      const authError = normalizeAuthError(error, {
        statusCode: 500,
        code: 'AUTH_RESET_FAILED',
        message: '密码重置失败，请稍后重试',
      });
      return res.status(authError.statusCode).json({
        code: authError.statusCode,
        errorCode: authError.code,
        message: authError.message,
      });
    }
  }
}

export const forgetPasswordController = new ForgetPasswordController();
