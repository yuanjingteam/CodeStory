import { OpenAIEmbeddings } from '@langchain/openai';
import {
  getAiEmbeddingConfig,
  type AiEmbeddingConfig,
} from '../../config/ai';
import { observeAiCall } from '../ai/_shared/ai-call-observability.service';

export interface EmbeddingClient {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export function createEmbeddingClient(
  config: AiEmbeddingConfig = getAiEmbeddingConfig()
): OpenAIEmbeddings {
  const supportsCustomDimensions =
    config.model.startsWith('Qwen/Qwen3');
  return new OpenAIEmbeddings({
    apiKey: config.apiKey,
    model: config.model,
    batchSize: config.batchSize,
    dimensions: supportsCustomDimensions
      ? config.dimensions
      : undefined,
    timeout: config.timeoutMs,
    configuration: config.baseUrl
      ? { baseURL: config.baseUrl }
      : undefined,
  });
}

function assertEmbeddingDimensions(
  vectors: number[][],
  dimensions: number
): void {
  const invalid = vectors.findIndex(
    (vector) => vector.length !== dimensions
  );
  if (invalid >= 0) {
    throw new Error(
      `EMBEDDING_DIMENSION_MISMATCH: 第 ${invalid + 1} 条向量维度为 ${vectors[invalid].length}，预期 ${dimensions}`
    );
  }
}

export async function embedDocumentsInBatches(
  texts: string[],
  options?: {
    client?: EmbeddingClient;
    batchSize?: number;
    dimensions?: number;
  }
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const config = options?.client ? undefined : getAiEmbeddingConfig();
  const batchSize = Math.min(
    options?.batchSize || config?.batchSize || 10,
    100
  );
  const dimensions =
    options?.dimensions || config?.dimensions || 1024;
  const client = options?.client || createEmbeddingClient(config);
  const vectors: number[][] = [];

  for (let index = 0; index < texts.length; index += batchSize) {
    const batch = texts.slice(index, index + batchSize);
    const batchVectors = options?.client
      ? await client.embedDocuments(batch)
      : await observeAiCall(
          {
            scene: 'rag-embedding',
            node: 'documents',
            model: config!.model,
            promptVersion: 'embedding-v1',
          },
          () => client.embedDocuments(batch)
        );
    if (batchVectors.length !== batch.length) {
      throw new Error(
        `EMBEDDING_COUNT_MISMATCH: 返回 ${batchVectors.length} 条，预期 ${batch.length} 条`
      );
    }
    assertEmbeddingDimensions(batchVectors, dimensions);
    vectors.push(...batchVectors);
  }

  return vectors;
}

export async function embedQuery(
  text: string,
  options?: {
    client?: EmbeddingClient;
    dimensions?: number;
  }
): Promise<number[]> {
  const config = options?.client ? undefined : getAiEmbeddingConfig();
  const dimensions =
    options?.dimensions || config?.dimensions || 1024;
  const client = options?.client || createEmbeddingClient(config);
  const vector = options?.client
    ? await client.embedQuery(text)
    : await observeAiCall(
        {
          scene: 'rag-embedding',
          node: 'query',
          model: config!.model,
          promptVersion: 'embedding-v1',
        },
        () => client.embedQuery(text)
      );
  assertEmbeddingDimensions([vector], dimensions);
  return vector;
}
