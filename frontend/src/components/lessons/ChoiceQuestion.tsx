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
  isSubmitting?: boolean;
}

const ChoiceQuestion = forwardRef<ChoiceQuestionHandle, ChoiceQuestionProps>(
  ({ exercise, onSubmit, onHintUsed, isSubmitting = false }, ref) => {
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
    <fieldset className="space-y-2" disabled={alreadyCorrect || isSubmitting}>
      <legend className="mb-3 text-lg font-bold">请选择正确答案：</legend>
      <div className="mb-4 flex items-center justify-end gap-2">
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
            type="button"
            onClick={() => setShowHintModal(true)}
            disabled={alreadyCorrect || isSubmitting}
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

      {options.map((option: string, index: number) => {
        const optionLabel = String.fromCharCode(65 + index);
        const isSelected = selectedOption === optionLabel;

        return (
          <label
            key={`${optionLabel}-${option}`}
            className={`block rounded-md border-4 border-black px-4 py-3 font-bold transition-transform focus-within:ring-4 focus-within:ring-purple-600 ${
              isSelected
                ? 'bg-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]'
                : 'cursor-pointer bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-gray-100 hover:translate-x-[2px] hover:translate-y-[2px]'
            } ${isSubmitting || alreadyCorrect ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <input type="radio" name={`exercise-${exercise.id}`} value={optionLabel} checked={isSelected} onChange={() => handleSelect(optionLabel)} className="sr-only" />
            <span className="mr-2">{optionLabel}.</span>
            <span>{option.replace(/^[A-D]\.\s*/, '')}</span>
          </label>
        );
      })}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!selectedOption || alreadyCorrect || isSubmitting}
        className={`w-full py-3 font-bold border-4 border-black rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-lg mt-4 ${
          selectedOption && !alreadyCorrect && !isSubmitting
            ? 'bg-green-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {alreadyCorrect ? '已完成' : isSubmitting ? '提交中...' : '提交答案'}
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
    </fieldset>
  );
});

ChoiceQuestion.displayName = 'ChoiceQuestion';

export default ChoiceQuestion;
