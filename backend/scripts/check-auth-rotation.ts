import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import redisClient from '@/config/redis';
import { createAuthSessionTimes } from '@/config/auth-session';
import {
  createAuthSession,
  deleteAuthSession,
  getAuthSession,
  rotateAuthSession,
} from '@/services/auth/session';
import type { AuthSession } from '@/types/auth-session';

async function checkAuthRotation(): Promise<void> {
  const sessionId = `rotation-${randomUUID()}`;
  const times = createAuthSessionTimes();
  const previousSession: AuthSession = {
    sessionId,
    userId: 'learning-user',
    currentTokenId: randomUUID(),
    refreshTokenHash: createHash('sha256').update('old-token').digest('hex'),
    rememberMe: true,
    createdAt: times.createdAt,
    lastRefreshedAt: times.createdAt,
    refreshExpiresAt: times.refreshExpiresAt,
    sessionExpiresAt: times.sessionExpiresAt,
    revokedAt: null,
  };
  const nextSession: AuthSession = {
    ...previousSession,
    currentTokenId: randomUUID(),
    refreshTokenHash: createHash('sha256').update('new-token').digest('hex'),
    lastRefreshedAt: new Date().toISOString(),
  };

  try {
    console.log('1. 创建旧 Session');
    await createAuthSession(previousSession);

    console.log('2. 使用旧凭证原子轮换');
    const firstResult = await rotateAuthSession(previousSession, nextSession);
    assert.equal(firstResult, 'updated');

    console.log('3. 验证 Redis 已保存新凭证');
    const savedSession = await getAuthSession(sessionId);
    assert.equal(savedSession?.currentTokenId, nextSession.currentTokenId);
    assert.equal(savedSession?.refreshTokenHash, nextSession.refreshTokenHash);

    console.log('4. 验证旧凭证不能再次轮换');
    const replayResult = await rotateAuthSession(previousSession, nextSession);
    assert.equal(replayResult, 'mismatch');

    console.log('Refresh Token Rotation 验证通过');
  } finally {
    await deleteAuthSession(sessionId);
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  }
}

checkAuthRotation().catch((error) => {
  console.error('Refresh Token Rotation 验证失败:', error);
  process.exitCode = 1;
});
