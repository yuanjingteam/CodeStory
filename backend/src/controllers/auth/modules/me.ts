import type { Request, Response } from 'express';
import { AuthError } from '@/errors/auth-error';
import { meService } from '@/services/auth/me';

class MeController {
  async getCurrentUser(req: Request, res: Response) {
    try {
      const user = await meService.getCurrentUser(req.user!.id);
      return res.status(200).json({
        code: 200,
        message: '获取当前用户成功',
        data: user,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({
          code: error.code,
          message: error.message,
          data: null,
        });
      }

      console.error('获取当前用户失败:', error);
      return res.status(500).json({
        code: 'AUTH_SERVICE_ERROR',
        message: '认证服务暂时不可用',
        data: null,
      });
    }
  }
}

export const meController = new MeController();
