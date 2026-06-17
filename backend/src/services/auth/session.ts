// 用Redis做了一个登录会话管理器，登录了就创建，刷新就更新，退出就删除
import redisClient from '@/config/redis';
import type { AuthSession } from '@/types/auth-session';

const AUTH_SESSION_KEY_PREFIX = 'auth:session:';

export type RotateAuthSessionResult = 'updated' | 'missing' | 'mismatch';

// 生成登录会话的Redis键名 给每条数据统一添加前缀
function getAuthSessionKey(sessionId: string): string {
  return `${AUTH_SESSION_KEY_PREFIX}${sessionId}`;
}

// 计算这个session的过期时间，单位秒数 作为Redis的过期时间参数
function getSessionTtlSeconds(sessionExpiresAt: string): number {
  const expiresAtMs = new Date(sessionExpiresAt).getTime();

  if (!Number.isFinite(expiresAtMs)) {
    throw new Error('Session 绝对过期时间无效');
  }

  const ttlSeconds = Math.ceil((expiresAtMs - Date.now()) / 1_000);

  if (ttlSeconds <= 0) {
    throw new Error('Session 已超过绝对过期时间');
  }

  return ttlSeconds;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;

  const session = value as Record<string, unknown>;
  return (
    typeof session.sessionId === 'string' &&
    typeof session.userId === 'string' &&
    typeof session.currentTokenId === 'string' &&
    typeof session.refreshTokenHash === 'string' &&
    typeof session.rememberMe === 'boolean' &&
    typeof session.createdAt === 'string' &&
    typeof session.lastRefreshedAt === 'string' &&
    typeof session.refreshExpiresAt === 'string' &&
    typeof session.sessionExpiresAt === 'string' &&
    (typeof session.revokedAt === 'string' || session.revokedAt === null)
  );
}

// 保存登录会话到Redis
async function saveAuthSession(session: AuthSession): Promise<void> {
  const ttlSeconds = getSessionTtlSeconds(session.sessionExpiresAt);

  await redisClient.set(getAuthSessionKey(session.sessionId), JSON.stringify(session), {
    EX: ttlSeconds,
  });
}

// 创建登录会话
export async function createAuthSession(session: AuthSession): Promise<void> {
  await saveAuthSession(session);
}

// 从Redis读取登录会话
export async function getAuthSession(
  sessionId: string
): Promise<AuthSession | null> {
  const value = await redisClient.get(getAuthSessionKey(sessionId));
  if (!value) return null;

  try {
    const session: unknown = JSON.parse(value);

    if (!isAuthSession(session)) {
      throw new Error('Redis 中的 Session 数据格式无效');
    }

    return session;
  } catch (error) {
    console.error(`读取登录 Session 失败: ${sessionId}`, error);
    return null;
  }
}

// 更新登录会话
export async function updateAuthSession(session: AuthSession): Promise<void> {
  await saveAuthSession(session);
}

// 刷新登录会话
export async function rotateAuthSession(
  previousSession: AuthSession,
  nextSession: AuthSession
): Promise<RotateAuthSessionResult> {
  const key = getAuthSessionKey(previousSession.sessionId);
  const script = `
    local value = redis.call('GET', KEYS[1])
    if not value then
      return 0
    end

    local session = cjson.decode(value)
    if session.currentTokenId ~= ARGV[1] or session.refreshTokenHash ~= ARGV[2] then
      return -1
    end

    redis.call('SET', KEYS[1], ARGV[3], 'KEEPTTL')
    return 1
  `;

  const result = await redisClient.eval(script, {
    keys: [key],
    arguments: [
      previousSession.currentTokenId,
      previousSession.refreshTokenHash,
      JSON.stringify(nextSession),
    ],
  });

  if (result === 1) return 'updated';
  if (result === 0) return 'missing';
  return 'mismatch';
}

// 删除登录会话
export async function deleteAuthSession(sessionId: string): Promise<boolean> {
  const deletedCount = await redisClient.del(getAuthSessionKey(sessionId));
  return deletedCount > 0;
}
