'use client';

import { useState, useEffect } from 'react';
import type { HintConfig } from '@/types/exercise';
import { BsLightbulb } from 'react-icons/bs';
import { FiCheckCircle } from 'react-icons/fi';
import { exerciseApi } from '@/app/api/courses/exercise';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';

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
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      title={
        <span className="flex min-w-0 items-center gap-2">
          <BsLightbulb className="size-5" aria-hidden="true" />
          <span className="truncate">学习助手</span>
        </span>
      }
      closeLabel="关闭提示"
      bodyClassName="p-4"
      footer={
        <div className="w-full">
          {remainingHints > 0 ? (
            <Button
              variant="success"
              fullWidth
              onClick={handleGetHint}
              loading={loading}
              loadingText="获取中..."
            >
              获取下一个提示（剩余 {remainingHints} 次）
            </Button>
          ) : currentLevel > 0 ? (
            <div
              className="border-2 border-zinc-950 bg-yellow-50 p-3 text-center"
              role="status"
            >
              <div className="flex items-center justify-center gap-2 font-bold text-zinc-800">
                <FiCheckCircle className="size-5" aria-hidden="true" />
                已获取所有提示（{currentLevel}/{maxLevel}）
              </div>
              <p className="mt-1 text-sm font-bold leading-6 text-zinc-600">
                可以先尝试作答；如果仍然卡住，把你的当前思路发给右侧 AI 助手。
              </p>
            </div>
          ) : null}

          <Button onClick={onClose} fullWidth className="mt-3">
            关闭
          </Button>
        </div>
      }
    >
          {loadingHints ? (
            <div
              className="mb-4 grid gap-3 py-4"
              role="status"
              aria-label="正在加载提示"
            >
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse border-2 border-zinc-200 bg-zinc-100"
                />
              ))}
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

          <div className="mb-4 border-2 border-zinc-950 bg-yellow-50 p-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm font-bold">
              <span>已使用提示：{currentLevel} / {maxLevel}</span>
              <span className="text-orange-600">
                将扣除 {totalDeduction} 分
              </span>
            </div>
          </div>
    </Dialog>
  );
}
