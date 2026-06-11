'use client';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import type { HintsValue, HintConfig } from '@/types/lesson-manage';

const MAX_HINT_LEVELS = 3;

interface HintsConfigProps {
  hints: HintsValue;
  onChange: (hints: HintConfig) => void;
}

export default function HintsConfig({ hints, onChange }: HintsConfigProps) {
  const hintConfig = (typeof hints === 'object' && hints !== null) ? hints as HintConfig : null;

  const hintLevels: Array<{ level: number; content: string }> = [];
  if (hintConfig) {
    Object.keys(hintConfig)
      .filter(k => k.startsWith('level_'))
      .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]))
      .forEach(key => {
        const levelNum = Number(key.split('_')[1]);
        hintLevels.push({ level: levelNum, content: hintConfig[key as `level_${number}`] || '' });
      });
  }

  const handleHintChange = (level: number, content: string) => {
    const prevHints = hintConfig || {} as HintConfig;
    const updated: HintConfig = { ...prevHints, [`level_${level}`]: content } as HintConfig;
    onChange(updated);
  };

  const handleRemoveHint = (level: number) => {
    if (!hintConfig) return;
    const updated: Record<string, string> = {};
    Object.keys(hintConfig).filter(k => k.startsWith('level_')).forEach(k => {
      if (k !== `level_${level}`) {
        updated[k] = hintConfig[k as `level_${number}`];
      }
    });
    const reindexed: HintConfig = {} as HintConfig;
    Object.keys(updated).sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1])).forEach((key, i) => {
      reindexed[`level_${i + 1}`] = updated[key];
    });
    onChange({ ...reindexed, _meta: { max_level: Object.keys(reindexed).length } });
  };

  const handleAddHint = () => {
    const prevHints = hintConfig || {} as HintConfig;
    const existingLevels = Object.keys(prevHints).filter(k => k.startsWith('level_')).length;
    if (existingLevels >= MAX_HINT_LEVELS) return;

    const newLevel = existingLevels + 1;
    const updated: HintConfig = { ...prevHints, [`level_${newLevel}`]: '' } as HintConfig;
    onChange({ ...updated, _meta: { max_level: newLevel } });
  };

  return (
    <div className="border-2 border-dashed border-yellow-300 p-3 rounded-lg bg-yellow-50">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-bold">💡 提示配置</label>
        <span className="text-xs font-bold text-yellow-700">
          {hintLevels.length}/{MAX_HINT_LEVELS}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2">最多配置三级提示，学生可逐级获取帮助（每级提示会扣分）</p>
      <div className="space-y-2">
        {hintLevels.length > 0 ? hintLevels.map((hint) => (
          <div key={hint.level} className="flex items-start gap-2">
            <span className="text-xs font-bold text-yellow-700 bg-yellow-200 px-2 py-1.5 rounded flex-shrink-0">
              第 {hint.level} 级
            </span>
            <textarea
              value={hint.content}
              onChange={e => {
                handleHintChange(hint.level, e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }}
              placeholder={`输入第 ${hint.level} 级提示内容`}
              rows={1}
              className="flex-1 px-2 py-1.5 border-2 border-black focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm resize-none overflow-hidden"
            />
            {hintLevels.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveHint(hint.level)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors mt-0.5"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )) : (
          <p className="text-gray-400 text-xs text-center py-2">暂无提示，点击下方按钮添加</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleAddHint}
        disabled={hintLevels.length >= MAX_HINT_LEVELS}
        className="mt-2 flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-700 hover:bg-yellow-100 border-2 border-yellow-300 rounded transition-colors disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
      >
        <FiPlus className="w-3.5 h-3.5" />
        {hintLevels.length >= MAX_HINT_LEVELS ? '已达到三级上限' : '添加下一级提示'}
      </button>
    </div>
  );
}
