import type {
  LessonAnswerScope,
  LessonChatSourceReference,
  LessonEvidenceQuality,
} from '@/app/api/ai/chat';

const SCOPE_CONFIG: Record<
  LessonAnswerScope,
  { label: string; className: string }
> = {
  course: {
    label: '课程讲解',
    className: 'bg-purple-100 text-purple-900',
  },
  extended: {
    label: '含通用补充',
    className: 'bg-green-200 text-green-950',
  },
};

const QUALITY_LABELS: Record<LessonEvidenceQuality, string> = {
  strong: '课程证据充分',
  thin: '课程证据较少',
  empty: '暂无课程证据',
};

export function AnswerScopeBadge({
  scope,
  evidenceQuality,
}: {
  scope: LessonAnswerScope;
  evidenceQuality?: LessonEvidenceQuality;
}) {
  const config = SCOPE_CONFIG[scope];

  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${config.className}`}
      title={
        evidenceQuality
          ? QUALITY_LABELS[evidenceQuality]
          : undefined
      }
    >
      {config.label}
    </span>
  );
}

export function ChatSources({
  sources,
}: {
  sources: LessonChatSourceReference[];
}) {
  if (sources.length === 0) return null;

  return (
    <details className="mt-3 border-t-2 border-black pt-2 text-xs">
      <summary className="cursor-pointer font-black text-purple-800 outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">
        参考课程内容（{sources.length}）
      </summary>
      <ol className="mt-2 space-y-1.5">
        {sources.map((source) => (
          <li
            key={`${source.sourceType}:${source.sourceId}:${source.chunkIndex}`}
            className="flex gap-2 border-l-4 border-black bg-gray-100 px-2 py-1.5"
          >
            <span className="font-black">[{source.index}]</span>
            <span className="min-w-0 break-words">
              {source.title}
              {source.chunkIndex > 0
                ? ` · 片段 ${source.chunkIndex + 1}`
                : ''}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
