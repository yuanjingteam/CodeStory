import * as jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/utils/auth-token';
import { verifyToken, type TokenPayload } from '@/utils/jwt';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: number;
  sessionId?: string;
}

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

function verifyBearerAccessToken(token: string): AuthenticatedUser {
  try {
    const payload = verifyAccessToken(token);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw error;
    }

    // 兜底分支，处理旧版 Token 格式
    const legacyPayload: TokenPayload = verifyToken(token);
    if (
      !legacyPayload.id ||
      !legacyPayload.email ||
      legacyPayload.role === undefined
    ) {
      throw new jwt.JsonWebTokenError('Access Token 内容不完整');
    }

    return {
      id: legacyPayload.id,
      email: legacyPayload.email,
      role: legacyPayload.role,
    };
  }
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
        code: 'ACCESS_TOKEN_MISSING',
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

    req.user = verifyBearerAccessToken(token);

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: 'Access Token 已过期',
        code: 'ACCESS_TOKEN_EXPIRED',
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: 'Access Token 无效',
        code: 'ACCESS_TOKEN_INVALID',
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

    req.user = verifyBearerAccessToken(token);
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

