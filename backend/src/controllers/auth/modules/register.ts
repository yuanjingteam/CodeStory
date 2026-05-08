
import { Request, Response } from 'express';
import { registerService } from '@/services/auth/register';

export const registerController = async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body;

    // 基础验证
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '邮箱和密码为必填项',
      });
    }

    const result = await registerService();

    res.status(200).json({
      success: true,
      message: '注册成功',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : '注册失败',
    });
  }
};
