import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  hashRefreshToken,
  issueAccessToken,
  issueRefreshToken,
  matchesRefreshTokenHash,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/utils/auth-token';

function tamperToken(token: string): string {
  const parts = token.split('.');
  assert.equal(parts.length, 3);

  const signature = parts[2];
  const firstCharacter = signature[0];
  const changedFirstCharacter = firstCharacter === 'a' ? 'b' : 'a';
  parts[2] = `${changedFirstCharacter}${signature.slice(1)}`;

  return parts.join('.');
}

function checkAuthToken(): void {
  const userId = 'learning-user';
  const sessionId = randomUUID();
  const tokenId = randomUUID();

  console.log('1. 签发并验证 Access Token');
  const accessToken = issueAccessToken({
    userId,
    email: 'learning@example.com',
    role: 0,
    sessionId,
  });
  const accessPayload = verifyAccessToken(accessToken.token);
  assert.equal(accessPayload.sub, userId);
  assert.equal(accessPayload.sessionId, sessionId);
  assert.equal(accessPayload.type, 'access');
  assert.equal(accessPayload.exp - accessPayload.iat, 15 * 60);

  console.log('2. 签发并验证 Refresh Token');
  const refreshToken = issueRefreshToken({
    userId,
    sessionId,
    tokenId,
  });
  const refreshPayload = verifyRefreshToken(refreshToken.token);
  assert.equal(refreshPayload.sub, userId);
  assert.equal(refreshPayload.sessionId, sessionId);
  assert.equal(refreshPayload.tokenId, tokenId);
  assert.equal(refreshPayload.type, 'refresh');
  assert.equal(refreshPayload.exp - refreshPayload.iat, 7 * 24 * 60 * 60);

  console.log('3. 验证两种 Token 不能混用');
  assert.throws(() => verifyAccessToken(refreshToken.token));
  assert.throws(() => verifyRefreshToken(accessToken.token));

  console.log('4. 验证 Token 被篡改后失效');
  assert.throws(() => verifyAccessToken(tamperToken(accessToken.token)));

  console.log('5. 验证 Refresh Token 哈希');
  const firstHash = hashRefreshToken(refreshToken.token);
  const secondHash = hashRefreshToken(refreshToken.token);
  assert.equal(firstHash, secondHash);
  assert.notEqual(firstHash, refreshToken.token);
  assert.equal(firstHash.length, 64);
  assert.equal(matchesRefreshTokenHash(refreshToken.token, firstHash), true);
  assert.equal(matchesRefreshTokenHash(`${refreshToken.token}changed`, firstHash), false);

  console.log('双 Token 工具验证通过');
}

try {
  checkAuthToken();
} catch (error) {
  console.error('双 Token 工具验证失败:', error);
  process.exitCode = 1;
}
