import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      message: '未登录，请先登录',
    });
  }

  const token = authHeader.split(' ')[1]; 
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        message: 'JWT_SECRET 未配置',
      });
    }
    
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      message: 'token无效或已过期',
    });
  }
};
