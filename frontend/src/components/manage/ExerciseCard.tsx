'use client';
import { FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { getExerciseTypeOptions } from '@/utils/exerciseType';
import type { ExerciseMetadata, HintConfig } from '@/types/lesson-manage';
import type { ExerciseItem } from '@/utils/exerciseHelpers';
import { getExerciseTypeIcon, getExerciseTypeLabel } from '@/utils/exerciseHelpers';
import ChoiceOptionsConfig from './ChoiceOptionsConfig';
import CodeTemplateConfig from './CodeTemplateConfig';
import HintsConfig from './HintsConfig';

interface ExerciseCardProps {
  exercise: ExerciseItem;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<ExerciseItem>) => void;
}

export default function ExerciseCard({ exercise, index, isExpanded, onToggleExpand, onDelete, onUpdate }: ExerciseCardProps) {
  const typeIcon = getExerciseTypeIcon(exercise.type);
  const typeLabel = getExerciseTypeLabel(exercise.type);
  const title = exercise.exerciseContent || exercise.answer || '未填写';

  return (
    <div className="border-2 border-black rounded-lg bg-white mb-2 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg">{typeIcon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-purple-600 truncate">
              题目 {index + 1}：{title.slice(0, 30)}{title.length > 30 ? '...' : ''}
            </div>
            <div className="text-xs text-gray-500">{typeLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1 px-2 py-1 text-red-500 text-sm hover:bg-red-50 rounded transition-colors"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
          {isExpanded ? <FiChevronUp className="w-5 h-5 text-gray-400" /> : <FiChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div>
            <label className="block text-sm font-bold mb-1">题型</label>
            <select
              value={exercise.type}
              onChange={e => onUpdate({ type: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">请选择题型</option>
              {getExerciseTypeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {exercise.type && (
            <div>
              <label className="block text-sm font-bold mb-1">题目描述</label>
              <textarea
                value={exercise.exerciseContent}
                onChange={e => onUpdate({ exerciseContent: e.target.value })}
                placeholder="请输入题目描述，例如：以下哪个是 Python 中定义变量的正确方式？"
                rows={2}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-1">答案</label>
            <textarea
              value={exercise.answer}
              onChange={e => onUpdate({ answer: e.target.value })}
              placeholder="输入正确答案"
              rows={2}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {exercise.type && (
            <>
              {exercise.type === 'single_choice' && (
                <ChoiceOptionsConfig
                  metadata={exercise.metadata as ExerciseMetadata}
                  onChange={(metadata, answer) => onUpdate({ metadata, answer })}
                />
              )}

              {exercise.type === 'code' && (
                <CodeTemplateConfig
                  metadata={exercise.metadata}
                  onChange={metadata => onUpdate({ metadata })}
                />
              )}

              <HintsConfig
                hints={exercise.hints}
                onChange={hints => onUpdate({ hints })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
