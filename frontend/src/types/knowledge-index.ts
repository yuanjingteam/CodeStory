export type KnowledgeIndexStatus =
  | 'ready'
  | 'pending'
  | 'partial'
  | 'failed'
  | 'needs_content'
  | 'needs_review'
  | 'excluded'
  | 'not_indexed';

export interface KnowledgeIndexSummary {
  status: KnowledgeIndexStatus;
  totalSources: number;
  readySources: number;
  pendingSources: number;
  failedSources: number;
  needsContentSources: number;
  needsReviewSources: number;
  excludedSources: number;
  notIndexedSources: number;
  updatedAt: string | null;
}
