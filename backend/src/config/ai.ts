// AI 配置
export interface AiConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs: number;
  maxTokens: number;
}

export interface AiEmbeddingConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  batchSize: number;
  dimensions: number;
  timeoutMs: number;
}

export type AiTutorPromptVersion =
  | 'grounded-v2'
  | 'grounded-v3';

const DEFAULT_EMBEDDING_BATCH_SIZE = 10;
const SUPPORTED_EMBEDDING_DIMENSIONS = new Set([
  64, 128, 256, 512, 768, 1024, 1536, 2048, 2560, 4096,
]);

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getAiProviderDefaults() {
  const qwenApiKey = process.env.QWEN_API_KEY?.trim();
  const defaultQwenBaseUrl =
    'https://dashscope.aliyuncs.com/compatible-mode/v1';

  return {
    qwenApiKey,
    apiKey: process.env.AI_API_KEY?.trim() || qwenApiKey,
    baseUrl:
      process.env.AI_BASE_URL?.trim() ||
      (qwenApiKey ? defaultQwenBaseUrl : undefined),
  };
}

export function getAiConfig(): AiConfig {
  const { qwenApiKey, apiKey, baseUrl } = getAiProviderDefaults();
  const model = process.env.AI_MODEL?.trim() || (qwenApiKey ? 'qwen-plus' : '');

  if (!apiKey || !model) {
    throw new Error('AI_API_KEY 或 AI_MODEL 未配置');
  }

  return {
    apiKey,
    model,
    baseUrl,
    timeoutMs: parsePositiveInteger(process.env.AI_TIMEOUT_MS, 30_000),
    maxTokens: parsePositiveInteger(process.env.AI_MAX_TOKENS, 1_000),
  };
}

export function getAiEmbeddingConfig(): AiEmbeddingConfig {
  const { apiKey, baseUrl } = getAiProviderDefaults();
  const model =
    process.env.AI_EMBEDDING_MODEL?.trim() ||
    'Qwen/Qwen3-Embedding-4B';
  const requestedBatchSize = parsePositiveInteger(
    process.env.AI_EMBEDDING_BATCH_SIZE,
    DEFAULT_EMBEDDING_BATCH_SIZE
  );
  const dimensions = parsePositiveInteger(
    process.env.AI_EMBEDDING_DIMENSIONS,
    1024
  );

  if (!apiKey) {
    throw new Error('AI_API_KEY 或 QWEN_API_KEY 未配置，无法调用 embedding');
  }
  if (!SUPPORTED_EMBEDDING_DIMENSIONS.has(dimensions)) {
    throw new Error(`AI_EMBEDDING_DIMENSIONS=${dimensions} 不受支持`);
  }
  if (dimensions !== 1024) {
    throw new Error(
      '当前 knowledge_chunks.embedding 固定为 1024 维；切换维度前必须先执行数据库迁移并重建索引'
    );
  }

  return {
    apiKey,
    model,
    baseUrl: process.env.AI_EMBEDDING_BASE_URL?.trim() || baseUrl,
    batchSize: requestedBatchSize,
    dimensions,
    timeoutMs: parsePositiveInteger(process.env.AI_TIMEOUT_MS, 30_000),
  };
}

export function isRagEnabled(): boolean {
  return process.env.AI_RAG_ENABLED?.trim().toLowerCase() === 'true';
}

export function getAiTutorPromptVersion(): AiTutorPromptVersion {
  return process.env.AI_TUTOR_PROMPT_VERSION?.trim() ===
    'grounded-v3'
    ? 'grounded-v3'
    : 'grounded-v2';
}
