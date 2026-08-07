import { beforeEach, describe, expect, it, vi } from 'vitest';

const { constructorOptions, embedDocumentsMock, embedQueryMock, observeMock } =
  vi.hoisted(() => ({
    constructorOptions: [] as Array<Record<string, unknown>>,
    embedDocumentsMock: vi.fn(),
    embedQueryMock: vi.fn(),
    observeMock: vi.fn(async (_context, operation) => operation()),
  }));

vi.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: class {
    constructor(options: Record<string, unknown>) {
      constructorOptions.push(options);
    }
    embedDocuments = embedDocumentsMock;
    embedQuery = embedQueryMock;
  },
}));
vi.mock('../../src/services/ai/_shared/ai-call-observability.service', () => ({
  observeAiCall: observeMock,
}));

import {
  embedDocumentsInBatches,
  embedQuery,
} from '../../src/services/rag/embedding';

describe('RAG embedding 可观测性配置', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    constructorOptions.length = 0;
    process.env.AI_API_KEY = 'embedding-test-key';
    process.env.AI_EMBEDDING_MODEL = 'Qwen/Qwen3-Embedding-4B';
    process.env.AI_EMBEDDING_DIMENSIONS = '1024';
    embedDocumentsMock.mockResolvedValue([new Array(1024).fill(0)]);
    embedQueryMock.mockResolvedValue(new Array(1024).fill(0));
  });

  it('仅覆盖 batchSize 和 dimensions 时仍解析 provider model', async () => {
    await embedDocumentsInBatches(['text'], {
      batchSize: 1,
      dimensions: 1024,
    });
    expect(constructorOptions[0].model).toBe('Qwen/Qwen3-Embedding-4B');
    expect(observeMock.mock.calls[0][0]).toMatchObject({
      scene: 'rag-embedding',
      node: 'documents',
      model: 'Qwen/Qwen3-Embedding-4B',
    });
  });

  it('仅覆盖 query dimensions 时仍解析 provider model', async () => {
    await embedQuery('text', { dimensions: 1024 });
    expect(constructorOptions[0].model).toBe('Qwen/Qwen3-Embedding-4B');
    expect(observeMock.mock.calls[0][0]).toMatchObject({
      scene: 'rag-embedding',
      node: 'query',
      model: 'Qwen/Qwen3-Embedding-4B',
    });
  });
});
