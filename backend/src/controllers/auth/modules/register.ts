import { Request, Response } from 'express';
import { registerService } from '@/services/auth/register';
import type { RegisterRequest } from '@/types/auth';

class RegisterController {
  async register(req: Request, res: Response) {
    try {
      const body = req.body as RegisterRequest;
      const { email, password, nickname, emailCode,   } = body;

      if (!email || !password || !nickname || !emailCode) {
        return res.status(400).json({
          code: 400,
          message: '注册信息不能为空',
        });
      }
      await registerService.register(body);
      return res.status(200).json({
        code: 200,
        message: '注册成功',
      });
    } catch (error) {
      return res.status(400).json({
        code: 400,
        message: error instanceof Error ? error.message : '注册失败',
      });
    }
  }
}

export const registerController = new RegisterController();
