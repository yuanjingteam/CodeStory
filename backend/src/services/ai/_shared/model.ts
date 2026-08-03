import { ChatOpenAI } from '@langchain/openai';
import { getAiConfig } from '../../../config/ai';
import { logger } from '../../../config/logger';

/**
 * 创建已配置好的 ChatOpenAI 模型实例。
 *
 * @param overrides 覆盖默认参数（如 temperature、maxTokens、streaming）
 *
 * 4 个 AI service 之前各自重复实现 createModel()，现统一从此处引入。
 */
export function createChatModel(overrides?: {
  temperature?: number;
  maxTokens?: number;
  allowMaxTokensAboveDefault?: boolean;
  streaming?: boolean;
  streamUsage?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}): ChatOpenAI {
  const config = getAiConfig();
  logger.debug(
    { model: config.model, streaming: overrides?.streaming ?? false },
    'Creating chat model'
  );

  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: overrides?.temperature ?? 0.3,
    timeout: overrides?.timeoutMs ?? config.timeoutMs,
    maxTokens: overrides?.maxTokens
      ? overrides.allowMaxTokensAboveDefault
        ? overrides.maxTokens
        : Math.min(config.maxTokens, overrides.maxTokens)
      : config.maxTokens,
    streaming: overrides?.streaming ?? false,
    streamUsage: overrides?.streamUsage ?? false,
    ...(typeof overrides?.maxRetries === 'number'
      ? { maxRetries: overrides.maxRetries }
      : {}),
    configuration: config.baseUrl ? { baseURL: config.baseUrl } : undefined,
  });
}

/**
 * 从 LangChain 消息内容中提取纯文本。
 *
 * LangChain 的 content 可能是 string 或 ContentBlock[]（含 text 字段的对象数组），
 * 3 个 AI service 之前各自重复实现 getMessageText()，现统一从此处引入。
 */
export function getMessageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((block) => {
      if (typeof block === 'string') return block;
      if (
        block &&
        typeof block === 'object' &&
        'text' in block &&
        typeof block.text === 'string'
      ) {
        return block.text;
      }
      return '';
    })
    .join('');
}

/**
 * 从 AI 返回的文本中提取 JSON 对象。
 *
 * 处理以下情况：
 * 1. 纯 JSON 文本
 * 2. 被 ```json ... ``` 代码块包裹的 JSON
 * 3. JSON 嵌在多余文本中
 * 4. JSON 字符串中含模型输出的未转义控制字符
 *
 * @param errorCode 解析失败时抛出的错误码（如 'AI_CODE_REVIEW_JSON_NOT_FOUND'）
 *
 * 2 个 AI service（code-review / choice-explanation）之前各自重复实现 extractJsonObject()，
 * 现统一从此处引入。
 */
export function extractJsonObject(text: string, errorCode: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;

  const direct = tryParseModelJson(jsonText);
  if (direct.ok) return direct.value;

  for (const candidate of findBalancedJsonObjects(jsonText).reverse()) {
    const parsed = tryParseModelJson(candidate);
    if (parsed.ok) return parsed.value;
  }

  throw new Error(errorCode);
}

function tryParseModelJson(text: string):
  | { ok: true; value: unknown }
  | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    const escaped = escapeControlCharactersInStrings(text);
    if (escaped === text) return { ok: false };
    try {
      return { ok: true, value: JSON.parse(escaped) };
    } catch {
      return { ok: false };
    }
  }
}

function escapeControlCharactersInStrings(text: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const character of text) {
    if (!inString) {
      result += character;
      if (character === '"') inString = true;
      continue;
    }

    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      result += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      result += character;
      inString = false;
      continue;
    }

    const code = character.charCodeAt(0);
    result += code <= 0x1f
      ? `\\u${code.toString(16).padStart(4, '0')}`
      : character;
  }

  return result;
}

function findBalancedJsonObjects(text: string): string[] {
  const ranges: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{') continue;
    const end = findBalancedObjectEnd(text, start);
    if (end >= 0) ranges.push({ start, end });
  }

  return ranges
    .filter((range) => !ranges.some((outer) =>
      outer.start < range.start && outer.end >= range.end
    ))
    .map(({ start, end }) => text.slice(start, end + 1));
}

function findBalancedObjectEnd(text: string, start: number): number {
  let depth = 1;
  let inString = false;
  let escaped = false;

  for (let index = start + 1; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}
