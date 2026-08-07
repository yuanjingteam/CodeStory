import { convert } from 'html-to-text';

export type KnowledgeIndexPolicy = 'auto' | 'include' | 'exclude';
export type ContentReadinessStatus =
  | 'indexable'
  | 'needs_content'
  | 'needs_review'
  | 'excluded';

export interface ContentReadinessResult {
  status: ContentReadinessStatus;
  meaningfulCharacters: number;
  reasonCode?: string;
}

function toPlainText(value: string | null | undefined): string {
  return convert(value || '', {
    wordwrap: false,
    selectors: [
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'img', format: 'skip' },
    ],
  })
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparable(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function meaningfulLength(value: string): number {
  return (value.match(/[\p{L}\p{N}]/gu) || []).length;
}

export function assessLessonContent(input: {
  title: string;
  content?: string | null;
  policy?: KnowledgeIndexPolicy | string | null;
}): ContentReadinessResult {
  const policy = input.policy || 'auto';
  if (policy === 'exclude') {
    return {
      status: 'excluded',
      meaningfulCharacters: 0,
      reasonCode: 'RAG_POLICY_EXCLUDED',
    };
  }

  const plainText = toPlainText(input.content);
  const length = meaningfulLength(plainText);
  if (
    length === 0 ||
    normalizeComparable(plainText) ===
      normalizeComparable(input.title)
  ) {
    return {
      status: 'needs_content',
      meaningfulCharacters: length,
      reasonCode: 'RAG_CONTENT_EMPTY',
    };
  }

  const codeText = Array.from(
    (input.content || '').matchAll(
      /<(?:pre|code)\b[^>]*>([\s\S]*?)<\/(?:pre|code)>/gi
    )
  )
    .map((match) => toPlainText(match[1]))
    .join(' ');
  const listItemCount = (
    (input.content || '').match(/<li\b/gi) || []
  ).length;
  const structuredEnough =
    meaningfulLength(codeText) >= 40 ||
    (listItemCount >= 3 && length >= 40);
  if (
    policy !== 'include' &&
    length < 80 &&
    !structuredEnough
  ) {
    return {
      status: 'needs_review',
      meaningfulCharacters: length,
      reasonCode: 'RAG_CONTENT_THIN',
    };
  }

  return { status: 'indexable', meaningfulCharacters: length };
}

export function assessExerciseContent(input: {
  content?: string | null;
  knowledge?: string | null;
  policy?: KnowledgeIndexPolicy | string | null;
}): ContentReadinessResult {
  const policy = input.policy || 'auto';
  if (policy === 'exclude') {
    return {
      status: 'excluded',
      meaningfulCharacters: 0,
      reasonCode: 'RAG_POLICY_EXCLUDED',
    };
  }

  const question = toPlainText(input.content);
  const questionLength = meaningfulLength(question);
  if (questionLength === 0) {
    return {
      status: 'needs_content',
      meaningfulCharacters: 0,
      reasonCode: 'RAG_CONTENT_EMPTY',
    };
  }

  const knowledgeLength = meaningfulLength(input.knowledge || '');
  if (
    policy !== 'include' &&
    (questionLength < 20 || knowledgeLength < 4)
  ) {
    return {
      status: 'needs_review',
      meaningfulCharacters: questionLength + knowledgeLength,
      reasonCode: 'RAG_CONTENT_THIN',
    };
  }

  return {
    status: 'indexable',
    meaningfulCharacters: questionLength + knowledgeLength,
  };
}
