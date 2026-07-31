import '../src/config/env';
import {
  createEmbeddingClient,
  embedDocumentsInBatches,
  embedQuery,
} from '../src/services/rag';
import { getAiEmbeddingConfig } from '../src/config/ai';

async function main(): Promise<void> {
  const config = getAiEmbeddingConfig();
  const client = createEmbeddingClient(config);
  const documents = Array.from(
    { length: 10 },
    (_, index) =>
      index === 0
        ? 'SQL 的 WHERE 子句用于过滤满足条件的记录。'
        : `编程课程 Embedding 冒烟文本 ${index + 1}。`
  );
  const vectors = await embedDocumentsInBatches(documents, {
    client,
    batchSize: config.batchSize,
    dimensions: config.dimensions,
  });
  const query = await embedQuery('如何过滤数据库记录？', {
    client,
    dimensions: config.dimensions,
  });

  process.stdout.write(
    `${JSON.stringify({
      providerHost: config.baseUrl
        ? new URL(config.baseUrl).host
        : 'default',
      model: config.model,
      dimensions: config.dimensions,
      documentCount: vectors.length,
      queryDimensions: query.length,
      finite: [...vectors, query].every((vector) =>
        vector.every(Number.isFinite)
      ),
    })}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
