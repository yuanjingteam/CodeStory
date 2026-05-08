import { Request, Response } from 'express';
import { loginService } from '@/services/auth/login';

// 登录控制器
export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // 基础验证
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码为必填项',
      });
    }

    const result = await loginService();
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : '登录失败',
    });
  }
};
