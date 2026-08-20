import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GuidedLearningState } from '@/app/api/ai/chat';

interface GuidedPanelProps {
  state: GuidedLearningState;
  canAnswer: boolean;
  onAnswer: (answer: string) => void;
}

const CLOSING_NOTE: Partial<
  Record<GuidedLearningState['phase'], string>
> = {
  COMPLETE: '答对了，本轮引导完成。',
  REVIEW: '本轮引导已结束，可以重新开始一轮。',
  EMPTY: '当前小节暂无可作答的已审核题目，引导学习无法开始。',
  RESTART_REQUIRED: '引导流程已更新，需要重新开始一轮。',
};

function Section({
  label,
  tone,
  content,
}: {
  label: string;
  tone: string;
  content: string;
}) {
  return (
    <section className="border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
      <h3
        className={`border-b-2 border-black px-3 py-1 text-xs font-black ${tone}`}
      >
        {label}
      </h3>
      <div className="prose prose-sm max-w-none break-words bg-white px-3 py-2 prose-p:break-words prose-li:break-words prose-code:break-words prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:bg-gray-900 prose-pre:text-white">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </section>
  );
}

export default function GuidedPanel({
  state,
  canAnswer,
  onAnswer,
}: GuidedPanelProps) {
  const closingNote = CLOSING_NOTE[state.phase];
  const options = state.exerciseOptions || [];
  // 后端出题时已跳过坏题，这里兜的是修复前就存在的 checkpoint：它可能停在
  // 一道没有选项的选择题上，既没有作答按钮也没有输入框，学生无路可走。
  const optionsUnavailable =
    state.phase === 'WAIT_ANSWER' &&
    state.exerciseType === 'single_choice' &&
    options.length === 0;

  return (
    <div className="space-y-3">
      {state.explanation && (
        <Section
          label="讲解"
          tone="bg-purple-200 text-black"
          content={state.explanation}
        />
      )}

      {state.exerciseContent && (
        <Section
          label="本轮题目"
          tone="bg-yellow-300 text-black"
          content={state.exerciseContent}
        />
      )}

      {options.length > 0 && (
        <ul className="space-y-2">
          {options.map((option, index) => {
            const label = String.fromCharCode(65 + index);
            return (
              <li key={`${label}-${option}`}>
                <button
                  type="button"
                  onClick={() => onAnswer(label)}
                  disabled={!canAnswer}
                  className="flex w-full items-start gap-2 border-2 border-black bg-white px-3 py-2 text-left text-sm font-bold text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-white hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:bg-white"
                >
                  <span className="flex-shrink-0">{label}.</span>
                  <span className="min-w-0 break-words">
                    {option.replace(/^[A-Z]\.\s*/, '')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {optionsUnavailable && (
        <p className="border-2 border-dashed border-black bg-white px-3 py-2 text-xs font-bold text-gray-700">
          题目选项不可用，请重新开始一轮引导。
        </p>
      )}

      {state.hint && (
        <Section
          label={`提示 ${state.hintLevel}/3`}
          tone="bg-blue-200 text-black"
          content={state.hint}
        />
      )}

      {state.feedback && (
        <Section
          label={state.correct ? '批改：正确' : '批改'}
          tone={state.correct ? 'bg-green-200 text-black' : 'bg-red-200 text-black'}
          content={state.feedback}
        />
      )}

      {closingNote && (
        <p className="border-2 border-dashed border-black bg-white px-3 py-2 text-xs font-bold text-gray-700">
          {closingNote}
        </p>
      )}
    </div>
  );
}
