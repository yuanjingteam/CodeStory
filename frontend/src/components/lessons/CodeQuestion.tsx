'use client';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { CodeMetadata, ExerciseDetailData } from '@/types/exercise';
import HintModal from './HintModal';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { BsLightbulb } from 'react-icons/bs';
import { useExerciseDraft } from '@/hooks/useExerciseDraft';

export interface CodeQuestionHandle {
  getCode: () => string;
}

interface CodeQuestionProps {
  exercise: ExerciseDetailData;
  onSubmit: (answer: string) => Promise<boolean>;
  onHintUsed?: (level: number) => void;
}

const CodeQuestion = forwardRef<CodeQuestionHandle, CodeQuestionProps>(
  ({ exercise, onSubmit, onHintUsed }, ref) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintLevelUsed, setHintLevelUsed] = useState(0);
  const alreadyCorrect = (exercise.userAnswer?.score ?? 0) > 0;
  const initialCode =
    exercise.userAnswer?.answer ||
    (exercise.metadata as CodeMetadata).codeTemplate ||
    '';
  const {
    value: userCode,
    setValue: setUserCode,
    clearDraft,
    status: draftStatus,
  } = useExerciseDraft({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    initialValue: initialCode,
    disabled: alreadyCorrect,
  });

  useEffect(() => {
    if (exercise.userAnswer?.hint_level_used !== undefined) {
      setHintLevelUsed(exercise.userAnswer.hint_level_used);
    }
  }, [exercise.userAnswer?.hint_level_used]);

  useImperativeHandle(ref, () => ({
    getCode: () => userCode,
  }), [userCode]);

  const handleSubmit = async () => {
    const correct = await onSubmit(userCode);
    if (correct) {
      clearDraft();
    }
  };

  const handleUseHint = (newLevel: number, hintContent: string) => {
    setHintLevelUsed(newLevel);
    onHintUsed?.(newLevel);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请编写代码：</div>
        <div className="flex items-center gap-2">
          {!alreadyCorrect && (
            <span
              className={`text-xs font-bold ${
                draftStatus === 'error' ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {draftStatus === 'error'
                ? '草稿保存失败'
                : draftStatus === 'saved'
                  ? '草稿已保存到本机'
                  : ''}
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="py-2 px-4 bg-purple-500 rounded-lg text-white font-bold border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
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
            disabled={!exercise.hints || alreadyCorrect}
            className={`
              py-2 px-4 font-bold border-2 border-black rounded-lg
              shadow-[2px_2px_0_0_rgba(0,0,0,1)]
              hover:translate-x-[2px] hover:translate-y-[2px]
              hover:shadow-none transition-all
              flex items-center justify-center
              ${exercise.hints && !alreadyCorrect
                ? 'bg-yellow-400 text-black cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <BsLightbulb className="w-5 h-5 mr-1" />
            {!exercise.hints ? '提示' : hintLevelUsed >= exercise.hints._meta.max_level ? '查看提示' : `提示 (${exercise.hints._meta.max_level - hintLevelUsed})`}
          </button>
        </div>
      </div>

      <div className={`border-4 border-black rounded-xl shadow-[2px_2px_0_0_rgba(0,0,0,1)] overflow-hidden transition-all duration-300 ${
        isCollapsed ? 'h-[240px]' : 'flex-1 min-h-0'
      }`}>
        <style>{`
          .cm-editor .cm-content {
            font-size: 16px;
          }
        `}</style>
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

      <button
        onClick={() => void handleSubmit()}
        disabled={!userCode.trim() || alreadyCorrect}
        className={`w-full py-3 font-bold border-4 border-black rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-lg mt-4 ${
          userCode.trim() && !alreadyCorrect
            ? 'bg-green-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {alreadyCorrect ? '已完成' : '运行代码'}
      </button>

      {showHintModal && (
        <HintModal
          exerciseId={exercise.id}
          hints={exercise.hints || null}
          currentLevel={hintLevelUsed}
          onUseHint={handleUseHint}
          onClose={() => setShowHintModal(false)}
        />
      )}
    </div>
  );
});

CodeQuestion.displayName = 'CodeQuestion';

export default CodeQuestion;
