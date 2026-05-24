'use client';
import { useState, useEffect } from 'react';
import type { ExerciseDetailData } from '@/types/exercise';
import HintModal from './HintModal';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';

interface CodeQuestionProps {
  exercise: ExerciseDetailData;
  onSubmit: (answer: string) => void;
  onHintUsed?: (level: number) => void;
}

export default function CodeQuestion({ exercise, onSubmit, onHintUsed }: CodeQuestionProps) {
  const [userCode, setUserCode] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintLevelUsed, setHintLevelUsed] = useState(0);

  useEffect(() => {
    const code = (exercise.metadata as any)?.codeTemplate || '';
    setUserCode(code);
  }, [exercise]);

  const handleSubmit = () => {
    onSubmit(userCode);
  };

  const handleUseHint = (newLevel: number) => {
    setHintLevelUsed(newLevel);
    onHintUsed?.(newLevel);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请编写代码：</div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="py-2 px-4 bg-purple-500 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            {isCollapsed ? (
              <>
                <span>▶</span>
                <span>展开代码块</span>
              </>
            ) : (
              <>
                <span>▼</span>
                <span>收起代码块</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowHintModal(true)}
            disabled={!exercise.hints || hintLevelUsed >= exercise.hints?._meta.max_level}
            className={`
              py-2 px-4 font-bold border-4 border-black
              shadow-[4px_4px_0_0_rgba(0,0,0,1)]
              hover:translate-x-[2px] hover:translate-y-[2px]
              hover:shadow-none transition-all
              ${exercise.hints && hintLevelUsed < exercise.hints._meta.max_level
                ? 'bg-yellow-400 text-black cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            💡 提示 {exercise.hints ? `(${exercise.hints._meta.max_level - hintLevelUsed})` : ''}
          </button>
        </div>
      </div>

      <div className={`border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden transition-all duration-300 ${
        isCollapsed ? 'h-[180px]' : 'flex-1 min-h-0'
      }`}>
        <CodeMirror
          value={userCode}
          onChange={setUserCode}
          height="100%"
          theme="dark"
          extensions={[
            python(),
            EditorView.lineWrapping
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {showHintModal && (
        <HintModal
          hints={exercise.hints || null}
          currentLevel={hintLevelUsed}
          onUseHint={handleUseHint}
          onClose={() => setShowHintModal(false)}
        />
      )}
    </div>
  );
}