'use client';

import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import type { ManagedExercise } from '@/types/exercise-manage';

interface ExerciseTraceDialogProps {
  exercise: ManagedExercise | null;
  onClose: () => void;
}

function YesNo({ value }: { value: boolean | undefined }) {
  return (
    <span
      className={`border-2 border-zinc-950 px-2 py-1 text-xs font-black ${
        value ? 'bg-green-300' : 'bg-zinc-200'
      }`}
    >
      {value ? '是' : '否'}
    </span>
  );
}

export default function ExerciseTraceDialog({
  exercise,
  onClose,
}: ExerciseTraceDialogProps) {
  const metadata = exercise?.genMetadata;
  const duplicate = metadata?.duplicateCheck;
  const selfCheck = metadata?.selfCheck;

  return (
    <Dialog
      open={Boolean(exercise)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="AI 生成溯源"
      description="仅展示可复现参数、检索来源与自检结果，不保存密钥或完整提示词。"
      size="lg"
      footer={<Button onClick={onClose}>关闭</Button>}
    >
      {exercise && metadata ? (
        <div className="grid gap-5 text-sm">
          <dl className="grid gap-3 border-2 border-zinc-950 bg-yellow-50 p-4 sm:grid-cols-2">
            <div>
              <dt className="font-black">Trace ID</dt>
              <dd className="mt-1 break-all font-mono">{metadata.traceId || '-'}</dd>
            </div>
            <div>
              <dt className="font-black">模型</dt>
              <dd className="mt-1 break-all font-mono">{metadata.model || '-'}</dd>
            </div>
            <div>
              <dt className="font-black">Prompt 版本</dt>
              <dd className="mt-1 font-mono">{metadata.promptVersion || '-'}</dd>
            </div>
            <div>
              <dt className="font-black">生成时间</dt>
              <dd className="mt-1">
                {metadata.generatedAt
                  ? new Date(metadata.generatedAt).toLocaleString('zh-CN')
                  : '-'}
              </dd>
            </div>
          </dl>

          <section>
            <h3 className="text-base font-black">结构与答案自检</h3>
            <div className="mt-2 flex flex-wrap gap-3">
              <span className="flex items-center gap-2 font-bold">
                格式 <YesNo value={selfCheck?.formatValid} />
              </span>
              <span className="flex items-center gap-2 font-bold">
                答案存在 <YesNo value={selfCheck?.answerExists} />
              </span>
              <span className="flex items-center gap-2 font-bold">
                难度匹配 <YesNo value={selfCheck?.difficultyMatch} />
              </span>
            </div>
            {selfCheck?.notes?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-700">
                {selfCheck.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section>
            <h3 className="text-base font-black">重复初筛</h3>
            <div
              className={`mt-2 border-2 border-zinc-950 p-3 font-bold ${
                duplicate?.matched ? 'bg-red-100' : 'bg-green-100'
              }`}
            >
              {duplicate?.matched
                ? `疑似与题目 ${duplicate.exerciseId || '-'} 重复，相似度 ${Math.round(
                    (duplicate.similarity || 0) * 100
                  )}%（需人工确认）`
                : '未命中 0.92 机器初筛阈值。'}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-black">检索来源</h3>
              {metadata.retrieval?.fallback ? (
                <span className="border-2 border-zinc-950 bg-orange-200 px-2 py-1 text-xs font-black">
                  使用正文降级
                </span>
              ) : null}
            </div>
            <div className="mt-2 grid gap-3">
              {metadata.retrieval?.sources?.length ? (
                metadata.retrieval.sources.map((source, index) => (
                  <article
                    key={`${source.sourceId}-${source.chunkIndex}-${index}`}
                    className="border-2 border-zinc-300 p-3"
                  >
                    <p className="break-all font-mono text-xs font-bold">
                      {source.sourceType}:{source.sourceId} · chunk{' '}
                      {source.chunkIndex ?? '-'} · score{' '}
                      {typeof source.score === 'number'
                        ? source.score.toFixed(3)
                        : '-'}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap leading-6 text-zinc-700">
                      {source.excerpt || '无摘要'}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-zinc-500">无检索来源记录。</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <p className="text-zinc-600">该题不是 AI 生成题，无生成溯源。</p>
      )}
    </Dialog>
  );
}
