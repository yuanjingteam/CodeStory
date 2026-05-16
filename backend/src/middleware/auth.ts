import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '@/utils/jwt';
interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: '未登录',
      });
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      return res.status(400).json({ message: 'Token 格式错误' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET 未配置' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token 已过期' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ message: 'Token 格式错误' });
    }
    return res.status(500).json({ message: '认证服务异常' });
  }
};
