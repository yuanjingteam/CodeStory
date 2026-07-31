export type KnowledgeSourceType = 'lesson' | 'exercise' | 'doc';

export interface KnowledgeSource {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  courseId?: string;
  lessonId?: string;
  sourceVersion: Date;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeChunk {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  courseId?: string;
  lessonId?: string;
  sourceVersion: Date;
  chunkIndex: number;
  content: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievedKnowledge extends KnowledgeChunk {
  score: number;
}

export type RetrievalPurpose = 'student_chat' | 'admin_generation';

export interface RetrieveOptions {
  userId: string;
  courseId: string;
  lessonId?: string;
  purpose: RetrievalPurpose;
  topK?: number;
  sourceTypes?: KnowledgeSourceType[];
  strictLessonScope?: boolean;
}

export interface KnowledgeRetriever {
  retrieve(
    query: string,
    options: RetrieveOptions
  ): Promise<RetrievedKnowledge[]>;
}

export interface KnowledgeIndexTicket {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  sourceUpdatedAt: Date;
  generation: bigint;
}

export type KnowledgeIndexStatus =
  | 'ready'
  | 'partial'
  | 'failed';

export type PersistentKnowledgeIndexStatus =
  | KnowledgeIndexStatus
  | 'pending'
  | 'needs_content'
  | 'needs_review'
  | 'excluded'
  | 'not_indexed';

export interface KnowledgeIndexSummary {
  status: PersistentKnowledgeIndexStatus;
  totalSources: number;
  readySources: number;
  pendingSources: number;
  failedSources: number;
  needsContentSources: number;
  needsReviewSources: number;
  excludedSources: number;
  notIndexedSources: number;
  updatedAt: Date | null;
}

export interface KnowledgeIndexResult {
  ticket: KnowledgeIndexTicket;
  status:
    | 'ready'
    | 'failed'
    | 'stale'
    | 'invalid'
    | 'needs_content'
    | 'needs_review'
    | 'excluded';
  chunkCount: number;
  errorCode?: string;
}
