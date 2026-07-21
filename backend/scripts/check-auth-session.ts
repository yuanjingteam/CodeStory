import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import redisClient from '@/config/redis';
import {
  calculateNextRefreshExpiresAt,
  createAuthSessionTimes,
} from '@/config/auth-session';
import {
  createAuthSession,
  deleteAuthSession,
  getAuthSession,
  updateAuthSession,
} from '@/services/auth/session';
import type { AuthSession } from '@/types/auth-session';

async function checkAuthSession(): Promise<void> {
  const sessionId = `learning-${randomUUID()}`;
  const tokenId = randomUUID();
  const times = createAuthSessionTimes();

  const session: AuthSession = {
    sessionId,
    userId: 'learning-user',
    currentTokenId: tokenId,
    refreshTokenHash: createHash('sha256').update('learning-token').digest('hex'),
    rememberMe: true,
    createdAt: times.createdAt,
    lastRefreshedAt: times.createdAt,
    refreshExpiresAt: times.refreshExpiresAt,
    sessionExpiresAt: times.sessionExpiresAt,
    revokedAt: null,
  };

  try {
    console.log('1. 创建 Session');
    await createAuthSession(session);

    console.log('2. 读取 Session');
    const createdSession = await getAuthSession(sessionId);
    assert.deepEqual(createdSession, session);

    console.log('3. 更新 Session');
    const refreshedAt = new Date();
    const updatedSession: AuthSession = {
      ...session,
      currentTokenId: randomUUID(),
      lastRefreshedAt: refreshedAt.toISOString(),
      refreshExpiresAt: calculateNextRefreshExpiresAt(
        session.sessionExpiresAt,
        refreshedAt
      ),
    };
    await updateAuthSession(updatedSession);

    const savedUpdatedSession = await getAuthSession(sessionId);
    assert.equal(savedUpdatedSession?.currentTokenId, updatedSession.currentTokenId);

    console.log('4. 删除 Session');
    const deleted = await deleteAuthSession(sessionId);
    assert.equal(deleted, true);
    assert.equal(await getAuthSession(sessionId), null);

    console.log('Redis 登录 Session 验证通过');
  } finally {
    await deleteAuthSession(sessionId);
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  }
}

checkAuthSession().catch((error) => {
  console.error('Redis 登录 Session 验证失败:', error);
  process.exitCode = 1;
});
