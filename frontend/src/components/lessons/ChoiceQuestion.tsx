'use client';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { ChoiceMetadata, ExerciseDetailData } from '@/types/exercise';
import HintModal from './HintModal';
import { BsLightbulb } from 'react-icons/bs';
import { useExerciseDraft } from '@/hooks/useExerciseDraft';

export interface ChoiceQuestionHandle {
  getSelectedAnswer: () => string | null;
}

interface ChoiceQuestionProps {
  exercise: ExerciseDetailData;
  onSubmit: (answer: string) => Promise<boolean>;
  onHintUsed?: (level: number) => void;
}

const ChoiceQuestion = forwardRef<ChoiceQuestionHandle, ChoiceQuestionProps>(
  ({ exercise, onSubmit, onHintUsed }, ref) => {
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintLevelUsed, setHintLevelUsed] = useState(0);
  const alreadyCorrect = (exercise.userAnswer?.score ?? 0) > 0;
  const {
    value: selectedOptionValue,
    setValue: setSelectedOption,
    clearDraft,
    status: draftStatus,
  } = useExerciseDraft({
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    initialValue: exercise.userAnswer?.answer || '',
    disabled: alreadyCorrect,
  });
  const selectedOption = selectedOptionValue || null;

  useEffect(() => {
    if (exercise.userAnswer?.hint_level_used !== undefined) {
      setHintLevelUsed(exercise.userAnswer.hint_level_used);
    }
  }, [exercise.userAnswer?.hint_level_used]);

  useImperativeHandle(ref, () => ({
    getSelectedAnswer: () => selectedOption,
  }), [selectedOption]);

  const options = (exercise.metadata as ChoiceMetadata | null)?.options || [];
  const maxHintLevel = exercise.hints?._meta.max_level || 3;
  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleSubmit = async () => {
    if (selectedOption) {
      const correct = await onSubmit(selectedOption);
      if (correct) {
        clearDraft();
      }
    }
  };

  const handleUseHint = (newLevel: number) => {
    setHintLevelUsed(newLevel);
    onHintUsed?.(newLevel);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请选择正确答案：</div>
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
            onClick={() => setShowHintModal(true)}
            disabled={alreadyCorrect}
            className={`
              py-2 px-4 font-bold border-2 border-black rounded-md
              shadow-[2px_2px_0_0_rgba(0,0,0,1)]
              hover:translate-x-[2px] hover:translate-y-[2px]
              hover:shadow-none transition-all
              flex items-center justify-center
              ${!alreadyCorrect
                ? 'bg-yellow-400 text-black cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <BsLightbulb className="w-5 h-5 mr-1" />
            {hintLevelUsed >= maxHintLevel ? '查看提示' : `提示 (${maxHintLevel - hintLevelUsed})`}
          </button>
        </div>
      </div>

      {options.map((option: string, index: number) => {
        const optionLabel = String.fromCharCode(65 + index);
        const isSelected = selectedOption === optionLabel;

        return (
          <div
            key={index}
            onClick={() => handleSelect(optionLabel)}
            className={`py-3 px-4 border-4 border-black cursor-pointer rounded-md transition-all font-bold ${
              isSelected
                ? 'bg-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]'
                : 'bg-white hover:bg-gray-100 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]'
            }`}
          >
            <span className="mr-2">{optionLabel}.</span>
            <span>{option.replace(/^[A-D]\.\s*/, '')}</span>
          </div>
        );
      })}

      <button
        onClick={() => void handleSubmit()}
        disabled={!selectedOption || alreadyCorrect}
        className={`w-full py-3 font-bold border-4 border-black rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-lg mt-4 ${
          selectedOption && !alreadyCorrect
            ? 'bg-green-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {alreadyCorrect ? '已完成' : '提交答案'}
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

ChoiceQuestion.displayName = 'ChoiceQuestion';

export default ChoiceQuestion;
