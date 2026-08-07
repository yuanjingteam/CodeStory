import { randomUUID } from 'crypto';
import { getAiConfig } from '../../../config/ai';
import { logger } from '../../../config/logger';
import prisma from '../../../config/prisma';
import { getTraceId } from '../../../middleware/request-context';

export interface AiCallContext {
  scene: string;
  node?: string;
  model?: string;
  promptVersion?: string;
  retryCount?: number;
  fallbackUsed?: boolean;
}

interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : undefined;
}

function extractTokenUsage(value: unknown): TokenUsage {
  const result = readRecord(value);
  const usage = readRecord(result?.usage_metadata) ||
    readRecord(result?.usageMetadata) ||
    readRecord(readRecord(result?.response_metadata)?.tokenUsage) ||
    readRecord(readRecord(result?.responseMetadata)?.tokenUsage);
  if (!usage) return {};

  const inputTokens = optionalNonNegativeInteger(
    usage.input_tokens ?? usage.promptTokens ?? usage.prompt_tokens
  );
  const outputTokens = optionalNonNegativeInteger(
    usage.output_tokens ?? usage.completionTokens ?? usage.completion_tokens
  );
  const totalTokens = optionalNonNegativeInteger(
    usage.total_tokens ?? usage.totalTokens
  ) ?? (
    inputTokens !== undefined && outputTokens !== undefined
      ? inputTokens + outputTokens
      : undefined
  );
  return { inputTokens, outputTokens, totalTokens };
}

function parseNonNegativeNumber(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function estimateCostUsd(usage: TokenUsage): number | undefined {
  const inputPrice = parseNonNegativeNumber(
    process.env.AI_INPUT_COST_USD_PER_MILLION_TOKENS
  );
  const outputPrice = parseNonNegativeNumber(
    process.env.AI_OUTPUT_COST_USD_PER_MILLION_TOKENS
  );
  if (
    inputPrice === undefined ||
    outputPrice === undefined ||
    usage.inputTokens === undefined ||
    usage.outputTokens === undefined
  ) {
    return undefined;
  }
  return (
    usage.inputTokens * inputPrice + usage.outputTokens * outputPrice
  ) / 1_000_000;
}

function resolveErrorCode(error: unknown): string {
  const record = readRecord(error);
  const candidate = typeof record?.code === 'string'
    ? record.code
    : error instanceof Error
      ? error.message
      : '';
  return /^[A-Z][A-Z0-9_]{2,99}$/.test(candidate)
    ? candidate
    : 'AI_PROVIDER_ERROR';
}

async function persistCall(
  context: AiCallContext,
  status: 'success' | 'error',
  startedAt: number,
  result?: unknown,
  error?: unknown
): Promise<void> {
  try {
    const usage = extractTokenUsage(result);
    const estimatedCostUsd = estimateCostUsd(usage);
    const model = context.model || getAiConfig().model;
    await prisma.$executeRaw`
      INSERT INTO "ai_call_logs" (
        "id", "trace_id", "scene", "node", "model", "prompt_version",
        "input_tokens", "output_tokens", "total_tokens", "estimated_cost_usd",
        "duration_ms", "retry_count", "fallback_used", "status", "error_code"
      ) VALUES (
        ${randomUUID()}, ${getTraceId() || randomUUID()}, ${context.scene},
        ${context.node || null}, ${model}, ${context.promptVersion || null},
        ${usage.inputTokens ?? null}, ${usage.outputTokens ?? null},
        ${usage.totalTokens ?? null}, ${estimatedCostUsd ?? null},
        ${Math.max(0, Date.now() - startedAt)}, ${context.retryCount || 0},
        ${context.fallbackUsed === true}, ${status},
        ${status === 'error' ? resolveErrorCode(error) : null}
      )
    `;
  } catch (logError) {
    logger.warn(
      { scene: context.scene, error: resolveErrorCode(logError) },
      'Failed to persist AI call metrics'
    );
  }
}

export async function observeAiCall<T>(
  context: AiCallContext,
  operation: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await operation();
    await persistCall(context, 'success', startedAt, result);
    return result;
  } catch (error) {
    await persistCall(context, 'error', startedAt, undefined, error);
    throw error;
  }
}

export async function* observeAiStream<T>(
  context: AiCallContext,
  operation: () => Promise<AsyncIterable<T>>
): AsyncGenerator<T> {
  const startedAt = Date.now();
  let lastChunk: T | undefined;
  let completed = false;
  let errorRecorded = false;
  try {
    const stream = await operation();
    for await (const chunk of stream) {
      lastChunk = chunk;
      yield chunk;
    }
    completed = true;
  } catch (error) {
    await persistCall(context, 'error', startedAt, lastChunk, error);
    errorRecorded = true;
    throw error;
  } finally {
    if (completed) {
      await persistCall(context, 'success', startedAt, lastChunk);
    } else if (!errorRecorded) {
      await persistCall(
        context,
        'error',
        startedAt,
        lastChunk,
        new Error('AI_STREAM_ABORTED')
      );
    }
  }
}
