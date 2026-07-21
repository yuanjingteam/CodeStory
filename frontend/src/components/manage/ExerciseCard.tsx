'use client';
import { useState } from 'react';
import { FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { getExerciseTypeOptions } from '@/utils/exerciseType';
import type { ExerciseMetadata } from '@/types/lesson-manage';
import type { ExerciseItem } from '@/utils/exerciseHelpers';
import { getExerciseTypeIcon, getExerciseTypeLabel } from '@/utils/exerciseHelpers';
import { validateExercise } from '@/utils/exerciseValidation';
import ChoiceOptionsConfig from './ChoiceOptionsConfig';
import CodeTemplateConfig from './CodeTemplateConfig';
import HintsConfig from './HintsConfig';

interface ExerciseCardProps {
  exercise: ExerciseItem;
  index: number;
  isExpanded: boolean;
  isConfigured: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<ExerciseItem>) => void;
  onComplete: () => void;
}

export default function ExerciseCard({
  exercise,
  index,
  isExpanded,
  isConfigured,
  onToggleExpand,
  onDelete,
  onUpdate,
  onComplete,
}: ExerciseCardProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const typeIcon = getExerciseTypeIcon(exercise.type);
  const typeLabel = getExerciseTypeLabel(exercise.type);
  const title = exercise.exerciseContent || exercise.answer || '未填写';

  const handleComplete = () => {
    const errors = validateExercise(exercise);
    setValidationErrors(errors);
    if (errors.length === 0) {
      onComplete();
    }
  };

  const handleUpdate = (updates: Partial<ExerciseItem>) => {
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    onUpdate(updates);
  };

  return (
    <div className="border-2 border-black rounded-lg bg-white mb-2 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg">{typeIcon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-black truncate">
              题目 {index + 1}：{title.slice(0, 30)}{title.length > 30 ? '...' : ''}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-gray-500">{typeLabel}</span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                isConfigured
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {isConfigured ? '已配置' : '配置中'}
              </span>
            </div>
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
              onChange={e => handleUpdate({ type: e.target.value })}
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
                onChange={e => handleUpdate({ exerciseContent: e.target.value })}
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
              onChange={e => handleUpdate({ answer: e.target.value })}
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
                  onChange={(metadata, answer) => handleUpdate({ metadata, answer })}
                />
              )}

              {exercise.type === 'code' && (
                <CodeTemplateConfig
                  metadata={exercise.metadata}
                  onChange={metadata => handleUpdate({ metadata })}
                />
              )}

              <HintsConfig
                hints={exercise.hints}
                onChange={hints => handleUpdate({ hints })}
              />
            </>
          )}

          {validationErrors.length > 0 && (
            <div className="border-2 border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {validationErrors.map(error => (
                <div key={error}>• {error}</div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleComplete}
              className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold border-2 border-black rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              完成配置
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
