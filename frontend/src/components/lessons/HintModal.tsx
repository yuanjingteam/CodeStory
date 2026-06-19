'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg min-w-0 flex-col overflow-hidden border-2 border-black bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b-2 border-black bg-white p-4">
          <h3 className="flex min-w-0 items-center gap-2 text-xl font-bold">
            <BsLightbulb className="w-5 h-5" />
            <span className="truncate">学习助手</span>
          </h3>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-black text-2xl font-bold leading-none hover:bg-red-50 hover:text-red-500"
            aria-label="关闭提示"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                  className={`min-w-0 overflow-hidden border border-black p-3 ${
                    index === acquiredHints.length - 1 
                      ? 'bg-yellow-50' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="font-bold text-sm mb-1 flex items-center">
                    提示 {hint.level}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                    {hint.content}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mb-4 border-2 border-black bg-purple-50 p-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm font-bold">
              <span>已使用提示：{currentLevel} / {maxLevel}</span>
              <span className="text-orange-600">
                将扣除 {totalDeduction} 分
              </span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t-2 border-black bg-white p-4">
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

  if (typeof document === 'undefined') return null;

  return createPortal(modal, document.body);
}
