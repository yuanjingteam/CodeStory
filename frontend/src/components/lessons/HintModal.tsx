'use client';

import { useState, useEffect } from 'react';
import type { HintConfig } from '@/types/exercise';
import { BsLightbulb } from 'react-icons/bs';
import { exerciseApi } from '@/app/api/courses/exercise';

interface HintModalProps {
  exerciseId: string;
  hints: HintConfig | null;
  currentLevel: number;
  onUseHint: (newLevel: number, hintContent: string) => void;
  onClose: () => void;
}

export default function HintModal({ 
  exerciseId,
  hints, 
  currentLevel,
  onUseHint,
  onClose 
}: HintModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingHints, setLoadingHints] = useState(true);
  const [acquiredHints, setAcquiredHints] = useState<Array<{ level: number; content: string }>>([]);
  const maxLevel = hints?._meta.max_level || 3;

  useEffect(() => {
    const fetchAcquiredHints = async () => {
      if (!exerciseId) {
        setLoadingHints(false);
        return;
      }

      try {
        const result = await exerciseApi.getAcquiredHints(exerciseId);
        if (result && result.hints) {
          setAcquiredHints(result.hints);
        }
      } catch (error) {
        console.error('获取已使用的提示失败:', error);
      } finally {
        setLoadingHints(false);
      }
    };

    fetchAcquiredHints();
  }, [exerciseId]);

  const SCORE_DEDUCTION = [0, 10, 20, 30];
  const remainingHints = maxLevel - currentLevel;

  const handleGetHint = async () => {
    if (currentLevel >= maxLevel || loading) return;

    setLoading(true);
    
    try {
      const nextLevel = currentLevel + 1;
      const result = await exerciseApi.getHint(exerciseId, nextLevel);
      
      if (result && result.content) {
        setAcquiredHints(prev => [...prev, { level: result.level, content: result.content }]);
        onUseHint(nextLevel, result.content);
      }
    } catch (error) {
      console.error('获取提示失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalDeduction = SCORE_DEDUCTION[currentLevel] || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
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

        <div className="px-6 overflow-y-auto flex-1 min-h-0">
          {loadingHints ? (
            <div className="mb-4 text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : acquiredHints.length > 0 ? (
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
                    提示 {hint.level}
                  </div>
                  <p className="text-sm text-gray-700">{hint.content}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="bg-purple-50 p-3 border-2 border-black mb-4">
            <div className="flex justify-between text-sm font-bold">
              <span>已使用提示：{currentLevel} / {maxLevel}</span>
              <span className="text-orange-600">
                将扣除 {totalDeduction} 分
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 flex-shrink-0 border-t-2 border-gray-100">
          {remainingHints > 0 ? (
            <button
              onClick={handleGetHint}
              disabled={loading}
              className={`w-full py-3 bg-green-500 text-white border-2 border-black font-bold shadow-[2px_2px_0_#000] hover:bg-green-600 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>⏳ 获取中...</>
              ) : (
                <>👉 获取下一个提示 (剩余 {remainingHints} 次)</>
              )}
            </button>
          ) : currentLevel > 0 ? (
            <div className="text-center py-3 bg-yellow-50 border-2 border-black font-bold text-gray-700">
              ✅ 已获取所有提示 ({currentLevel}/{maxLevel})
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
    </div>
  );
}
