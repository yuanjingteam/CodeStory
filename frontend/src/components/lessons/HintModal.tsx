'use client';

import type { HintConfig } from '@/types/exercise';
import { BsLightbulb } from 'react-icons/bs';

interface HintModalProps {
  hints: HintConfig | null;
  currentLevel: number;
  acquiredHints?: string[];
  onUseHint: (newLevel: number, hintContent: string) => void;
  onClose: () => void;
}

export default function HintModal({ 
  hints, 
  currentLevel,
  acquiredHints = [],
  onUseHint,
  onClose 
}: HintModalProps) {

  if (!hints) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-6 max-w-md w-full mx-4">
          <h3 className="text-xl font-bold mb-4">
            <BsLightbulb className="w-5 h-5 mr-1" /> 提示
          </h3>
          <p className="text-gray-600 mb-6">本题暂无提示</p>
          <button
            onClick={onClose}
            className="w-full py-1 bg-yellow-400 border-2 border-black font-bold shadow-[4px_4px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            确定
          </button>
        </div>
      </div>
    );
  }

  const { max_level, score_deduction } = hints._meta;
  const remainingHints = max_level - currentLevel;

  const handleGetHint = () => {
    if (currentLevel >= max_level) return;
    
    const nextLevel = currentLevel + 1;
    const hintKey = `level_${nextLevel}` as const;
    const hintContent = hints[hintKey];
    
    if (hintContent) {
      onUseHint(nextLevel, hintContent);
    }
  };

  const totalDeduction = score_deduction[currentLevel] || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BsLightbulb className="w-5 h-5" />
              <span>学习助手</span>
          </h3>
          <button 
            onClick={onClose}
            className="text-2xl font-bold hover:text-red-500"
          >
            ✕
          </button>
        </div>

        {acquiredHints.length > 0 && (
          <div className="mb-4 space-y-3">
            {acquiredHints.map((hint, index) => (
              <div 
                key={index}
                className={`p-3 border-1 border-black ${
                  index === acquiredHints.length - 1 
                    ? 'bg-yellow-50' 
                    : 'bg-gray-50'
                }`}
              >
                <div className="font-bold text-sm mb-1 flex items-center">
                  提示 {index + 1}
                </div>
                <p className="text-sm text-gray-700">{hint}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-purple-50 p-3 border-2 border-black mb-4">
          <div className="flex justify-between text-sm font-bold">
            <span>已使用提示：{currentLevel} / {max_level}</span>
            <span className="text-orange-600">
              将扣除 {totalDeduction} 分
            </span>
          </div>
        </div>

        {remainingHints > 0 ? (
          <button
            onClick={handleGetHint}
            className="w-full py-3 bg-green-500 text-white border-2 border-black font-bold shadow-[2px_2px_0_#000] hover:bg-green-600 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            👉 获取下一个提示 (剩余 {remainingHints} 次)
          </button>
        ) : currentLevel > 0 ? (
          <div className="text-center py-3 bg-yellow-50 border-2 border-black font-bold text-gray-700">
            ✅ 已获取所有提示 ({currentLevel}/{max_level})
          </div>
        ) : null}

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 bg-yellow-400 border-2 border-black font-bold shadow-[2px_2px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          关闭
        </button>
      </div>
    </div>
  );
}