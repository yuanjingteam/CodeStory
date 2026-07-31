import { createHash } from 'node:crypto';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { KnowledgeChunk, KnowledgeSource } from './types';

export const DEFAULT_CHUNK_SIZE = 800;
export const DEFAULT_CHUNK_OVERLAP = 120;

export async function splitKnowledgeSource(
  source: KnowledgeSource,
  options?: {
    chunkSize?: number;
    chunkOverlap?: number;
  }
): Promise<KnowledgeChunk[]> {
  const content = source.content.trim();
  if (!content) return [];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options?.chunkSize || DEFAULT_CHUNK_SIZE,
    chunkOverlap: options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
    separators: ['\n## ', '\n### ', '\n\n', '\n', '。', '；', '，', ' ', ''],
  });
  const documents = await splitter.createDocuments([content]);

  return documents.map((document, chunkIndex) => {
    const chunkContent = document.pageContent.trim();
    return {
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      courseId: source.courseId,
      lessonId: source.lessonId,
      sourceVersion: source.sourceVersion,
      chunkIndex,
      content: chunkContent,
      contentHash: createHash('sha256')
        .update(chunkContent)
        .digest('hex'),
      metadata: source.metadata,
    };
  });
}
