import { randomUUID } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import prisma from '@/config/prisma';
import { calculateNextRefreshExpiresAt } from '@/config/auth-session';
import { AuthError } from '@/errors/auth-error';
import {
  deleteAuthSession,
  getAuthSession,
  rotateAuthSession,
} from '@/services/auth/session';
import {
  hashRefreshToken,
  issueAccessToken,
  issueRefreshToken,
  matchesRefreshTokenHash,
  verifyRefreshToken,
} from '@/utils/auth-token';
import type { AuthSession } from '@/types/auth-session';

function getRemainingSeconds(expiresAt: string, now: Date): number {
  return Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1_000);
}

class RefreshService {
  async refresh(refreshToken: string) {
    let payload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('REFRESH_TOKEN_EXPIRED', '登录续期凭证已过期');
      }
      throw new AuthError('REFRESH_TOKEN_INVALID', '登录续期凭证无效');
    }

    const session = await getAuthSession(payload.sessionId);
    if (!session || session.revokedAt) {
      throw new AuthError('SESSION_REVOKED', '登录会话已失效');
    }

    if (session.userId !== payload.sub) {
      await deleteAuthSession(session.sessionId);
      throw new AuthError('REFRESH_TOKEN_INVALID', '登录续期凭证与会话不匹配');
    }

    const now = new Date();
    if (getRemainingSeconds(session.sessionExpiresAt, now) <= 0) {
      await deleteAuthSession(session.sessionId);
      throw new AuthError(
        'SESSION_ABSOLUTE_EXPIRED',
        '登录已达到最长有效时间，请重新登录'
      );
    }

    if (getRemainingSeconds(session.refreshExpiresAt, now) <= 0) {
      await deleteAuthSession(session.sessionId);
      throw new AuthError('REFRESH_TOKEN_EXPIRED', '登录续期凭证已过期');
    }

    const tokenMatchesSession =
      session.currentTokenId === payload.tokenId &&
      matchesRefreshTokenHash(refreshToken, session.refreshTokenHash);

    if (!tokenMatchesSession) {
      await deleteAuthSession(session.sessionId);
      throw new AuthError(
        'REFRESH_TOKEN_REUSED',
        '检测到旧续期凭证被重复使用，请重新登录'
      );
    }

    const user = await prisma.users.findFirst({
      where: { id: session.userId, is_delete: 0 },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      await deleteAuthSession(session.sessionId);
      throw new AuthError('USER_UNAVAILABLE', '用户不存在或已被停用');
    }

    const nextRefreshExpiresAt = calculateNextRefreshExpiresAt(
      session.sessionExpiresAt,
      now
    );
    const refreshTtlSeconds = getRemainingSeconds(nextRefreshExpiresAt, now);
    if (refreshTtlSeconds <= 0) {
      await deleteAuthSession(session.sessionId);
      throw new AuthError(
        'SESSION_ABSOLUTE_EXPIRED',
        '登录已达到最长有效时间，请重新登录'
      );
    }

    const nextTokenId = randomUUID();
    const nextAccessToken = issueAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.sessionId,
    });
    const nextRefreshToken = issueRefreshToken(
      {
        userId: user.id,
        sessionId: session.sessionId,
        tokenId: nextTokenId,
      },
      refreshTtlSeconds
    );
    const nextSession: AuthSession = {
      ...session,
      currentTokenId: nextTokenId,
      refreshTokenHash: hashRefreshToken(nextRefreshToken.token),
      lastRefreshedAt: now.toISOString(),
      refreshExpiresAt: nextRefreshExpiresAt,
    };

    const rotateResult = await rotateAuthSession(session, nextSession);
    if (rotateResult === 'missing') {
      throw new AuthError('SESSION_REVOKED', '登录会话已失效');
    }
    if (rotateResult === 'mismatch') {
      await deleteAuthSession(session.sessionId);
      throw new AuthError(
        'REFRESH_TOKEN_REUSED',
        '检测到并发或重复刷新，请重新登录'
      );
    }

    return {
      accessToken: nextAccessToken.token,
      accessExpiresAt: nextAccessToken.expiresAt,
      refreshToken: nextRefreshToken.token,
      refreshExpiresAt: nextRefreshExpiresAt,
      rememberMe: session.rememberMe,
    };
  }
}

export const refreshService = new RefreshService();
