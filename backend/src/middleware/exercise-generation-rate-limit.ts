import rateLimit, { type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../config/redis';

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const defaultWindowMs = parsePositiveInteger(
  process.env.AI_EXERCISE_GENERATION_RATE_WINDOW_MS,
  10 * 60 * 1_000
);
const defaultLimit = parsePositiveInteger(
  process.env.AI_EXERCISE_GENERATION_RATE_LIMIT,
  5
);

export function createExerciseGenerationRateLimit(options?: {
  windowMs?: number;
  limit?: number;
  store?: Store;
}) {
  const windowMs = options?.windowMs || defaultWindowMs;
  return rateLimit({
  windowMs,
  limit: options?.limit || defaultLimit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  passOnStoreError: false,
  keyGenerator: (req) => `admin:${req.user!.id}`,
  store:
    options?.store ||
    new RedisStore({
      prefix: 'codestory:rate:exercise-generation:',
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
  handler: (req, res) => {
    const rateLimitInfo = (
      req as typeof req & {
        rateLimit: { resetTime?: Date };
      }
    ).rateLimit;
    const retryAfterSeconds = rateLimitInfo.resetTime
      ? Math.max(
          1,
          Math.ceil(
            (rateLimitInfo.resetTime.getTime() - Date.now()) / 1_000
          )
        )
      : Math.ceil(windowMs / 1_000);
    res.status(429).json({
      code: 'AI_EXERCISE_GENERATION_RATE_LIMITED',
      message: `出题请求过于频繁，请在 ${retryAfterSeconds} 秒后重试。`,
      data: { retryAfterSeconds },
    });
  },
  });
}

export const exerciseGenerationRateLimit =
  createExerciseGenerationRateLimit();
