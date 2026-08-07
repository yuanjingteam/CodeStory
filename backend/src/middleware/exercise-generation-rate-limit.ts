import type { Store } from 'express-rate-limit';
import { createAiRateLimit } from './ai-rate-limit';

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
  return createAiRateLimit({
    scene: 'exercise-generation',
    envPrefix: 'AI_EXERCISE_GENERATION',
    defaultWindowMs,
    defaultLimit,
    ...options,
  });
}

export const exerciseGenerationRateLimit =
  createExerciseGenerationRateLimit();
