'use client';
import type { ExerciseMetadata } from '@/types/lesson-manage';

interface ChoiceOptionsConfigProps {
  metadata: ExerciseMetadata | null;
  answer: string;
  onChange: (metadata: ExerciseMetadata, answer: string) => void;
}

// 正确答案只认题目自身的 answer 字段。此前这里另写一个 metadata.correctAnswer，
// 后端没有任何读取方，两者一旦漂移就会产出「答案为空但选项齐全」的坏题。
export default function ChoiceOptionsConfig({ metadata, answer, onChange }: ChoiceOptionsConfigProps) {
  const options = (metadata && Array.isArray(metadata.options)) ? metadata.options : ['', '', '', ''];

  const updateOptions = (newOpts: string[], newAnswer: string) => {
    onChange({ options: newOpts }, newAnswer);
  };

  const handleSelectCorrect = (optIdx: number) => {
    updateOptions([...options], options[optIdx] || '');
  };

  const handleOptionChange = (optIdx: number, value: string) => {
    const newOpts = [...options];
    newOpts[optIdx] = value;
    updateOptions(newOpts, newOpts.includes(answer) ? answer : '');
  };

  return (
    <div className="border-2 border-dashed border-blue-300 p-3 rounded-lg bg-blue-50">
      <label className="block text-sm font-bold mb-2">📋 选项配置</label>
      <p className="text-xs text-gray-500 mb-2">
        {'点击 ○ 标记正确答案（答案会自动填入上方答案框）'}
      </p>
      <div className="space-y-2">
        {options.map((option: string, optIdx: number) => {
          const isCorrect = answer === option && option !== '';
          return (
            <div key={optIdx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectCorrect(optIdx)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                  isCorrect
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-400 hover:border-green-400'
                }`}
                title={isCorrect ? '正确答案' : '标记为正确答案'}
              >
                {isCorrect && (
                  <svg className="w-3 h-3 text-white mx-auto" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <span className="text-xs font-bold text-gray-500 w-5">{String.fromCharCode(65 + optIdx)}</span>
              <input
                type="text"
                value={option}
                onChange={e => handleOptionChange(optIdx, e.target.value)}
                placeholder={`选项 ${String.fromCharCode(65 + optIdx)} 内容`}
                className="flex-1 px-2 py-1.5 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
