// AI 配置 (去从环境变量中去获取千问配置)
export interface AiConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs: number;
  maxTokens: number;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAiConfig(): AiConfig {
  const qwenApiKey = process.env.QWEN_API_KEY?.trim();
  const apiKey = process.env.AI_API_KEY?.trim() || qwenApiKey;
  const model = process.env.AI_MODEL?.trim() || (qwenApiKey ? 'qwen-plus' : '');
  const defaultQwenBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  if (!apiKey || !model) {
    throw new Error('AI_API_KEY 或 AI_MODEL 未配置');
  }

  return {
    apiKey,
    model,
    baseUrl:
      process.env.AI_BASE_URL?.trim() ||
      (qwenApiKey ? defaultQwenBaseUrl : undefined),
    timeoutMs: parsePositiveInteger(process.env.AI_TIMEOUT_MS, 30_000),
    maxTokens: parsePositiveInteger(process.env.AI_MAX_TOKENS, 1_000),
  };
}
