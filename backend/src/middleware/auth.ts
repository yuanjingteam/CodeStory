import * as jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt';
import { loginService } from '../services/auth/login';

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
        code: 'UNAUTHORIZED',
      });
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer') {
      return res.status(400).json({
        message: 'Token 格式错误：缺少 Bearer 前缀',
        code: 'INVALID_TOKEN_FORMAT',
      });
    }

    if (!token) {
      return res.status(400).json({
        message: 'Token 格式错误：token 为空',
        code: 'EMPTY_TOKEN',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT_SECRET 未配置',
        code: 'INTERNAL_ERROR',
      });
    }

    if (loginService.isTokenBlacklisted(token)) {
      return res.status(401).json({
        message: 'Token 已失效，请重新登录',
        code: 'TOKEN_BLACKLISTED',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

    if (!decoded.id || !decoded.email || decoded.role === undefined) {
      return res.status(400).json({
        message: 'Token 内容不完整',
        code: 'INCOMPLETE_TOKEN_PAYLOAD',
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: 'Token 已过期',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({
        message: 'Token 格式错误：无效的 token',
        code: 'INVALID_TOKEN',
      });
    }
    return res.status(500).json({
      message: '认证服务异常',
      code: 'AUTH_SERVICE_ERROR',
    });
  }
};

export const optionalAuthMiddleware = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) return next();

    if (!process.env.JWT_SECRET) return next();
    if (loginService.isTokenBlacklisted(token)) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    if (decoded.id && decoded.email && decoded.role !== undefined) {
      req.user = decoded;
    }
  } catch (error) {
    // token 无效或过期，放行当作未登录
    console.warn('optionalAuth: token 解析失败', error instanceof Error ? error.message : error);
  }
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }

  if (user.role !== 1) {
    return res.status(403).json({ code: 403, message: '无权限访问' });
  }

  next();
};

