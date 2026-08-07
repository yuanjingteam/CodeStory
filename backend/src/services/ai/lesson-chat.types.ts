import type { KnowledgeSourceType } from '../rag';

export type LessonAnswerScope = 'course' | 'extended';
export type LessonAnswerScopeRequest =
  | 'auto'
  | LessonAnswerScope;
export type LessonEvidenceQuality = 'strong' | 'thin' | 'empty';
export type LessonTutorPromptVersion =
  | 'grounded-v2'
  | 'grounded-v3';
export type LessonTutorPromptRevision =
  | 'grounded-v2.0'
  | 'grounded-v3.1-boundary';

export interface LessonChatSourceReference {
  index: number;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  title: string;
  chunkIndex: number;
  contentHash: string;
  score?: number;
}
