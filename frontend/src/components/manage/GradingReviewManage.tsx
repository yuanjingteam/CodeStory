'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { Pagination } from '@/components/common';
import { Button, Field, NativeSelect, Textarea } from '@/components/ui';
import { gradingReviewManageApi } from '@/app/api/manage/grading-review';
import type {
  AdminGradingReviewDetail,
  AdminGradingReviewItem,
  GradingReviewResult,
  GradingReviewStatus,
} from '@/types/grading-review';
import { formatDate } from '@/utils/format';
import { showToast } from '@/utils/toast';

const statusLabels: Record<GradingReviewStatus, string> = {
  pending: '待复核',
  reviewed: '已复核',
  stale: '已过期',
};

const statusStyles: Record<GradingReviewStatus, string> = {
  pending: 'bg-yellow-300',
  reviewed: 'bg-green-300',
  stale: 'bg-zinc-200',
};

const resultLabels: Record<GradingReviewResult, string> = {
  maintained: '维持原判',
  mastered: '改判为已掌握',
  not_mastered: '改判为未掌握',
};

function getRequestError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function ScoreValue({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border-2 border-black bg-white p-3">
      <div className="text-xs font-bold text-zinc-600">{label}</div>
      <div className="mt-1 font-mono text-2xl font-black">
        {value === null ? '—' : value}
      </div>
    </div>
  );
}

function DetailText({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-black uppercase tracking-wide text-zinc-600">
        {label}
      </div>
      <div className="break-words text-sm font-medium text-zinc-900">{children}</div>
    </div>
  );
}

export default function GradingReviewManage() {
  const [status, setStatus] = useState<GradingReviewStatus | ''>('pending');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [items, setItems] = useState<AdminGradingReviewItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminGradingReviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [result, setResult] = useState<GradingReviewResult>('maintained');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    gradingReviewManageApi
      .list({ status, page, size })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setPagination({
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        });
        const nextSelectedId = data.items[0]?.id ?? null;
        setSelectedId(nextSelectedId);
        setDetailError('');
        setDetailLoading(Boolean(nextSelectedId));
        if (!nextSelectedId) {
          setDetail(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setItems([]);
        setPagination({ total: 0, totalPages: 0 });
        setSelectedId(null);
        setDetail(null);
        setDetailLoading(false);
        setListError(getRequestError(error, '复核队列加载失败，请稍后重试。'));
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey, size, status]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    let cancelled = false;

    gradingReviewManageApi
      .detail(selectedId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setResult('maintained');
        setNote('');
      })
      .catch((error) => {
        if (cancelled) return;
        setDetail(null);
        setDetailError(getRequestError(error, '复核详情加载失败，请稍后重试。'));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadKey]);

  const refresh = () => {
    setListLoading(true);
    setListError('');
    setReloadKey((current) => current + 1);
  };

  const selectDetail = (id: string) => {
    if (id === selectedId) return;
    setDetailLoading(true);
    setDetailError('');
    setSelectedId(id);
  };

  const submitReview = async () => {
    if (!detail || detail.status !== 'pending') return;
    setSubmitting(true);
    setDetailError('');
    try {
      const updated = await gradingReviewManageApi.review(detail.id, {
        result,
        note: note.trim() || undefined,
      });
      setDetail(updated);
      showToast.success('复核结论已保存');
      refresh();
    } catch (error) {
      const message = getRequestError(
        error,
        '复核失败；记录可能已被处理或因新提交而过期。'
      );
      setDetailError(message);
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto min-w-0 max-w-7xl">
      <div className="mb-5 flex flex-col gap-4 border-4 border-black bg-purple-300 p-4 shadow-[5px_5px_0_0_#18181b] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-widest">Stage 3</p>
          <h1 className="text-2xl font-black sm:text-3xl">评分复核队列</h1>
          <p className="mt-1 text-sm font-medium">
            仅人工复核可以下调掌握度；过期提交只保留审计记录。
          </p>
        </div>
        <Button
          onClick={refresh}
          disabled={listLoading || detailLoading || submitting}
          leftIcon={<FiRefreshCw aria-hidden="true" />}
        >
          刷新
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-3 border-2 border-black bg-white p-4 sm:flex-row sm:items-end">
        <Field label="复核状态" htmlFor="grading-review-status" className="sm:w-52">
          <NativeSelect
            id="grading-review-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as GradingReviewStatus | '');
              setPage(1);
              setListLoading(true);
              setListError('');
            }}
            disabled={listLoading}
          >
            <option value="pending">待复核</option>
            <option value="reviewed">已复核</option>
            <option value="stale">已过期</option>
            <option value="">全部状态</option>
          </NativeSelect>
        </Field>
        <p className="text-sm font-bold text-zinc-600" aria-live="polite">
          共 {pagination.total} 条记录
        </p>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 border-2 border-black bg-zinc-50">
          <h2 className="border-b-2 border-black bg-yellow-300 px-4 py-3 text-lg font-black">
            队列
          </h2>
          {listLoading ? (
            <div className="grid gap-3 p-4" role="status" aria-label="正在加载复核队列">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse border-2 border-black bg-zinc-200 motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : listError ? (
            <div className="p-5 text-center">
              <FiAlertTriangle className="mx-auto size-8" aria-hidden="true" />
              <p className="mt-2 font-black">加载失败</p>
              <p className="mt-1 text-sm text-red-700">{listError}</p>
              <Button className="mt-4" onClick={refresh}>重试</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-black">当前筛选下没有复核记录</p>
              <p className="mt-1 text-sm text-zinc-600">切换状态后可查看历史记录。</p>
            </div>
          ) : (
            <div className="grid gap-3 p-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selectedId === item.id}
                  onClick={() => selectDetail(item.id)}
                  className={`min-w-0 border-2 border-black p-3 text-left transition-[transform,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
                    selectedId === item.id
                      ? 'translate-x-1 translate-y-1 bg-purple-100 shadow-none'
                      : 'bg-white shadow-[3px_3px_0_0_#18181b] hover:bg-yellow-50'
                  }`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="truncate font-black">
                      {item.user.nickname || item.user.email}
                    </span>
                    <span className={`border border-black px-2 py-0.5 text-xs font-black ${statusStyles[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                  </span>
                  <span className="mt-2 line-clamp-2 block text-sm font-medium">
                    {item.exerciseContent || '未命名题目'}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-zinc-600">
                    <span>AI {item.aiScore ?? '—'}</span>
                    <span>规则 {item.ruleScore ?? '—'}</span>
                    <span>版本 {item.answerVersion}</span>
                    {item.appealed ? <span className="text-red-700">用户已申诉</span> : null}
                  </span>
                  <span className="mt-2 block text-xs text-zinc-500">
                    {formatDate(item.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="border-t-2 border-black bg-white p-3">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={size}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                setListLoading(true);
                setListError('');
              }}
              onPageSizeChange={(nextSize) => {
                setSize(nextSize);
                setPage(1);
                setListLoading(true);
                setListError('');
              }}
              showPageNumbers={false}
              pageSizeOptions={[10, 20, 50]}
            />
          </div>
        </div>

        <div className="min-w-0 border-2 border-black bg-white">
          <h2 className="border-b-2 border-black bg-green-300 px-4 py-3 text-lg font-black">
            复核详情
          </h2>
          {detailLoading ? (
            <div className="p-5" role="status">
              <div className="h-72 animate-pulse border-2 border-black bg-zinc-200 motion-reduce:animate-none" />
              <span className="sr-only">正在加载复核详情</span>
            </div>
          ) : detailError && !detail ? (
            <div className="p-8 text-center">
              <p className="font-black">详情加载失败</p>
              <p className="mt-2 text-sm text-red-700">{detailError}</p>
              <Button className="mt-4" onClick={refresh}>重试</Button>
            </div>
          ) : !detail ? (
            <div className="p-8 text-center font-bold text-zinc-500">
              从左侧选择一条记录查看完整提交快照。
            </div>
          ) : (
            <div className="grid gap-5 p-4 sm:p-5">
              {detailError ? (
                <div role="alert" className="border-2 border-black bg-red-100 p-3 text-sm font-bold text-red-800">
                  {detailError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <span className={`border-2 border-black px-3 py-1 text-sm font-black ${statusStyles[detail.status]}`}>
                  {statusLabels[detail.status]}
                </span>
                <span className="font-mono text-xs text-zinc-600">ID: {detail.id}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailText label="用户">
                  {detail.user.nickname || detail.user.email}（{detail.user.email}）
                </DetailText>
                <DetailText label="小节">{detail.lessonTitle || '—'}</DetailText>
                <DetailText label="触发原因">{detail.triggerReason}</DetailText>
                <DetailText label="提交信息">
                  {detail.submissionType} · 答案版本 {detail.answerVersion} · 使用提示 {detail.hintLevelUsed} 级
                </DetailText>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ScoreValue label="AI 分数" value={detail.aiScore} />
                <ScoreValue label="规则分数" value={detail.ruleScore} />
              </div>

              {detail.appealReason ? (
                <div className="border-2 border-black bg-yellow-100 p-3">
                  <div className="text-sm font-black">用户申诉</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{detail.appealReason}</p>
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 font-black">题目</h3>
                <div className="max-h-48 overflow-auto border-2 border-black bg-zinc-50 p-3 text-sm">
                  {detail.exerciseContent}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-black">用户提交</h3>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words border-2 border-black bg-zinc-950 p-3 text-sm text-zinc-50">
                  {detail.submittedAnswer}
                </pre>
              </div>

              <details className="border-2 border-black bg-zinc-50 p-3">
                <summary className="cursor-pointer font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">
                  查看题目快照
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">
                  {JSON.stringify(detail.exerciseSnapshot, null, 2)}
                </pre>
              </details>

              {detail.status === 'pending' ? (
                <div className="grid gap-4 border-t-4 border-black pt-5">
                  <Field label="复核结论" htmlFor="grading-review-result" required>
                    <NativeSelect
                      id="grading-review-result"
                      value={result}
                      onChange={(event) => setResult(event.target.value as GradingReviewResult)}
                      disabled={submitting}
                    >
                      <option value="maintained">维持原判</option>
                      <option value="mastered">改判为已掌握</option>
                      <option value="not_mastered">改判为未掌握</option>
                    </NativeSelect>
                  </Field>
                  <Field
                    label="审核说明"
                    htmlFor="grading-review-note"
                    helperText="可选，建议说明改判依据；最多 2000 字。"
                  >
                    <Textarea
                      id="grading-review-note"
                      value={note}
                      maxLength={2000}
                      rows={4}
                      onChange={(event) => setNote(event.target.value)}
                      disabled={submitting}
                    />
                  </Field>
                  <Button
                    variant={result === 'not_mastered' ? 'danger' : 'success'}
                    loading={submitting}
                    loadingText="正在保存..."
                    onClick={() => void submitReview()}
                  >
                    保存复核结论
                  </Button>
                </div>
              ) : (
                <div className="border-t-4 border-black pt-5">
                  <h3 className="font-black">已保存的审核结论</h3>
                  <p className="mt-2 text-sm font-bold">
                    {detail.reviewedResult ? resultLabels[detail.reviewedResult] : statusLabels[detail.status]}
                  </p>
                  {detail.reviewNote ? <p className="mt-2 whitespace-pre-wrap text-sm">{detail.reviewNote}</p> : null}
                  {detail.reviewedAt ? (
                    <p className="mt-2 text-xs text-zinc-600">处理时间：{formatDate(detail.reviewedAt)}</p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
