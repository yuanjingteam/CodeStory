'use client'
import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import { exerciseApi } from '@/app/api/courses/exercise'
import type { ExerciseDetailData } from '@/types/exercise'
import ChoiceQuestion from './ChoiceQuestion'
import CodeQuestion from './CodeQuestion'
import TiptapViewer from '@/components/tiptap/TiptapViewer'

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
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    let cancelled = false

    void Promise.resolve().then(() => {
      if (cancelled) return

      if (!isOpen || !exerciseId) {
        setExerciseData(null)
        setSubmitResult(null)
        setShowResult(false)
        setHasSubmitted(false)
        return
      }

      setLoading(true)
      setSubmitResult(null)
      setShowResult(false)
      setCurrentHintLevelUsed(0)
      setHasSubmitted(false)
      exerciseApi.getDetail(exerciseId)
        .then(response => {
          if (cancelled) return
          setExerciseData(response)
          if (response.userAnswer?.hint_level_used !== undefined) {
            setCurrentHintLevelUsed(response.userAnswer.hint_level_used)
          }
        })
        .catch(error => {
          if (cancelled) return
          console.error('获取题目详情失败:', error)
          setExerciseData(null)
        })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
        })
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, exerciseId])

  const handleSubmit = async (answer: string) => {
    if (!exerciseData?.id) return false

    try {
      const response = await exerciseApi.submit(exerciseData.id, answer, currentHintLevelUsed)
      setSubmitResult({
        correct: response.correct,
        score: response.score,
        feedback: response.feedback,
      })
      setShowResult(true)

      if (!hasSubmitted) {
        setHasSubmitted(true)
        onComplete(exerciseData.id)
      }
      return response.correct
    } catch (error) {
      console.error('提交答案失败:', error)
      return false
    }
  }

  if (!isOpen) return null

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-t-1 border-b-2 border-black flex-shrink-0 bg-gray-100 text-black">
        <div className="flex items-center gap-2">
          <span className="text-xl">💡</span>
          <h2 className=" font-bold">练习题</h2>
          {exerciseData && (
            <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
              {exerciseData.type === 'single_choice' ? '选择题' : exerciseData.type === 'code' ? '编程题' : '填空题'}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-white/20 rounded transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

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
                onClick={onClose}
                className="px-6 py-3 bg-green-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                继续学习
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <TiptapViewer content={exerciseData.content} />
            </div>

            {exerciseData.type === 'single_choice' ? (
              <ChoiceQuestion
                key={exerciseData.id}
                exercise={exerciseData}
                onSubmit={handleSubmit}
                onHintUsed={setCurrentHintLevelUsed}
              />
            ) : exerciseData.type === 'code' ? (
              <CodeQuestion
                key={exerciseData.id}
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
  )
}
