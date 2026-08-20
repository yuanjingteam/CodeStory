import { Request, Response } from 'express';
import { registerService } from '@/services/auth/register';
import type { RegisterRequest } from '@/types/auth';
import { normalizeAuthError } from '@/errors/auth-error';

class RegisterController {
  async register(req: Request, res: Response) {
    try {
      const body = req.body as RegisterRequest;
      const { email, password, nickname, emailCode,   } = body;

      if (!email || !password || !nickname || !emailCode) {
        return res.status(400).json({
          code: 400,
          errorCode: 'AUTH_REGISTER_INCOMPLETE',
          message: '注册信息不能为空',
        });
      }
      await registerService.register(body);
      return res.status(200).json({
        code: 200,
        message: '注册成功',
      });
    } catch (error) {
      const authError = normalizeAuthError(error, {
        statusCode: 500,
        code: 'AUTH_REGISTER_FAILED',
        message: '注册失败，请稍后重试',
      });
      return res.status(authError.statusCode).json({
        code: authError.statusCode,
        errorCode: authError.code,
        message: authError.message,
      });
    }
  }
}

export const registerController = new RegisterController();
