import { ChatOpenAI } from '@langchain/openai';
import { getAiConfig } from '../../../config/ai';

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
  streaming?: boolean;
  streamUsage?: boolean;
}): ChatOpenAI {
  const config = getAiConfig();

  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: overrides?.temperature ?? 0.3,
    timeout: config.timeoutMs,
    maxTokens: overrides?.maxTokens
      ? Math.min(config.maxTokens, overrides.maxTokens)
      : config.maxTokens,
    streaming: overrides?.streaming ?? false,
    streamUsage: overrides?.streamUsage ?? false,
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
 * 处理三种情况：
 * 1. 纯 JSON 文本
 * 2. 被 ```json ... ``` 代码块包裹的 JSON
 * 3. JSON 嵌在多余文本中（取第一个 { 到最后一个 }）
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

  try {
    return JSON.parse(jsonText);
  } catch {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error(errorCode);
    return JSON.parse(jsonText.slice(start, end + 1));
  }
}
