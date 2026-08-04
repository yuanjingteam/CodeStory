'use client'
import { useState, useEffect } from 'react'
import { FiX } from 'react-icons/fi'
import { exerciseApi } from '@/app/api/courses/exercise'
import type {
  ChoiceExplanationData,
  ExerciseDetailData,
  ScoreBreakdown,
  SubmitAiReview,
} from '@/types/exercise'
import type {
  GradingReviewLatest,
  GradingReviewSummary,
} from '@/types/grading-review'
import ChoiceQuestion from './ChoiceQuestion'
import CodeQuestion from './CodeQuestion'
import TiptapViewer from '@/components/tiptap/TiptapViewer'
import { getAiErrorMessage } from './chat/chatErrors'
import GradingReviewStatus from './GradingReviewStatus'

interface ExerciseModalProps {
  isOpen: boolean
  exerciseId: string | null
  onClose: () => void
  onComplete: (exerciseId: string) => void
  onCodeChange?: (code: string | null) => void
  recommendationToken?: string | null
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="font-black text-sm mb-1">{title}</div>
      <ul className="space-y-1 text-sm text-gray-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="font-black">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChoiceExplanationPanel({ explanation }: { explanation: ChoiceExplanationData }) {
  return (
    <div className="border-2 border-black bg-white p-4 my-4 text-left">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="font-black">AI 答案解释</h4>
        <span className="text-xs font-bold px-2 py-1 border border-black bg-green-100">
          不参与计分
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-3">{explanation.summary}</p>
      <div className="grid grid-cols-1 gap-2 text-sm mb-3">
        <div className="border border-black bg-green-50 p-2">
          <div className="font-black mb-1">正确选项：{explanation.correctOption}</div>
          <p className="text-gray-700">{explanation.correctExplanation}</p>
        </div>
        <div className="border border-black bg-yellow-50 p-2">
          <div className="font-black mb-1">你的选择：{explanation.selectedOption}</div>
          <p className="text-gray-700">{explanation.selectedExplanation}</p>
        </div>
      </div>
      {explanation.optionExplanations.length > 0 && (
        <div className="mb-3">
          <div className="font-black text-sm mb-2">选项逐项分析</div>
          <div className="space-y-2">
            {explanation.optionExplanations.map(option => (
              <div
                key={option.label}
                className={`border border-black p-2 text-sm ${
                  option.isCorrect ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="font-black mb-1">
                  {option.label}. {option.isCorrect ? '正确' : '不正确'}
                </div>
                <p className="text-gray-700">{option.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="border border-black bg-purple-50 p-2 text-sm font-bold">
        学习建议：{explanation.studyTip}
      </div>
    </div>
  )
}

export default function ExerciseModal({
  isOpen,
  exerciseId,
  onClose,
  onComplete,
  onCodeChange,
  recommendationToken,
}: ExerciseModalProps) {
  const [exerciseData, setExerciseData] = useState<ExerciseDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    correct: boolean;
    score: number;
    feedback: string;
    answer: string;
    scoreBreakdown?: ScoreBreakdown;
    aiReview?: SubmitAiReview;
    gradingReview?: GradingReviewSummary | GradingReviewLatest;
  } | null>(null)
  const [latestGradingReview, setLatestGradingReview] = useState<GradingReviewSummary | GradingReviewLatest | null>(null)
  const [choiceExplanation, setChoiceExplanation] = useState<ChoiceExplanationData | null>(null)
  const [choiceExplanationLoading, setChoiceExplanationLoading] = useState(false)
  const [choiceExplanationError, setChoiceExplanationError] = useState('')
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
        setChoiceExplanation(null)
        setChoiceExplanationError('')
        setLatestGradingReview(null)
        setShowResult(false)
        setHasSubmitted(false)
        onCodeChange?.(null)
        return
      }

      setLoading(true)
      setSubmitResult(null)
      setChoiceExplanation(null)
      setChoiceExplanationError('')
      setShowResult(false)
      setCurrentHintLevelUsed(0)
      setHasSubmitted(false)
      onCodeChange?.(null)
      Promise.all([
        exerciseApi.getDetail(exerciseId),
        exerciseApi.getLatestGradingReview(exerciseId).catch(error => {
          console.error('获取最新评分复核失败:', error)
          return null
        }),
      ])
        .then(([response, gradingReview]) => {
          if (cancelled) return
          setExerciseData(response)
          setLatestGradingReview(gradingReview)
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
  }, [isOpen, exerciseId, onCodeChange])

  const handleSubmit = async (answer: string) => {
    if (!exerciseData?.id) return false

    try {
      const response = await exerciseApi.submit(exerciseData.id, answer, recommendationToken || undefined)
      setSubmitResult({
        correct: response.correct,
        score: response.score,
        feedback: response.feedback,
        answer,
        scoreBreakdown: response.scoreBreakdown,
        aiReview: response.aiReview,
        gradingReview: response.gradingReview,
      })
      if (response.gradingReview) {
        setLatestGradingReview(response.gradingReview)
      }
      setChoiceExplanation(null)
      setChoiceExplanationError('')
      setExerciseData(current => current ? {
        ...current,
        userAnswer: {
          answer,
          submission_count: (current.userAnswer?.submission_count || 0) + 1,
          feedback: response.feedback,
          hint_level_used: Math.max(current.userAnswer?.hint_level_used || 0, currentHintLevelUsed),
          score: Math.max(current.userAnswer?.score || 0, response.score),
        },
      } : current)
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

  const handleAppeal = async (reason: string) => {
    if (!exerciseData?.id) throw new Error('题目信息不可用，请重新打开题目。')

    try {
      await exerciseApi.appealGradingReview(exerciseData.id, reason)
      const gradingReview = await exerciseApi.getLatestGradingReview(exerciseData.id)
      setLatestGradingReview(gradingReview)
      setSubmitResult(current => current ? {
        ...current,
        gradingReview: gradingReview ?? current.gradingReview,
      } : current)
    } catch (error) {
      throw new Error(getAiErrorMessage(error).message)
    }
  }

  const handleExplainChoice = async () => {
    if (!exerciseData?.id || !submitResult?.answer) return

    setChoiceExplanationLoading(true)
    setChoiceExplanationError('')
    try {
      const response = await exerciseApi.explainChoice(exerciseData.id, submitResult.answer)
      setChoiceExplanation(response)
    } catch (error) {
      console.error('解释答案失败:', error)
      setChoiceExplanationError(getAiErrorMessage(error).message)
    } finally {
      setChoiceExplanationLoading(false)
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
            {submitResult.scoreBreakdown && (
              <div className="border-2 border-black bg-white p-4 my-4 text-left">
                <h4 className="font-black mb-3">评分拆解</h4>
                <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                  <div className="bg-gray-100 border border-black p-2">功能分：{submitResult.scoreBreakdown.functionalScore} / 70</div>
                  <div className="bg-gray-100 border border-black p-2">质量分：{submitResult.scoreBreakdown.qualityScore} / 30</div>
                  <div className="bg-gray-100 border border-black p-2">提示扣分：-{submitResult.scoreBreakdown.hintDeduction}</div>
                  <div className="bg-yellow-100 border border-black p-2">最终分：{submitResult.scoreBreakdown.finalScore}</div>
                </div>
              </div>
            )}
            {submitResult.aiReview && (
              <div className="border-2 border-black bg-white p-4 my-4 text-left">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="font-black">AI 评阅</h4>
                  <span className={`text-xs font-bold px-2 py-1 border border-black ${
                    submitResult.aiReview.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {submitResult.aiReview.status === 'completed' ? '已完成' : '已降级'}
                  </span>
                </div>
                {submitResult.aiReview.needsManualReview && (
                  <div className="mb-3 border border-black bg-yellow-100 p-2 text-sm font-bold">
                    AI 对本次评阅置信度较低，建议对照题目要求再检查一次。
                  </div>
                )}
                {submitResult.aiReview.strengths.length > 0 && (
                  <ReviewList title="优点" items={submitResult.aiReview.strengths} />
                )}
                {submitResult.aiReview.issues.length > 0 && (
                  <ReviewList title="问题" items={submitResult.aiReview.issues} />
                )}
                {submitResult.aiReview.suggestions.length > 0 && (
                  <ReviewList title="建议" items={submitResult.aiReview.suggestions} />
                )}
              </div>
            )}
            <GradingReviewStatus
              key={submitResult.gradingReview?.id ?? `submission-${exerciseData.id}`}
              review={submitResult.gradingReview ?? null}
              title="本次评分复核"
              onAppeal={handleAppeal}
            />
            {exerciseData.type === 'single_choice' && (
              <div className="my-4">
                {!choiceExplanation && (
                  <button
                    onClick={() => void handleExplainChoice()}
                    disabled={choiceExplanationLoading}
                    className={`px-6 py-3 bg-purple-500 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all ${
                      choiceExplanationLoading
                        ? 'opacity-70 cursor-not-allowed'
                        : 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                    }`}
                  >
                    {choiceExplanationLoading ? '解释中...' : '解释答案'}
                  </button>
                )}
                {choiceExplanationError && (
                  <div className="mt-3 border-2 border-black bg-red-50 p-3 text-sm font-bold text-red-700">
                    {choiceExplanationError}
                  </div>
                )}
                {choiceExplanation && (
                  <ChoiceExplanationPanel explanation={choiceExplanation} />
                )}
              </div>
            )}
            <div className="flex gap-3 justify-center mt-6">
              {(exerciseData.type === 'code' || !submitResult.correct) && (
                <button
                  onClick={() => { setShowResult(false); setSubmitResult(null) }}
                  className="px-6 py-3 bg-yellow-400 text-black font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  {exerciseData.type === 'code' ? '继续修改' : '重新作答'}
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
            {latestGradingReview && (
              <GradingReviewStatus
                key={latestGradingReview.id}
                review={latestGradingReview}
                title="最近一次评分复核"
                onAppeal={handleAppeal}
              />
            )}
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
                onCodeChange={onCodeChange}
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
