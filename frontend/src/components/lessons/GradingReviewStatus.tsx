'use client';

import { useState } from 'react';
import { Button, Field, Textarea } from '@/components/ui';
import type {
  GradingReviewLatest,
  GradingReviewResult,
  GradingReviewStatus as ReviewStatus,
  GradingReviewSummary,
} from '@/types/grading-review';

type Review = GradingReviewSummary | GradingReviewLatest;

const statusContent: Record<
  ReviewStatus,
  { label: string; description: string; className: string }
> = {
  pending: {
    label: '待人工复核',
    description: '本次提交已进入复核队列，复核完成前不会下调你的掌握度。',
    className: 'bg-yellow-200',
  },
  reviewed: {
    label: '复核已完成',
    description: '管理员已处理本次评分复核。',
    className: 'bg-green-200',
  },
  stale: {
    label: '复核已过期',
    description: '你已有更新的提交，这条旧结论不会覆盖当前学习状态。',
    className: 'bg-zinc-200',
  },
};

const resultLabels: Record<GradingReviewResult, string> = {
  maintained: '维持原评分',
  mastered: '改判为已掌握',
  not_mastered: '改判为未掌握',
};

function getOptionalFields(review: Review) {
  return 'appealReason' in review
    ? {
        appealReason: review.appealReason,
        reviewedResult: review.reviewedResult,
        reviewedAt: review.reviewedAt,
      }
    : { appealReason: null, reviewedResult: null, reviewedAt: null };
}

interface GradingReviewStatusProps {
  review: Review | null;
  title?: string;
  onAppeal: (reason: string) => Promise<void>;
}

export default function GradingReviewStatus({
  review,
  title = '评分复核',
  onAppeal,
}: GradingReviewStatusProps) {
  const [appealOpen, setAppealOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const status = review ? statusContent[review.status] : null;
  const { appealReason, reviewedResult, reviewedAt } = review
    ? getOptionalFields(review)
    : { appealReason: null, reviewedResult: null, reviewedAt: null };
  const reviewId = review?.id ?? 'current-submission';
  const canAppeal = review?.canAppeal ?? true;

  const submitAppeal = async () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      setError('申诉理由至少需要 5 个字符。');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onAppeal(trimmedReason);
      setAppealOpen(false);
      setReason('');
    } catch (appealError) {
      setError(appealError instanceof Error ? appealError.message : '申诉提交失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="my-4 border-2 border-black bg-white p-4 text-left" aria-labelledby={`grading-review-${reviewId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={`grading-review-${reviewId}`} className="font-black">{title}</h4>
        {status ? (
          <span className={`border border-black px-2 py-1 text-xs font-black ${status.className}`}>
            {status.label}
          </span>
        ) : (
          <span className="border border-black bg-blue-100 px-2 py-1 text-xs font-black">可申诉</span>
        )}
      </div>
      <p className="mt-2 text-sm text-zinc-700">
        {status
          ? status.description
          : '如果你认为本次评分有误，可以提交理由并由管理员复核当前提交快照。'}
      </p>
      {review ? (
        <p className="mt-2 text-xs font-bold text-zinc-600">
          触发原因：{review.triggerReason} · 答案版本 {review.answerVersion}
        </p>
      ) : null}

      {reviewedResult ? (
        <div className="mt-3 border border-black bg-green-50 p-2 text-sm font-bold">
          复核结论：{resultLabels[reviewedResult]}
          {reviewedAt ? <span className="ml-2 font-normal text-zinc-600">{new Date(reviewedAt).toLocaleString()}</span> : null}
        </div>
      ) : null}

      {appealReason ? (
        <div className="mt-3 border border-black bg-yellow-50 p-2 text-sm">
          <span className="font-black">已提交申诉：</span>{appealReason}
        </div>
      ) : null}

      {canAppeal && !appealReason ? (
        <div className="mt-3">
          {!appealOpen ? (
            <Button size="sm" onClick={() => setAppealOpen(true)}>
              对本次评分申诉
            </Button>
          ) : (
            <div className="grid gap-3 border-t-2 border-black pt-3">
              <Field
                label="申诉理由"
                htmlFor={`appeal-reason-${reviewId}`}
                required
                error={error || undefined}
                helperText="说明你认为评分需要复核的原因，5–1000 字。"
              >
                <Textarea
                  id={`appeal-reason-${reviewId}`}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  disabled={submitting}
                  invalid={Boolean(error)}
                  aria-describedby={error ? `appeal-reason-${reviewId}-error` : `appeal-reason-${reviewId}-description`}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  loading={submitting}
                  loadingText="提交中..."
                  onClick={() => void submitAppeal()}
                >
                  提交申诉
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setAppealOpen(false);
                    setError('');
                  }}
                  disabled={submitting}
                >
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
