'use client'
import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import { exerciseApi } from '@/app/api/courses/exercise'
import type { ExerciseDetailData } from '@/types/exercise'
import ChoiceQuestion, { ChoiceQuestionHandle } from './ChoiceQuestion'
import CodeQuestion, { CodeQuestionHandle } from './CodeQuestion'
import MarkdownContent from './MarkdownContent'

interface ExerciseModalProps {
  isOpen: boolean
  exerciseId: string | null
  onClose: () => void
  onComplete: (exerciseId: string) => void
}

export default function ExerciseModal({ isOpen, exerciseId, onClose, onComplete }: ExerciseModalProps) {
  const [exerciseData, setExerciseData] = useState<ExerciseDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ correct: boolean; score: number; feedback: string } | null>(null)
  const [currentHintLevelUsed, setCurrentHintLevelUsed] = useState(0)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (isOpen && exerciseId) {
      setLoading(true)
      setSubmitResult(null)
      setShowResult(false)
      setCurrentHintLevelUsed(0)
      exerciseApi.getDetail(exerciseId)
        .then(response => {
          setExerciseData(response)
        })
        .catch(error => {
          console.error('获取题目详情失败:', error)
          setExerciseData(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setExerciseData(null)
      setSubmitResult(null)
      setShowResult(false)
    }
  }, [isOpen, exerciseId])

  const handleSubmit = async (answer: string) => {
    if (!exerciseData?.id) return

    try {
      const response = await exerciseApi.submit(exerciseData.id, answer, currentHintLevelUsed)
      setSubmitResult({
        correct: response.correct,
        score: response.score,
        feedback: response.feedback,
      })
      setShowResult(true)

      if (response.correct) {
        onComplete(exerciseData.id)
      }
    } catch (error) {
      console.error('提交答案失败:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (window.getSelection()?.toString()) return
        onClose()
      }}
    >
      <div
        className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black flex-shrink-0 bg-purple-600 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h2 className="text-lg font-bold">练习题</h2>
            {exerciseData && (
              <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
                {exerciseData.type === 'single_choice' ? '选择题' : exerciseData.type === 'code' ? '编程题' : '填空题'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-white hover:bg-white/20 rounded transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 font-bold text-gray-500">加载中...</span>
            </div>
          ) : !exerciseData ? (
            <div className="text-center py-12 text-gray-500 font-bold">题目加载失败</div>
          ) : showResult && submitResult ? (
            <div className="text-center py-8">
              {submitResult.correct ? (
                <div className="text-6xl mb-4">🎉</div>
              ) : (
                <div className="text-6xl mb-4">💪</div>
              )}
              <h3 className="text-2xl font-black mb-2">
                {submitResult.correct ? '恭喜你答对了！' : '要继续加油哦！'}
              </h3>
              <div className="border-2 border-black bg-gray-100 p-4 my-4">
                <div className="text-4xl font-black text-purple-600 mb-2">
                  {submitResult.score}分
                </div>
                <p className="text-gray-700 text-sm">{submitResult.feedback}</p>
              </div>
              <div className="flex gap-3 justify-center mt-6">
                {!submitResult.correct && (
                  <button
                    onClick={() => { setShowResult(false); setSubmitResult(null) }}
                    className="px-6 py-3 bg-yellow-400 text-black font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    重新作答
                  </button>
                )}
                <button
                  onClick={submitResult.correct ? onClose : () => { setShowResult(false); setSubmitResult(null) }}
                  className="px-6 py-3 bg-green-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  {submitResult.correct ? '继续学习' : '关闭'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <MarkdownContent content={exerciseData.content} />
              </div>

              {exerciseData.type === 'single_choice' ? (
                <ChoiceQuestionInline
                  exercise={exerciseData}
                  onSubmit={handleSubmit}
                  onHintUsed={setCurrentHintLevelUsed}
                />
              ) : exerciseData.type === 'code' ? (
                <CodeQuestionInline
                  exercise={exerciseData}
                  onSubmit={handleSubmit}
                  onHintUsed={setCurrentHintLevelUsed}
                />
              ) : (
                <div className="text-center font-bold text-gray-500">暂不支持的题型</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChoiceQuestionInline({ exercise, onSubmit, onHintUsed }: {
  exercise: ExerciseDetailData
  onSubmit: (answer: string) => void
  onHintUsed?: (level: number) => void
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const options = (exercise.metadata as any)?.options || []

  const handleSubmit = () => {
    if (selectedOption) {
      onSubmit(selectedOption)
    }
  }

  return (
    <div className="space-y-3">
      <div className="font-bold text-lg mb-4">请选择正确答案：</div>
      {options.map((option: string, index: number) => {
        const optionLabel = String.fromCharCode(65 + index)
        const isSelected = selectedOption === optionLabel

        return (
          <div
            key={index}
            onClick={() => setSelectedOption(optionLabel)}
            className={`py-3 px-4 border-3 border-black cursor-pointer rounded-lg transition-all font-bold ${
              isSelected
                ? 'bg-yellow-400 shadow-[3px_3px_0_0_rgba(0,0,0,1)] translate-x-[1px] translate-y-[1px]'
                : 'bg-white hover:bg-gray-50 shadow-[2px_2px_0_0_rgba(0,0,0,1)]'
            }`}
          >
            <span className="mr-2">{optionLabel}.</span>
            <span>{option.replace(/^[A-D]\.\s*/, '')}</span>
          </div>
        )
      })}

      <button
        onClick={handleSubmit}
        disabled={!selectedOption}
        className={`w-full py-3 font-bold border-4 border-black rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-lg mt-4 ${
          selectedOption
            ? 'bg-green-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        提交答案
      </button>
    </div>
  )
}

function CodeQuestionInline({ exercise, onSubmit, onHintUsed }: {
  exercise: ExerciseDetailData
  onSubmit: (answer: string) => void
  onHintUsed?: (level: number) => void
}) {
  const [userCode, setUserCode] = useState('')

  useEffect(() => {
    const code = (exercise.metadata as any)?.codeTemplate || ''
    setUserCode(code)
  }, [exercise])

  const handleSubmit = () => {
    onSubmit(userCode)
  }

  return (
    <div className="space-y-3">
      <div className="font-bold text-lg mb-4">请编写代码：</div>
      <div className="border-3 border-black rounded-lg overflow-hidden shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
        <div className="bg-gray-800 px-4 py-2 border-b-2 border-black flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-400 text-sm ml-2 font-mono">Python</span>
        </div>
        <textarea
          value={userCode}
          onChange={e => setUserCode(e.target.value)}
          className="w-full h-[200px] bg-gray-900 text-green-400 p-4 font-mono text-sm focus:outline-none resize-none"
          spellCheck={false}
          placeholder="在此编写代码..."
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!userCode.trim()}
        className={`w-full py-3 font-bold border-4 border-black rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-lg mt-2 ${
          userCode.trim()
            ? 'bg-green-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        运行代码
      </button>
    </div>
  )
}
