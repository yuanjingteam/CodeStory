import rateLimit, { type Store } from 'express-rate-limit';
import type { Request } from 'express';
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../config/redis';
import { logger } from '../config/logger';
import prisma from '../config/prisma';
import { resolveShortId } from '../utils/idTransform';

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createAiRateLimit(options: {
  scene: string;
  envPrefix: string;
  defaultWindowMs: number;
  defaultLimit: number;
  windowMs?: number;
  limit?: number;
  store?: Store;
  skip?: (req: Request) => boolean | Promise<boolean>;
}) {
  const windowMs = options.windowMs || parsePositiveInteger(
    process.env[`${options.envPrefix}_RATE_WINDOW_MS`],
    options.defaultWindowMs
  );
  const limit = options.limit || parsePositiveInteger(
    process.env[`${options.envPrefix}_RATE_LIMIT`],
    options.defaultLimit
  );

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Redis 短时故障时保证学习主流程可用；express-rate-limit 会记录 store 错误。
    passOnStoreError: true,
    skip: options.skip,
    keyGenerator: (req) => `${options.scene}:${req.user!.id}`,
    store:
      options.store ||
      new RedisStore({
        prefix: `codestory:rate:ai:${options.scene}:`,
        sendCommand: async (...args: string[]) => {
          try {
            return await redisClient.sendCommand(args);
          } catch (error) {
            logger.warn(
              { scene: options.scene, error },
              'AI rate limit Redis store unavailable; request allowed'
            );
            throw error;
          }
        },
      }),
    handler: (req, res) => {
      const rateLimitInfo = (
        req as typeof req & { rateLimit: { resetTime?: Date } }
      ).rateLimit;
      const retryAfterSeconds = rateLimitInfo.resetTime
        ? Math.max(
            1,
            Math.ceil(
              (rateLimitInfo.resetTime.getTime() - Date.now()) / 1_000
            )
          )
        : Math.ceil(windowMs / 1_000);
      return res.status(429).json({
        code: 'AI_RATE_LIMITED',
        message: `AI 请求过于频繁，请在 ${retryAfterSeconds} 秒后重试。`,
        data: { scene: options.scene, retryAfterSeconds },
      });
    },
  });
}

export const aiChatRateLimit = createAiRateLimit({
  scene: 'lesson-chat',
  envPrefix: 'AI_CHAT',
  defaultWindowMs: 10 * 60 * 1_000,
  defaultLimit: 20,
});

export const guidedLearningRateLimit = createAiRateLimit({
  scene: 'guided-learning',
  envPrefix: 'AI_GUIDED_LEARNING',
  defaultWindowMs: 10 * 60 * 1_000,
  defaultLimit: 30,
});

export const exerciseAssistanceRateLimit = createAiRateLimit({
  scene: 'exercise-assistance',
  envPrefix: 'AI_EXERCISE_ASSISTANCE',
  defaultWindowMs: 10 * 60 * 1_000,
  defaultLimit: 20,
});

async function isCodeSubmission(req: Request): Promise<boolean> {
  const exerciseId = typeof req.body?.exercise_id === 'string'
    ? req.body.exercise_id
    : '';
  const resolvedId = await resolveShortId('exercises', exerciseId);
  if (!resolvedId) return false;
  const exercise = await prisma.exercises.findFirst({
    where: { id: resolvedId, is_delete: 0 },
    select: { type: true },
  });
  return exercise?.type === 'code';
}

export function createCodeSubmissionRateLimit(options?: {
  windowMs?: number;
  limit?: number;
  store?: Store;
  isCodeSubmission?: (req: Request) => boolean | Promise<boolean>;
}) {
  const detector = options?.isCodeSubmission || isCodeSubmission;
  return createAiRateLimit({
    scene: 'code-grading',
    envPrefix: 'AI_CODE_GRADING',
    defaultWindowMs: 10 * 60 * 1_000,
    defaultLimit: 20,
    windowMs: options?.windowMs,
    limit: options?.limit,
    store: options?.store,
    skip: async (req) => !(await detector(req)),
  });
}

export const codeSubmissionRateLimit = createCodeSubmissionRateLimit();
