import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import redisClient from '@/config/redis';
import { createAuthSessionTimes } from '@/config/auth-session';
import { logoutService } from '@/services/auth/logout';
import {
  createAuthSession,
  deleteAuthSession,
  getAuthSession,
} from '@/services/auth/session';
import { hashRefreshToken, issueRefreshToken } from '@/utils/auth-token';
import type { AuthSession } from '@/types/auth-session';

async function checkAuthLogout(): Promise<void> {
  const sessionId = `logout-${randomUUID()}`;
  const tokenId = randomUUID();
  const times = createAuthSessionTimes();
  const refreshToken = issueRefreshToken({
    userId: 'learning-user',
    sessionId,
    tokenId,
  });
  const session: AuthSession = {
    sessionId,
    userId: 'learning-user',
    currentTokenId: tokenId,
    refreshTokenHash: hashRefreshToken(refreshToken.token),
    rememberMe: true,
    createdAt: times.createdAt,
    lastRefreshedAt: times.createdAt,
    refreshExpiresAt: times.refreshExpiresAt,
    sessionExpiresAt: times.sessionExpiresAt,
    revokedAt: null,
  };

  try {
    console.log('1. 创建登录 Session');
    await createAuthSession(session);

    console.log('2. 无效 Token 不应误删 Session');
    await logoutService.logout(`${refreshToken.token}changed`);
    assert.notEqual(await getAuthSession(sessionId), null);

    console.log('3. 有效 Token 删除 Session');
    await logoutService.logout(refreshToken.token);
    assert.equal(await getAuthSession(sessionId), null);

    console.log('4. 重复退出仍然成功');
    await logoutService.logout(refreshToken.token);

    console.log('Logout 验证通过');
  } finally {
    await deleteAuthSession(sessionId);
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  }
}

checkAuthLogout().catch((error) => {
  console.error('Logout 验证失败:', error);
  process.exitCode = 1;
});
