export type GradingReviewStatus = 'pending' | 'reviewed' | 'stale';

export type GradingReviewResult =
  | 'maintained'
  | 'mastered'
  | 'not_mastered';

export interface GradingReviewSummary {
  id: string;
  status: GradingReviewStatus;
  triggerReason: string;
  answerVersion: number;
  canAppeal: boolean;
}

export interface GradingReviewLatest extends GradingReviewSummary {
  appealReason: string | null;
  reviewedResult: GradingReviewResult | null;
  reviewedAt: string | null;
}

export interface AdminGradingReviewItem {
  id: string;
  traceId: string;
  exerciseId: string;
  exerciseContent: string;
  lessonTitle: string;
  user: {
    id: string;
    email: string;
    nickname: string | null;
  };
  submissionType: string;
  triggerReason: string;
  aiScore: number | null;
  ruleScore: number | null;
  status: GradingReviewStatus;
  answerVersion: number;
  hintLevelUsed: number;
  appealed: boolean;
  createdAt: string;
}

export interface AdminGradingReviewDetail extends AdminGradingReviewItem {
  submittedAnswer: string;
  exerciseSnapshot: unknown;
  codeSubmissionId: string | null;
  appealReason: string | null;
  reviewedResult: GradingReviewResult | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewer: {
    id: string;
    email: string;
    nickname: string | null;
  } | null;
}

export interface GradingReviewPagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface ResponseData<T> {
  code: number;
  message: string;
  data: T;
}
