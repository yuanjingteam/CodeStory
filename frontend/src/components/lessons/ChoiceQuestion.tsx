'use client';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { ExerciseDetailData } from '@/types/exercise';
import HintModal from './HintModal';
import { BsLightbulb } from 'react-icons/bs';

export interface ChoiceQuestionHandle {
  getSelectedAnswer: () => string | null;
}

interface ChoiceQuestionProps {
  exercise: ExerciseDetailData;
  onSubmit: (answer: string) => void;
  onHintUsed?: (level: number) => void;
}

const ChoiceQuestion = forwardRef<ChoiceQuestionHandle, ChoiceQuestionProps>(
  ({ exercise, onSubmit, onHintUsed }, ref) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintLevelUsed, setHintLevelUsed] = useState(0);

  useEffect(() => {
    if (exercise.userAnswer?.hint_level_used !== undefined) {
      setHintLevelUsed(exercise.userAnswer.hint_level_used);
    }
  }, [exercise.userAnswer?.hint_level_used]);

  useImperativeHandle(ref, () => ({
    getSelectedAnswer: () => selectedOption,
  }), [selectedOption]);

  const options = (exercise.metadata as any)?.options || [];
  const alreadyCorrect = (exercise.userAnswer?.score ?? 0) > 0;

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (selectedOption) {
      onSubmit(selectedOption);
    }
  };

  const handleUseHint = (newLevel: number, hintContent: string) => {
    setHintLevelUsed(newLevel);
    onHintUsed?.(newLevel);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请选择正确答案：</div>
        <button
          onClick={() => setShowHintModal(true)}
          disabled={!exercise.hints || alreadyCorrect}
          className={`
            py-2 px-4 font-bold border-2 border-black rounded-md
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
        onClick={handleSubmit}
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

export default ChoiceQuestion;
