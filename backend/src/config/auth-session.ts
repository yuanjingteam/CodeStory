import type { AuthSessionTimes } from '@/types/auth-session';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

export const ACCESS_TOKEN_TTL_SECONDS = (15 * MINUTE) / SECOND;
export const REFRESH_SLIDING_TTL_SECONDS = (7 * DAY) / SECOND;
export const SESSION_ABSOLUTE_TTL_SECONDS = (30 * DAY) / SECOND;

export function createAuthSessionTimes(now = new Date()): AuthSessionTimes {
  const createdAtMs = now.getTime();
  const sessionExpiresAtMs =
    createdAtMs + SESSION_ABSOLUTE_TTL_SECONDS * SECOND;
  const refreshExpiresAtMs = Math.min(
    createdAtMs + REFRESH_SLIDING_TTL_SECONDS * SECOND,
    sessionExpiresAtMs
  );

  return {
    createdAt: now.toISOString(),
    refreshExpiresAt: new Date(refreshExpiresAtMs).toISOString(),
    sessionExpiresAt: new Date(sessionExpiresAtMs).toISOString(),
  };
}

export function calculateNextRefreshExpiresAt(
  sessionExpiresAt: string,
  now = new Date()
): string {
  const sessionExpiresAtMs = new Date(sessionExpiresAt).getTime();

  if (!Number.isFinite(sessionExpiresAtMs)) {
    throw new Error('Session 绝对过期时间无效');
  }

  const nextRefreshExpiresAtMs = Math.min(
    now.getTime() + REFRESH_SLIDING_TTL_SECONDS * SECOND,
    sessionExpiresAtMs
  );

  return new Date(nextRefreshExpiresAtMs).toISOString();
}
